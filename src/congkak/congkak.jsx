import React, { useState, useCallback, useRef, useEffect } from 'react';

// ---------- Board model ----------
// Layout (stores on the LEFT, clockwise sowing, each player's row runs left-to-right on screen):
//
//        P2 store                P2 row (as seen on screen, left -> right: B1..B7)
//   [S2] [B1  B2  B3  B4  B5  B6  B7]
//   [S1] [A7  A6  A5  A4  A3  A2  A1]
//        P1 store                P1 row (as seen on screen, left -> right: A7..A1)
//
// Clockwise sowing from any P1 hole moves TOWARDS S1 (i.e. A5 -> A4 -> A3 -> A2 -> A1 -> S1 -> B7 -> B6...).
// We store the array in sowing order (the direction seeds actually travel), so a simple +1 traversal
// with wraparound is always correct:
// idx 0-6   = P1 holes in SOWING order: A1, A2, A3, A4, A5, A6, A7 (A7 sows into S1 next)
// idx 7     = P1 store (S1)
// idx 8-14  = P2 holes in SOWING order: B1, B2, B3, B4, B5, B6, B7 (B7 sows into S2 next)
// idx 15    = P2 store (S2)
//
// So sowing from A5 (array idx 4) goes: idx4(empty) -> idx5(A6) -> idx6(A7) -> idx7(S1) ...
// Wait — that's the WRONG direction (away from store). To make "+1 traversal = towards own store",
// the array must instead list holes in the order seeds pass through, i.e. starting from the hole
// FARTHEST from the store and ending at the hole closest to the store, right before the store index.
// idx 0 = A7 (farthest from S1), idx 6 = A1 (closest to S1, sows into S1 next), idx 7 = S1.
// This matches "picking up from A5 sows A4,A3,A2,A1,S1" because A5 is idx 2, and idx2->3(A4)->4(A3)->5(A2)->6(A1)->7(S1).
//
// P1 holes are indices 0-6 (A7,A6,A5,A4,A3,A2,A1), P1 store is 7.
// P2 holes are indices 8-14 (B7,B6,B5,B4,B3,B2,B1), P2 store is 15.
// Sowing always moves +1 through this array (mod 16), skipping the opponent's store.

const HOLES_PER_SIDE = 7;
const TOTAL_PITS = (HOLES_PER_SIDE + 1) * 2; // 16

const P1_STORE = HOLES_PER_SIDE; // 7
const P2_STORE = TOTAL_PITS - 1; // 15

function isP1Hole(i) { return i >= 0 && i < HOLES_PER_SIDE; }
function isP2Hole(i) { return i > P1_STORE && i < P2_STORE; }
function isStore(i) { return i === P1_STORE || i === P2_STORE; }
function ownerOfHole(i) {
  if (isP1Hole(i)) return 1;
  if (isP2Hole(i)) return 2;
  return 0;
}
// mirror hole across the board (opposite pit) for capture rule.
// idx 0-6 = A7..A1 (A7 at 0, A1 at 6). idx 8-14 = B7..B1 (B7 at 8, B1 at 14).
// Physically, holes mirror end-to-end across the board: A1 (idx 6, closest to P1's store)
// sits opposite B7 (idx 8, farthest from P2's store); A7 (idx 0) sits opposite B1 (idx 14).
// The pairing satisfies idxA + idxB = TOTAL_PITS - 2 (0+14=14, 6+8=14), i.e. a single
// reflection formula that works both directions.
function oppositeHole(i) {
  if (isP1Hole(i) || isP2Hole(i)) return (TOTAL_PITS - 2) - i;
  return -1;
}

function createInitialBoard(seedsPerHole) {
  const board = new Array(TOTAL_PITS).fill(0);
  for (let i = 0; i < TOTAL_PITS; i++) {
    if (!isStore(i)) board[i] = seedsPerHole;
  }
  return board;
}

function nextIndex(i, currentPlayer) {
  let n = (i + 1) % TOTAL_PITS;
  // skip opponent's store
  if (currentPlayer === 1 && n === P2_STORE) n = (n + 1) % TOTAL_PITS;
  if (currentPlayer === 2 && n === P1_STORE) n = (n + 1) % TOTAL_PITS;
  return n;
}

// Simulates a move (including "relay" laps): returns { board, extraTurn, captured, capturedFrom, lastIdx, laps }
function simulateMove(board, startIdx, player) {
  const newBoard = [...board];
  let seeds = newBoard[startIdx];
  if (seeds <= 0) return null;
  newBoard[startIdx] = 0;

  let idx = startIdx;
  let laps = 0;

  // Keep sowing laps: a lap ends when the last seed of that lap lands somewhere.
  // If that landing pit is a store -> stop (extra turn).
  // If that landing pit was empty before the seed landed (i.e. ==1 after) -> stop (capture check).
  // Otherwise (landing pit had seeds already, now >1) -> pick up ALL seeds there and keep sowing (relay).
  for (;;) {
    laps++;
    while (seeds > 0) {
      idx = nextIndex(idx, player);
      newBoard[idx]++;
      seeds--;
    }
    if (isStore(idx)) break; // lands in a store, stop here
    if (newBoard[idx] === 1) break; // landed in a hole that was empty, stop here
    // relay: pick up all seeds from this now-non-empty hole and keep going
    seeds = newBoard[idx];
    newBoard[idx] = 0;
  }

  const lastIdx = idx;
  let extraTurn = false;
  let captured = 0;
  let capturedFrom = -1;

  if (player === 1 && lastIdx === P1_STORE) extraTurn = true;
  if (player === 2 && lastIdx === P2_STORE) extraTurn = true;

  // capture rule: final lap's last seed lands in an EMPTY hole on own side (was empty before landing, i.e. ==1 now)
  if (!isStore(lastIdx) && ownerOfHole(lastIdx) === player && newBoard[lastIdx] === 1) {
    const oppIdx = oppositeHole(lastIdx);
    if (oppIdx >= 0 && newBoard[oppIdx] > 0) {
      captured = newBoard[oppIdx];
      capturedFrom = oppIdx;
      newBoard[oppIdx] = 0;
      const store = player === 1 ? P1_STORE : P2_STORE;
      newBoard[store] += captured;
      // Note: per house rule chosen, only the OPPOSITE hole's seeds are captured;
      // the landing seed itself stays put (does not get swept into the store).
    }
  }

  return { board: newBoard, extraTurn, captured, capturedFrom, lastIdx, laps };
}

function getValidMoves(board, player) {
  const range = player === 1
    ? Array.from({ length: HOLES_PER_SIDE }, (_, k) => k)
    : Array.from({ length: HOLES_PER_SIDE }, (_, k) => P1_STORE + 1 + k);
  return range.filter(i => board[i] > 0);
}

function sideTotal(board, player) {
  const range = player === 1
    ? Array.from({ length: HOLES_PER_SIDE }, (_, k) => k)
    : Array.from({ length: HOLES_PER_SIDE }, (_, k) => P1_STORE + 1 + k);
  return range.reduce((s, i) => s + board[i], 0);
}

function isGameOver(board) {
  return sideTotal(board, 1) === 0 && sideTotal(board, 2) === 0;
}

function finalizeBoard(board) {
  // sweep remaining seeds into respective stores
  const b = [...board];
  for (let i = 0; i < HOLES_PER_SIDE; i++) {
    b[P1_STORE] += b[i];
    b[i] = 0;
  }
  for (let k = 0; k < HOLES_PER_SIDE; k++) {
    const i = P1_STORE + 1 + k;
    b[P2_STORE] += b[i];
    b[i] = 0;
  }
  return b;
}

// ---------- AI ----------
function chooseAIMove(board, player, difficulty) {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // score each move
  const scored = moves.map(m => {
    const result = simulateMove(board, m, player);
    let score = 0;
    if (result.extraTurn) score += 10;
    score += result.captured * 2;
    // avoid leaving own holes with 1 seed (vulnerable) - light heuristic for hard mode
    if (difficulty === 'hard') {
      const myHoles = player === 1
        ? Array.from({ length: HOLES_PER_SIDE }, (_, k) => k)
        : Array.from({ length: HOLES_PER_SIDE }, (_, k) => P1_STORE + 1 + k);
      const vulnerable = myHoles.filter(i => result.board[i] === 1).length;
      score -= vulnerable * 0.5;
      // prefer moves that build up seeds near own store slightly
      score += (result.board[player === 1 ? P1_STORE : P2_STORE] - board[player === 1 ? P1_STORE : P2_STORE]) * 0.1;
    }
    return { move: m, score };
  });

  scored.sort((a, b) => b.score - a.score);

  if (difficulty === 'medium') {
    // pick from top half with some randomness
    const topCount = Math.max(1, Math.ceil(scored.length / 2));
    const pick = Math.floor(Math.random() * topCount);
    return scored[pick].move;
  }
  // hard: best move
  return scored[0].move;
}

// ---------- Best-sequence solver ----------
// Finds the sequence of moves for `player` that maximises their own store total
// before their turn ends (i.e. chains through all "extra turn" moves optimally).
// Uses memoised DP over board states. Capped to avoid hanging the browser on
// large seed counts / huge state spaces.
function boardKey(board) { return board.join(','); }

function solveBestSequence(board, player, maxStates = 400000) {
  const memo = new Map();
  let statesExplored = 0;
  let capped = false;

  function solve(b) {
    if (capped) return { score: b[player === 1 ? P1_STORE : P2_STORE], path: [] };
    const key = boardKey(b);
    if (memo.has(key)) return memo.get(key);

    statesExplored++;
    if (statesExplored > maxStates) {
      capped = true;
      return { score: b[player === 1 ? P1_STORE : P2_STORE], path: [] };
    }

    const store = player === 1 ? P1_STORE : P2_STORE;
    const moves = getValidMoves(b, player);
    if (moves.length === 0) {
      const result = { score: b[store], path: [] };
      memo.set(key, result);
      return result;
    }

    let bestScore = -1;
    let bestPath = null;

    for (const m of moves) {
      const r = simulateMove(b, m, player);
      const label = holeLabel(m) + (r.captured > 0 ? ` (captures ${r.captured} from ${holeLabel(r.capturedFrom)})` : '');
      if (r.extraTurn) {
        const sub = solve(r.board);
        if (sub.score > bestScore) {
          bestScore = sub.score;
          bestPath = [label + ' → extra turn', ...sub.path];
        }
      } else {
        if (r.board[store] > bestScore) {
          bestScore = r.board[store];
          bestPath = [label];
        }
      }
    }

    const result = { score: bestScore, path: bestPath };
    memo.set(key, result);
    return result;
  }

  const result = solve(board);
  return { ...result, capped, statesExplored };
}

// ---------- UI helpers ----------
// idx 0-6 = A7..A1 (A_n where n = HOLES_PER_SIDE - i), idx 8-14 = B7..B1 (B_n where n = HOLES_PER_SIDE - (i-8))
const holeLabel = (i) => {
  if (isP1Hole(i)) return `A${HOLES_PER_SIDE - i}`;
  if (isP2Hole(i)) return `B${HOLES_PER_SIDE - (i - (P1_STORE + 1))}`;
  return '';
};

function Seed({ delay, color }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{
        backgroundColor: color,
        animation: `seedPop 0.3s ease-out ${delay}ms both`,
      }}
    />
  );
}

const MAX_VISIBLE_DOTS = 12;

function Pit({ index, count, isActive, isLast, isCaptured, isSelectable, onClick, owner, small, theme }) {
  const isOverflow = count > MAX_VISIBLE_DOTS;
  const seedDots = Array.from({ length: Math.min(count, MAX_VISIBLE_DOTS) });
  return (
    <button
      onClick={onClick}
      disabled={!isSelectable}
      aria-label={`${holeLabel(index)}, ${count} seeds`}
      className={`relative flex flex-col items-center justify-center rounded-full transition-all aspect-square
        ${small ? 'flex-1 min-w-0 max-w-10 sm:max-w-12 md:max-w-14' : 'w-14 h-14 md:w-20 md:h-20'}
        ${isSelectable ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default'}
      `}
      style={{
        backgroundColor: isLast ? theme.pitBgLast : isActive ? theme.pitBgActive : theme.pitBg,
        border: isOverflow ? `3px solid ${theme.warn}` : `2px solid ${isCaptured ? theme.warn : isSelectable ? theme.accent : theme.borderLight}`,
        boxShadow: isSelectable
          ? `0 0 0 2px ${darken(theme.accent)}`
          : isOverflow
          ? `0 0 0 3px ${darken(theme.warn)}`
          : 'none',
      }}
    >
      {isOverflow && (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
          style={{
            width: 16,
            height: 16,
            backgroundColor: theme.warn,
            color: theme.bg,
          }}
          title={`${count} seeds — more than can be shown individually`}
        >
          +
        </span>
      )}
      <div className="flex flex-wrap items-center justify-center gap-0.5 px-1 max-w-full">
        {count > 0 ? seedDots.map((_, k) => <Seed key={k} delay={k * 15} color={theme.seed} />) : (
          <span className="text-xs" style={{ color: theme.textMuted }}>·</span>
        )}
      </div>
      <span
        className="absolute -bottom-6 sm:-bottom-7 text-[11px] sm:text-xs font-mono font-semibold"
        style={{ color: isOverflow ? theme.warn : theme.textSecondary }}
      >
        {count}
      </span>
      <span className="absolute -top-6 sm:-top-7 text-[10px] font-mono" style={{ color: theme.textMuted }}>
        {holeLabel(index)}
      </span>
    </button>
  );
}

// simple helper to build a translucent ring colour from a hex accent
function darken(hex) {
  // returns a low-opacity rgba ring based on the accent colour
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},0.18)`;
}

function StorePit({ count, side, label, theme }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl px-1.5 py-3 sm:px-4 sm:py-6 md:px-6 md:py-10 min-w-[34px] sm:min-w-[56px] shrink-0"
      style={{
        backgroundColor: theme.surface,
        border: `2px solid ${theme.border}`,
      }}
    >
      <span className="text-[9px] sm:text-[10px] uppercase tracking-wide mb-1 text-center" style={{ color: theme.textMuted }}>{label}</span>
      <span className="text-lg sm:text-2xl md:text-3xl font-mono font-semibold" style={{ color: theme.textPrimary }}>{count}</span>
    </div>
  );
}

// ---------- Themes ----------
const THEMES = {
  dark: {
    bg: '#0f0f1a',
    surface: '#1e1e32',
    surfaceAlt: '#252540',
    surfaceRaised: '#3b3b5c',
    border: 'rgba(255,255,255,0.08)',
    borderLight: 'rgba(255,255,255,0.1)',
    textPrimary: '#e8e8f0',
    textSecondary: '#a0a0b8',
    textMuted: '#6b6b80',
    accent: '#6366f1',
    accentText: '#fff',
    warn: '#e0a85c',
    warnBg: '#3d3320',
    seed: '#c9a86a',
    pitBg: '#252540',
    pitBgActive: '#2a2440',
    pitBgLast: '#3d3320',
  },
  light: {
    bg: '#f4f3f7',
    surface: '#ffffff',
    surfaceAlt: '#eeecf5',
    surfaceRaised: '#e0defa',
    border: 'rgba(30,20,60,0.08)',
    borderLight: 'rgba(30,20,60,0.12)',
    textPrimary: '#211f36',
    textSecondary: '#57536e',
    textMuted: '#8783a0',
    accent: '#5548d9',
    accentText: '#fff',
    warn: '#a8631f',
    warnBg: '#fbe8cf',
    seed: '#9c7a30',
    pitBg: '#eeecf5',
    pitBgActive: '#ded9f7',
    pitBgLast: '#fbe8cf',
  },
};

export default function CongkakGame() {
  const [darkMode, setDarkMode] = useState(true);
  const theme = darkMode ? THEMES.dark : THEMES.light;

  // shared pill style for the ⌂ Home link and ☀/☾ toggle, matching the other apps on the site
  const headerBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '5px 12px', borderRadius: 8,
    border: `1px solid ${theme.border}`, background: theme.surface,
    color: theme.textMuted, fontSize: 12, fontFamily: 'inherit',
    textDecoration: 'none', cursor: 'pointer',
  };

  const [phase, setPhase] = useState('setup'); // setup, playing, gameover
  const [seedsPerHole, setSeedsPerHole] = useState('7');
  const [mode, setMode] = useState('2p'); // 2p, cpu
  const [difficulty, setDifficulty] = useState('medium');
  const [humanPlayer, setHumanPlayer] = useState(1);

  const [board, setBoard] = useState(() => createInitialBoard(7));
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [lastMove, setLastMove] = useState(null); // { lastIdx, capturedFrom }
  const [message, setMessage] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [scores, setScores] = useState({ p1: 0, p2: 0 });
  const [history, setHistory] = useState([]); // stack of { board, currentPlayer, lastMove, scores, phase, logEntry }
  const [moveLog, setMoveLog] = useState([]); // visible log entries, most recent last
  const [bestSequence, setBestSequence] = useState(null); // { score, path, capped, forPlayer }
  const [solving, setSolving] = useState(false);
  const cpuTimeoutRef = useRef(null);

  useEffect(() => {
    return () => { if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current); };
  }, []);

  const startGame = () => {
    const n = Math.max(1, Math.min(8, parseInt(seedsPerHole, 10) || 7));
    setBoard(createInitialBoard(n));
    setCurrentPlayer(1);
    setLastMove(null);
    setMessage(mode === 'cpu' ? (humanPlayer === 1 ? 'Your turn — pick a hole.' : "Computer's turn...") : 'Player 1\'s turn.');
    setScores({ p1: 0, p2: 0 });
    setHistory([]);
    setMoveLog([]);
    setBestSequence(null);
    setPhase('playing');
  };

  const findBestSequence = useCallback(() => {
    setSolving(true);
    setBestSequence(null);
    // defer to next tick so the loading state renders before the (potentially slow) search runs
    setTimeout(() => {
      const result = solveBestSequence(board, currentPlayer);
      setBestSequence({ ...result, forPlayer: currentPlayer });
      setSolving(false);
    }, 30);
  }, [board, currentPlayer]);

  const applyMove = useCallback((startIdx) => {
    setIsAnimating(true);
    const result = simulateMove(board, startIdx, currentPlayer);
    if (!result) { setIsAnimating(false); return; }

    // snapshot the state BEFORE this move, for undo
    const snapshot = {
      board: [...board],
      currentPlayer,
      lastMove,
      scores: { ...scores },
      phase,
      message,
    };

    const startLabel = holeLabel(startIdx);
    let logEntry = `Player ${currentPlayer}: ${startLabel}`;

    let newBoard = result.board;
    let nextPlayer = currentPlayer;
    let msg = '';

    if (isGameOver(newBoard)) {
      newBoard = finalizeBoard(newBoard);
      if (result.captured > 0) logEntry += ` → captured ${result.captured} from ${holeLabel(result.capturedFrom)}`;
      logEntry += ' (game ends)';
      setHistory(h => [...h, snapshot]);
      setMoveLog(l => [...l, logEntry]);
      setBoard(newBoard);
      setLastMove({ lastIdx: result.lastIdx, capturedFrom: result.capturedFrom });
      setBestSequence(null);
      const p1 = newBoard[P1_STORE];
      const p2 = newBoard[P2_STORE];
      setScores({ p1, p2 });
      setMessage(p1 === p2 ? "Game over — it's a tie!" : `Game over — Player ${p1 > p2 ? 1 : 2} wins, ${Math.max(p1, p2)} to ${Math.min(p1, p2)}!`);
      setPhase('gameover');
      setIsAnimating(false);
      return;
    }

    if (result.captured > 0) {
      msg = `Player ${currentPlayer} captured ${result.captured} seed${result.captured > 1 ? 's' : ''}! `;
      logEntry += ` → captured ${result.captured} from ${holeLabel(result.capturedFrom)}`;
    }
    if (result.extraTurn) {
      msg += `Player ${currentPlayer} lands in their store — extra turn!`;
      logEntry += ' → lands in store (extra turn)';
    } else {
      nextPlayer = currentPlayer === 1 ? 2 : 1;
    }

    setHistory(h => [...h, snapshot]);
    setMoveLog(l => [...l, logEntry]);
    setBoard(newBoard);
    setLastMove({ lastIdx: result.lastIdx, capturedFrom: result.capturedFrom });
    setBestSequence(null);

    // if the next player has no seeds on their side, skip their turn
    let skipped = false;
    if (sideTotal(newBoard, nextPlayer) === 0) {
      skipped = true;
      nextPlayer = nextPlayer === 1 ? 2 : 1;
    }
    setCurrentPlayer(nextPlayer);

    if (!msg) {
      msg = mode === 'cpu' && nextPlayer !== humanPlayer
        ? "Computer's turn..."
        : `Player ${nextPlayer}'s turn.`;
    } else if (mode === 'cpu' && nextPlayer !== humanPlayer) {
      msg += " Computer's turn...";
    }
    if (skipped) {
      msg += ` Player ${nextPlayer === 1 ? 2 : 1} has no seeds — turn skipped.`;
    }
    setMessage(msg);
    setIsAnimating(false);
  }, [board, currentPlayer, mode, humanPlayer, lastMove, scores, phase, message]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setMoveLog(l => l.slice(0, -1));
    setBoard(prev.board);
    setCurrentPlayer(prev.currentPlayer);
    setLastMove(prev.lastMove);
    setScores(prev.scores);
    setPhase(prev.phase === 'gameover' ? 'playing' : prev.phase);
    setMessage(prev.message);
    setBestSequence(null);
  }, [history]);

  // CPU auto-play
  useEffect(() => {
    if (phase !== 'playing' || mode !== 'cpu') return;
    if (currentPlayer === humanPlayer) return;
    if (isAnimating) return;

    cpuTimeoutRef.current = setTimeout(() => {
      const move = chooseAIMove(board, currentPlayer, difficulty);
      if (move !== null) applyMove(move);
    }, 700);

    return () => { if (cpuTimeoutRef.current) clearTimeout(cpuTimeoutRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mode, currentPlayer, humanPlayer, board, isAnimating, difficulty]);

  const validMoves = phase === 'playing' ? getValidMoves(board, currentPlayer) : [];
  const canHumanClick = phase === 'playing' && !isAnimating && (mode === '2p' || currentPlayer === humanPlayer);

  const resetToSetup = () => {
    setPhase('setup');
  };

  // ---------- Setup screen ----------
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: theme.bg }}>
        <div className="w-full max-w-md rounded-2xl p-6 md:p-8" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-2xl font-bold" style={{ color: theme.textPrimary }}>Congkak</h1>
            <div className="flex gap-2">
              <a href="../../" style={headerBtnStyle}>⌂ Home</a>
              <button
                onClick={() => setDarkMode(d => !d)}
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                style={headerBtnStyle}
              >
                {darkMode ? '☀ Light' : '☾ Dark'}
              </button>
            </div>
          </div>
          <p className="text-sm mb-6" style={{ color: theme.textSecondary }}>7 holes per side · clockwise sowing · stores on the left</p>

          <div className="mb-5">
            <label htmlFor="seeds" className="block text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>Seeds per hole</label>
            <input
              id="seeds"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={seedsPerHole}
              onChange={e => {
                const v = e.target.value;
                if (v === '' || /^\d*$/.test(v)) setSeedsPerHole(v);
              }}
              onBlur={() => {
                const n = parseInt(seedsPerHole, 10);
                if (!n || n < 1) setSeedsPerHole('7');
                else if (n > 8) setSeedsPerHole('8');
              }}
              className="w-full rounded-lg px-4 h-11 font-mono text-lg focus:outline-none focus:ring-2"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }}
            />
            <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Traditional congkak uses 7. Choose 1–8.</p>
          </div>

          <div className="mb-5">
            <span className="block text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>Game mode</span>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: '2p', label: '2 Player' }, { v: 'cpu', label: 'vs Computer' }].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setMode(opt.v)}
                  className="h-11 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: mode === opt.v ? theme.accent : theme.surfaceAlt,
                    color: mode === opt.v ? theme.accentText : theme.textSecondary,
                    border: `1px solid ${theme.borderLight}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {mode === 'cpu' && (
            <>
              <div className="mb-5">
                <span className="block text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>Difficulty</span>
                <div className="grid grid-cols-3 gap-2">
                  {[{ v: 'easy', label: 'Easy' }, { v: 'medium', label: 'Medium' }, { v: 'hard', label: 'Hard' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setDifficulty(opt.v)}
                      className="h-11 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: difficulty === opt.v ? theme.accent : theme.surfaceAlt,
                        color: difficulty === opt.v ? theme.accentText : theme.textSecondary,
                        border: `1px solid ${theme.borderLight}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <span className="block text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>You play as</span>
                <div className="grid grid-cols-2 gap-2">
                  {[{ v: 1, label: 'Player 1' }, { v: 2, label: 'Player 2' }].map(opt => (
                    <button
                      key={opt.v}
                      onClick={() => setHumanPlayer(opt.v)}
                      className="h-11 rounded-lg font-medium text-sm transition-colors focus:outline-none focus:ring-2"
                      style={{
                        backgroundColor: humanPlayer === opt.v ? theme.accent : theme.surfaceAlt,
                        color: humanPlayer === opt.v ? theme.accentText : theme.textSecondary,
                        border: `1px solid ${theme.borderLight}`,
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            onClick={startGame}
            className="w-full h-12 rounded-lg font-semibold transition-transform active:scale-95 focus:outline-none focus:ring-2"
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            Start Game
          </button>
        </div>
        <style>{`
          @keyframes seedPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        `}</style>
      </div>
    );
  }

  // ---------- Game board ----------
  // Array order is idx0=A7...idx6=A1 (sowing order). On screen, P1's store is on the LEFT,
  // so display order left-to-right should be A1, A2, ... A7 (A1 nearest the store) — i.e. reversed array order.
  const p1Indices = Array.from({ length: HOLES_PER_SIDE }, (_, k) => HOLES_PER_SIDE - 1 - k); // [6,5,4,3,2,1,0] = A1..A7
  // P2's store is on the RIGHT, so display order left-to-right should be B7...B1 (B1 nearest P2's store) — natural array order.
  const p2Indices = Array.from({ length: HOLES_PER_SIDE }, (_, k) => P1_STORE + 1 + k); // idx order = B7..B1 left to right

  return (
    <div className="min-h-screen px-1.5 py-3 sm:p-4 md:p-8 overflow-x-hidden" style={{ backgroundColor: theme.bg }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl md:text-2xl font-bold" style={{ color: theme.textPrimary }}>Congkak</h1>
          <div className="flex items-center gap-2">
            <a href="../../" style={headerBtnStyle}>⌂ Home</a>
            <button
              onClick={() => setDarkMode(d => !d)}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              style={headerBtnStyle}
            >
              {darkMode ? '☀ Light' : '☾ Dark'}
            </button>
            <button
              onClick={undo}
              disabled={history.length === 0 || isAnimating}
              className="h-10 px-4 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary, border: `1px solid ${theme.borderLight}` }}
            >
              Undo
            </button>
            <button
              onClick={resetToSetup}
              className="h-10 px-4 rounded-lg text-sm font-medium focus:outline-none focus:ring-2"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.textSecondary, border: `1px solid ${theme.borderLight}` }}
            >
              New game
            </button>
          </div>
        </div>

        <div
          className="rounded-xl p-3 mb-6 text-sm font-medium text-center"
          style={{
            backgroundColor: phase === 'gameover' ? theme.warnBg : theme.surface,
            color: phase === 'gameover' ? theme.warn : theme.textPrimary,
            border: `1px solid ${theme.border}`,
          }}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>

        {phase === 'playing' && (
          <div className="mb-6">
            <button
              onClick={findBestSequence}
              disabled={solving || isAnimating || validMoves.length === 0}
              className="h-11 px-5 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95"
              style={{ backgroundColor: theme.surfaceRaised, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }}
            >
              {solving ? 'Calculating…' : `Show best sequence for Player ${currentPlayer}`}
            </button>

            {solving && (
              <p className="text-xs mt-2" style={{ color: theme.textMuted }}>Searching all move chains — this can take a moment on complex boards.</p>
            )}

            {bestSequence && !solving && (
              <div className="mt-3 rounded-xl p-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
                <p className="text-sm font-semibold mb-1" style={{ color: theme.textPrimary }}>
                  Best sequence for Player {bestSequence.forPlayer}: ends with {bestSequence.score} seed{bestSequence.score === 1 ? '' : 's'} in their store
                </p>
                {bestSequence.capped && (
                  <p className="text-xs mb-2" style={{ color: theme.warn }}>
                    Search space was very large and got capped — this sequence is a strong result but may not be provably optimal.
                  </p>
                )}
                <ol className="text-sm font-mono space-y-1 max-h-56 overflow-y-auto" style={{ color: theme.textSecondary }}>
                  {bestSequence.path.map((step, k) => (
                    <li key={k}>{k + 1}. {step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Board */}
        <div className="flex items-stretch gap-1 sm:gap-3 md:gap-5">
          <StorePit count={board[P1_STORE]} side="left" label="Store 1" theme={theme} />

          <div className="flex-1 flex flex-col gap-10 sm:gap-9 md:gap-10 py-5 sm:py-4 min-w-0">
            {/* P2 row - reversed visually (rightmost B is closest to store, but store is on the LEFT for P2 conceptually;
                 since both stores render on the outer left/right of the whole board, we show P2 row top,
                 with B1..B7 left to right matching physical adjacency to their own store on the far right) */}
            <div className="flex justify-between gap-0.5 sm:gap-1.5 md:gap-2 px-1 sm:px-2">
              {p2Indices.map(i => (
                <Pit
                  key={i}
                  index={i}
                  count={board[i]}
                  isActive={currentPlayer === 2}
                  isLast={lastMove && lastMove.lastIdx === i}
                  isCaptured={lastMove && lastMove.capturedFrom === i}
                  isSelectable={canHumanClick && currentPlayer === 2 && validMoves.includes(i)}
                  onClick={() => applyMove(i)}
                  small
                  theme={theme}
                />
              ))}
            </div>

            <div className="flex justify-between gap-0.5 sm:gap-1.5 md:gap-2 px-1 sm:px-2">
              {p1Indices.map(i => (
                <Pit
                  key={i}
                  index={i}
                  count={board[i]}
                  isActive={currentPlayer === 1}
                  isLast={lastMove && lastMove.lastIdx === i}
                  isCaptured={lastMove && lastMove.capturedFrom === i}
                  isSelectable={canHumanClick && currentPlayer === 1 && validMoves.includes(i)}
                  onClick={() => applyMove(i)}
                  small
                  theme={theme}
                />
              ))}
            </div>
          </div>

          <StorePit count={board[P2_STORE]} side="right" label="Store 2" theme={theme} />
        </div>

        <div className="mt-10 flex justify-center gap-6 text-xs" style={{ color: theme.textMuted }}>
          <span>Player 2 (top row, store on the right)</span>
        </div>
        <div className="flex justify-center gap-6 text-xs mb-4" style={{ color: theme.textMuted }}>
          <span>Player 1 (bottom row, store on the left)</span>
        </div>

        <div className="mt-6 rounded-xl p-4" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
          <h2 className="text-sm font-semibold mb-2" style={{ color: theme.textPrimary }}>Move log</h2>
          {moveLog.length === 0 ? (
            <p className="text-sm" style={{ color: theme.textMuted }}>No moves yet.</p>
          ) : (
            <ol className="text-sm font-mono space-y-1 max-h-48 overflow-y-auto" style={{ color: theme.textSecondary }}>
              {moveLog.map((entry, k) => (
                <li key={k}>{k + 1}. {entry}</li>
              ))}
            </ol>
          )}
        </div>

        {phase === 'gameover' && (
          <div className="mt-6 rounded-xl p-5 text-center" style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}` }}>
            <p className="text-lg font-semibold mb-1" style={{ color: theme.textPrimary }}>Final score</p>
            <p className="text-2xl font-mono font-bold mb-4" style={{ color: theme.accent }}>{scores.p1} – {scores.p2}</p>
            <button
              onClick={resetToSetup}
              className="h-11 px-6 rounded-lg font-semibold focus:outline-none focus:ring-2"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              Play again
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes seedPop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      `}</style>
    </div>
  );
}
