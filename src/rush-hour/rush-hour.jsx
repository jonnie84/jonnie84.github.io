import { useState, useEffect, useRef } from "react";

// ─── BFS Solver ──────────────────────────────────────────────────────────────

function getOccupied(pieces, excludeId) {
  const occ = new Set();
  pieces.filter(p => p.id !== excludeId).forEach(p => {
    for (let i = 0; i < p.len; i++) {
      if (p.orient === "H") occ.add(`${p.row},${p.col + i}`);
      else occ.add(`${p.row + i},${p.col}`);
    }
  });
  return occ;
}

function getMovesForPiece(pieces, piece) {
  const { id, row, col, len, orient } = piece;
  const occ = getOccupied(pieces, id);
  const results = [];
  if (orient === "H") {
    for (let d = 1; col - d >= 0; d++) {
      if (occ.has(`${row},${col - d}`)) break;
      results.push({ id, row, col: col - d, len, orient });
    }
    for (let d = 1; col + len - 1 + d <= 5; d++) {
      if (occ.has(`${row},${col + len - 1 + d}`)) break;
      results.push({ id, row, col: col + d, len, orient });
    }
  } else {
    for (let d = 1; row - d >= 0; d++) {
      if (occ.has(`${row - d},${col}`)) break;
      results.push({ id, row: row - d, col, len, orient });
    }
    for (let d = 1; row + len - 1 + d <= 5; d++) {
      if (occ.has(`${row + len - 1 + d},${col}`)) break;
      results.push({ id, row: row + d, col, len, orient });
    }
  }
  return results;
}

function encodeState(pieces) {
  return pieces.map(p => `${p.id}:${p.row},${p.col}`).join("|");
}

function isGoal(pieces) {
  const red = pieces.find(p => p.id === "red");
  return red && red.row === 2 && red.col + red.len === 6;
}

function bfsSolve(initialPieces) {
  const queue = [{ pieces: initialPieces, moves: [] }];
  const visited = new Set([encodeState(initialPieces)]);
  let itr = 0;
  while (queue.length && itr < 500000) {
    itr++;
    const { pieces, moves } = queue.shift();
    if (isGoal(pieces)) return moves;
    for (const piece of pieces) {
      for (const newPos of getMovesForPiece(pieces, piece)) {
        const np = pieces.map(p => p.id === piece.id ? newPos : p);
        const s = encodeState(np);
        if (!visited.has(s)) {
          visited.add(s);
          queue.push({ pieces: np, moves: [...moves, { id: piece.id, newPos }] });
        }
      }
    }
  }
  return null;
}

// ─── Puzzle Library ───────────────────────────────────────────────────────────

const BUILT_IN_PUZZLES = [
  { id: 1, difficulty: "easy", par: 3, name: "Warm Up", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"}]},
  { id: 2, difficulty: "easy", par: 4, name: "One Two", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"}]},
  { id: 3, difficulty: "easy", par: 4, name: "Fork", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"},{id:"e",row:0,col:4,len:2,orient:"H"},
    {id:"f",row:5,col:4,len:2,orient:"H"}]},
  { id: 4, difficulty: "easy", par: 5, name: "Bottleneck", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"},{id:"e",row:0,col:4,len:2,orient:"H"},
    {id:"f",row:4,col:4,len:2,orient:"V"}]},
  { id: 5, difficulty: "easy", par: 6, name: "Double Lock", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"},{id:"e",row:1,col:4,len:2,orient:"H"},
    {id:"f",row:4,col:4,len:2,orient:"H"}]},
  { id: 6, difficulty: "easy", par: 6, name: "Rush", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:0,col:0,len:2,orient:"V"},
    {id:"b",row:0,col:2,len:2,orient:"H"},{id:"c",row:0,col:4,len:3,orient:"V"},
    {id:"d",row:1,col:2,len:2,orient:"V"},{id:"e",row:2,col:3,len:2,orient:"V"},
    {id:"f",row:3,col:0,len:3,orient:"H"},{id:"g",row:4,col:0,len:2,orient:"H"},
    {id:"h",row:4,col:3,len:2,orient:"H"},{id:"i",row:5,col:2,len:2,orient:"H"},
    {id:"j",row:3,col:5,len:3,orient:"V"}]},
  { id: 7, difficulty: "easy", par: 8, name: "The Squeeze", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:1,col:2,len:3,orient:"V"},
    {id:"b",row:2,col:4,len:2,orient:"V"},{id:"c",row:0,col:1,len:2,orient:"H"},
    {id:"d",row:4,col:1,len:2,orient:"H"},{id:"e",row:1,col:4,len:2,orient:"H"},
    {id:"f",row:4,col:3,len:2,orient:"H"},{id:"g",row:5,col:0,len:3,orient:"H"},
    {id:"h",row:0,col:4,len:2,orient:"H"}]},
  { id: 8, difficulty: "medium", par: 9, name: "Crossfire", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"},{id:"e",row:1,col:4,len:2,orient:"H"},
    {id:"f",row:4,col:4,len:2,orient:"H"},{id:"g",row:3,col:0,len:2,orient:"H"},
    {id:"h",row:0,col:1,len:2,orient:"V"}]},
  { id: 9, difficulty: "medium", par: 10, name: "Deadlock", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:1,col:2,len:2,orient:"H"},{id:"c",row:4,col:2,len:2,orient:"H"},
    {id:"d",row:2,col:4,len:2,orient:"V"},{id:"e",row:1,col:4,len:2,orient:"H"},
    {id:"f",row:4,col:4,len:2,orient:"H"},{id:"g",row:0,col:0,len:2,orient:"V"},
    {id:"h",row:3,col:0,len:2,orient:"H"},{id:"i",row:5,col:1,len:2,orient:"H"}]},
  { id: 10, difficulty: "medium", par: 10, name: "Master", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:2,col:2,len:2,orient:"V"},
    {id:"b",row:2,col:4,len:2,orient:"V"},{id:"c",row:0,col:2,len:2,orient:"H"},
    {id:"d",row:1,col:3,len:2,orient:"H"},{id:"e",row:4,col:1,len:2,orient:"H"},
    {id:"f",row:4,col:3,len:2,orient:"H"},{id:"g",row:0,col:0,len:2,orient:"V"},
    {id:"h",row:0,col:4,len:2,orient:"H"},{id:"i",row:5,col:0,len:3,orient:"H"},
    {id:"j",row:3,col:5,len:3,orient:"V"},{id:"k",row:3,col:0,len:2,orient:"H"},
    {id:"l",row:1,col:5,len:2,orient:"V"}]},
  { id: 11, difficulty: "medium", par: 12, name: "Chain Reaction", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"a",row:1,col:2,len:2,orient:"V"},
    {id:"b",row:3,col:4,len:2,orient:"V"},{id:"c",row:0,col:1,len:2,orient:"H"},
    {id:"d",row:1,col:3,len:2,orient:"H"},{id:"e",row:4,col:0,len:2,orient:"H"},
    {id:"f",row:4,col:2,len:2,orient:"H"},{id:"g",row:0,col:0,len:2,orient:"V"},
    {id:"h",row:0,col:3,len:2,orient:"H"},{id:"i",row:5,col:1,len:3,orient:"H"},
    {id:"j",row:3,col:5,len:3,orient:"V"},{id:"k",row:3,col:1,len:2,orient:"H"},
    {id:"l",row:1,col:5,len:2,orient:"V"}]},
  { id: 12, difficulty: "medium", par: 15, name: "Gridlock I", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"pink_t",row:3,col:0,len:3,orient:"V"},
    {id:"teal",row:0,col:0,len:2,orient:"H"},{id:"pink_c",row:1,col:3,len:2,orient:"V"},
    {id:"dkred",row:1,col:4,len:2,orient:"V"},{id:"gray",row:3,col:1,len:2,orient:"V"},
    {id:"grn_t",row:1,col:5,len:3,orient:"V"},{id:"blue_t",row:3,col:2,len:3,orient:"H"},
    {id:"grn_c",row:4,col:3,len:2,orient:"V"},{id:"purp",row:1,col:2,len:2,orient:"V"},
    {id:"blue_c",row:4,col:4,len:2,orient:"H"},{id:"blue_c2",row:5,col:1,len:2,orient:"H"},
    {id:"ltgrn",row:5,col:4,len:2,orient:"H"}]},
  { id: 13, difficulty: "medium", par: 16, name: "Gridlock II", custom: false, pieces: [
    {id:"red",row:2,col:0,len:2,orient:"H"},{id:"pink_t",row:3,col:0,len:3,orient:"V"},
    {id:"teal",row:0,col:0,len:2,orient:"H"},{id:"pink_c",row:1,col:3,len:2,orient:"V"},
    {id:"dkred",row:1,col:4,len:2,orient:"V"},{id:"gray",row:3,col:1,len:2,orient:"V"},
    {id:"grn_t",row:1,col:5,len:3,orient:"V"},{id:"blue_t",row:3,col:2,len:3,orient:"H"},
    {id:"grn_c",row:4,col:3,len:2,orient:"V"},{id:"purp",row:0,col:2,len:2,orient:"V"},
    {id:"blue_c",row:4,col:4,len:2,orient:"H"},{id:"blue_c2",row:5,col:1,len:2,orient:"H"},
    {id:"ltgrn",row:5,col:4,len:2,orient:"H"}]},
  { id: 14, difficulty: "hard", par: 17, name: "Gridlock III", custom: false, pieces: [
    {id:"red",row:2,col:1,len:2,orient:"H"},{id:"pink_t",row:3,col:0,len:3,orient:"V"},
    {id:"teal",row:0,col:0,len:2,orient:"H"},{id:"pink_c",row:1,col:3,len:2,orient:"V"},
    {id:"dkred",row:1,col:4,len:2,orient:"V"},{id:"gray",row:3,col:1,len:2,orient:"V"},
    {id:"grn_t",row:1,col:5,len:3,orient:"V"},{id:"blue_t",row:3,col:2,len:3,orient:"H"},
    {id:"grn_c",row:4,col:3,len:2,orient:"V"},{id:"purp",row:0,col:2,len:2,orient:"V"},
    {id:"blue_c",row:4,col:4,len:2,orient:"H"},{id:"blue_c2",row:5,col:1,len:2,orient:"H"},
    {id:"ltgrn",row:5,col:4,len:2,orient:"H"}]},
  { id: 15, difficulty: "expert", par: 29, name: "The Beast", custom: false, pieces: [
    {id:"red",row:2,col:3,len:2,orient:"H"},{id:"pink_t",row:0,col:0,len:3,orient:"V"},
    {id:"teal",row:0,col:1,len:2,orient:"H"},{id:"pink_c",row:0,col:3,len:2,orient:"V"},
    {id:"dkred",row:0,col:4,len:2,orient:"V"},{id:"gray",row:1,col:1,len:2,orient:"V"},
    {id:"grn_t",row:1,col:5,len:3,orient:"V"},{id:"blue_t",row:3,col:0,len:3,orient:"H"},
    {id:"grn_c",row:3,col:3,len:2,orient:"V"},{id:"purp",row:4,col:2,len:2,orient:"V"},
    {id:"blue_c",row:4,col:4,len:2,orient:"H"},{id:"blue_c2",row:5,col:0,len:2,orient:"H"},
    {id:"ltgrn",row:5,col:3,len:2,orient:"H"}]},
];

// ─── Colour palette ───────────────────────────────────────────────────────────

const PIECE_COLOURS = {
  red:"#ef4444",pink_t:"#ec4899",pink_c:"#f9a8d4",teal:"#0d9488",gray:"#9ca3af",
  dkred:"#b91c1c",grn_t:"#15803d",blue_t:"#1d4ed8",grn_c:"#22c55e",purp:"#7c3aed",
  blue_c:"#38bdf8",blue_c2:"#3b82f6",ltgrn:"#86efac",
  a:"#f59e0b",b:"#0d9488",c:"#8b5cf6",d:"#ec4899",e:"#0ea5e9",f:"#16a34a",
  g:"#f97316",h:"#6366f1",i:"#e879f9",j:"#34d399",k:"#fb7185",l:"#fbbf24",
  m:"#a78bfa",n:"#fb923c",o:"#4ade80",p:"#f472b6",
};
const EDITOR_COLOURS = ["#f59e0b","#0d9488","#8b5cf6","#0ea5e9","#16a34a","#f97316","#ec4899","#6366f1"];
function pcolour(id) { return PIECE_COLOURS[id] || "#6b7280"; }
function fgcolour(bg) {
  const c=bg.replace("#","");
  const r=parseInt(c.slice(0,2),16),g=parseInt(c.slice(2,4),16),b=parseInt(c.slice(4,6),16);
  return (r*299+g*587+b*114)/1000>150?"#1a1a2e":"#fff";
}

const DIFF_COLOUR = { easy:"#16a34a",medium:"#d97706",hard:"#dc2626",expert:"#7c3aed",custom:"#6366f1" };
const DIFF_LABEL  = { easy:"Easy",medium:"Medium",hard:"Hard",expert:"Expert",custom:"Custom" };

function getDifficulty(par) {
  if(par==null) return "custom";
  if(par<=8)  return "easy";
  if(par<=16) return "medium";
  if(par<=24) return "hard";
  return "expert";
}

// ─── Shared visual constants ──────────────────────────────────────────────────

const CELL=52, GAP=4, INSET=6, BORDER=4;
const STEP=CELL+GAP;
const GRID_PX=CELL*6+GAP*5;
const BOARD_PX=GRID_PX+INSET*2+BORDER*2;
const MINI=28, MINI_GAP=2, MINI_STEP=MINI+MINI_GAP, MINI_GRID=MINI*6+MINI_GAP*5;
const MINI_INSET=3, MINI_BORDER=2;
const MINI_BOARD_PX=MINI_GRID+MINI_INSET*2+MINI_BORDER*2;

// ─── Shared Board component (game mode) ──────────────────────────────────────

function Board({ pieces, selectedId, onSelectPiece, onDragPreview, onDragCommit, solved, T }) {
  const boardRef = useRef(null);
  const dragState = useRef(null);

  function getCell(e) {
    const rect=boardRef.current.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return { row:Math.max(0,Math.min(5,Math.floor((cy-rect.top)/(CELL+GAP)))),
             col:Math.max(0,Math.min(5,Math.floor((cx-rect.left)/(CELL+GAP)))) };
  }
  function onDown(e,piece) {
    if(solved) return; e.preventDefault();
    onSelectPiece(piece.id);
    const cell=getCell(e);
    dragState.current={id:piece.id,orient:piece.orient,startCell:cell,startRow:piece.row,startCol:piece.col,lastDelta:0};
  }
  function onMove(e) {
    if(!dragState.current) return; e.preventDefault();
    const cell=getCell(e); const ds=dragState.current;
    const delta=ds.orient==="H"?cell.col-ds.startCell.col:cell.row-ds.startCell.row;
    if(delta!==ds.lastDelta){ds.lastDelta=delta;onDragPreview(ds.id,ds.orient,delta,ds.startRow,ds.startCol);}
  }
  function onUp() {
    if(!dragState.current) return; const ds=dragState.current;
    if(ds.lastDelta!==0) onDragCommit(ds.id,ds.orient,ds.lastDelta,ds.startRow,ds.startCol);
    dragState.current=null;
  }
  const boardBg = T ? T.boardBg : "#090914";
  const cellBg = T ? (T.boardBg === "#090914" ? "#252545" : "#d0d0e8") : "#252545";
  return (
    <div ref={boardRef} onMouseMove={onMove} onMouseUp={onUp} onTouchMove={onMove} onTouchEnd={onUp}
      style={{position:"relative",width:BOARD_PX,height:BOARD_PX,flexShrink:0,
        backgroundColor:boardBg,borderRadius:12,touchAction:"none",userSelect:"none",
        border:solved?"4px solid #4ade80":"4px solid #2a2a4a",transition:"border-color 0.3s",boxSizing:"border-box"}}>
      {Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>(
        <div key={`${r}-${c}`} style={{position:"absolute",left:INSET+c*STEP,top:INSET+r*STEP,width:CELL,height:CELL,backgroundColor:cellBg,borderRadius:5}}/>
      )))}
      {pieces.map(p=>{
        const bg=pcolour(p.id),isRed=p.id==="red",isSel=p.id===selectedId;
        const w=p.orient==="H"?p.len*CELL+(p.len-1)*GAP:CELL;
        const h=p.orient==="V"?p.len*CELL+(p.len-1)*GAP:CELL;
        return (<div key={p.id} onMouseDown={e=>onDown(e,p)} onTouchStart={e=>onDown(e,p)}
          style={{position:"absolute",left:INSET+p.col*STEP,top:INSET+p.row*STEP,width:w,height:h,
            backgroundColor:bg,borderRadius:7,zIndex:isSel?10:2,
            border:isSel?"2px solid #fff":isRed?"2px solid #fca5a5":"2px solid rgba(255,255,255,0.18)",
            boxShadow:isRed?"0 0 12px rgba(239,68,68,0.5)":isSel?"0 0 10px rgba(255,255,255,0.3)":"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:fgcolour(bg),fontSize:isRed?"1rem":"0.55rem",fontWeight:800,
            cursor:solved?"default":"grab",transition:"left 0.07s,top 0.07s"}}>
          {isRed?"★":""}
        </div>);
      })}
      <div style={{position:"absolute",left:BOARD_PX+2,top:INSET+2*STEP+CELL/2-12,color:"#ef4444",fontSize:"1.5rem",fontWeight:900}}>→</div>
    </div>
  );
}

// ─── Editor Board component ───────────────────────────────────────────────────

function EditorBoard({ pieces, onCellClick, previewPiece, redMode, activeColour, T }) {
  const boardRef = useRef(null);
  const [hoverCell, setHoverCell] = useState(null);

  function getCell(e) {
    const rect=boardRef.current.getBoundingClientRect();
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    const row=Math.floor((cy-rect.top)/(CELL+GAP));
    const col=Math.floor((cx-rect.left)/(CELL+GAP));
    if(row<0||row>5||col<0||col>5) return null;
    return {row,col};
  }

  function getPreviewCells(cell) {
    if(!cell||!previewPiece) return null;
    const {len,orient}=previewPiece;
    const cells=[];
    for(let i=0;i<len;i++){
      const r=orient==="V"?cell.row+i:cell.row;
      const c=orient==="H"?cell.col+i:cell.col;
      if(r>5||c>5) return null;
      cells.push({row:r,col:c});
    }
    return cells;
  }

  function getRedPreviewCells(cell) {
    if(!cell||cell.row!==2||cell.col>4) return null;
    return [{row:2,col:cell.col},{row:2,col:cell.col+1}];
  }

  const occ = new Set();
  pieces.forEach(p=>{ for(let i=0;i<p.len;i++){
    if(p.orient==="H") occ.add(`${p.row},${p.col+i}`);
    else occ.add(`${p.row+i},${p.col}`);
  }});
  const occNoRed = new Set();
  pieces.filter(p=>p.id!=="red").forEach(p=>{ for(let i=0;i<p.len;i++){
    if(p.orient==="H") occ.add(`${p.row},${p.col+i}`);
    else occ.add(`${p.row+i},${p.col}`);
  }});

  const previewCells     = redMode ? getRedPreviewCells(hoverCell) : getPreviewCells(hoverCell);
  const previewValid     = previewCells && (
    redMode
      ? previewCells.every(c=>!occNoRed.has(`${c.row},${c.col}`))
      : previewCells.every(c=>!occ.has(`${c.row},${c.col}`))
  );
  const previewColour    = redMode ? "#ef4444" : (activeColour||"#6366f1");

  const boardBg = T ? T.boardBg : "#090914";
  const cellBg = T ? (T.boardBg === "#090914" ? "#252545" : "#d0d0e8") : "#252545";

  return (
    <div ref={boardRef}
      onMouseMove={e=>{const c=getCell(e);setHoverCell(c);}}
      onMouseLeave={()=>setHoverCell(null)}
      onClick={e=>{const c=getCell(e);if(c)onCellClick(c);}}
      onTouchStart={e=>{const c=getCell(e);if(c){setHoverCell(c);onCellClick(c);}}}
      style={{position:"relative",width:BOARD_PX,height:BOARD_PX,flexShrink:0,
        backgroundColor:boardBg,borderRadius:12,touchAction:"none",userSelect:"none",
        border:"4px solid #2a2a4a",cursor:"crosshair",boxSizing:"border-box"}}>
      {Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>{
        const isRowHint = redMode && r===2;
        const isPreview = previewCells&&previewCells.some(p=>p.row===r&&p.col===c);
        const isHover   = !isPreview&&hoverCell&&hoverCell.row===r&&hoverCell.col===c;
        let bg = cellBg;
        if(isPreview) bg = previewValid ? `${previewColour}44` : "rgba(239,68,68,0.25)";
        else if(isRowHint) bg = "rgba(239,68,68,0.12)";
        else if(isHover) bg = "rgba(255,255,255,0.07)";
        return (
          <div key={`${r}-${c}`} style={{position:"absolute",left:INSET+c*STEP,top:INSET+r*STEP,width:CELL,height:CELL,
            backgroundColor:bg,borderRadius:5,boxSizing:"border-box",
            border:isPreview?`2px dashed ${previewValid?previewColour:"#ef4444"}`:"none",
            transition:"background-color 0.1s"}}/>
        );
      }))}
      {pieces.map(p=>{
        const bg=pcolour(p.id),isRed=p.id==="red";
        const w=p.orient==="H"?p.len*CELL+(p.len-1)*GAP:CELL;
        const h=p.orient==="V"?p.len*CELL+(p.len-1)*GAP:CELL;
        return (<div key={p.id}
          style={{position:"absolute",left:INSET+p.col*STEP,top:INSET+p.row*STEP,width:w,height:h,
            backgroundColor:bg,borderRadius:7,zIndex:2,pointerEvents:"none",
            border:isRed?"2px solid #fca5a5":"2px solid rgba(255,255,255,0.25)",
            boxShadow:isRed?"0 0 12px rgba(239,68,68,0.5)":"none",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:fgcolour(bg),fontSize:isRed?"1rem":"0.55rem",fontWeight:800,
            opacity: redMode&&isRed ? 0.5 : 1,
            transition:"opacity 0.15s"}}>
          {isRed?"★":""}
        </div>);
      })}
      <div style={{position:"absolute",left:BOARD_PX+2,top:INSET+2*STEP+CELL/2-12,color:"#ef4444",fontSize:"1.5rem",fontWeight:900}}>→</div>
    </div>
  );
}

// ─── Mini Board ───────────────────────────────────────────────────────────────

function MiniBoard({ pieces }) {
  return (
    <div style={{position:"relative",width:MINI_BOARD_PX,height:MINI_BOARD_PX,backgroundColor:"#090914",
      borderRadius:6,border:`${MINI_BORDER}px solid #2a2a4a`,flexShrink:0,boxSizing:"border-box"}}>
      {Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>(
        <div key={`${r}-${c}`} style={{position:"absolute",left:MINI_INSET+c*MINI_STEP,top:MINI_INSET+r*MINI_STEP,width:MINI,height:MINI,backgroundColor:"#252545",borderRadius:3}}/>
      )))}
      {pieces.map(p=>{
        const bg=pcolour(p.id),isRed=p.id==="red";
        const w=p.orient==="H"?p.len*MINI+(p.len-1)*MINI_GAP:MINI;
        const h=p.orient==="V"?p.len*MINI+(p.len-1)*MINI_GAP:MINI;
        return (<div key={p.id} style={{position:"absolute",left:MINI_INSET+p.col*MINI_STEP,top:MINI_INSET+p.row*MINI_STEP,width:w,height:h,
          backgroundColor:bg,borderRadius:4,zIndex:2,
          border:isRed?"1.5px solid #fca5a5":"1.5px solid rgba(255,255,255,0.15)",
          boxShadow:isRed?"0 0 6px rgba(239,68,68,0.5)":"none",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:fgcolour(bg),fontSize:"0.5rem",fontWeight:800}}>
          {isRed?"★":""}
        </div>);
      })}
      <div style={{position:"absolute",left:MINI_BOARD_PX+3,top:MINI_INSET+2*MINI_STEP+MINI/2-7,color:"#ef4444",fontSize:"0.9rem",fontWeight:900}}>→</div>
    </div>
  );
}

// ─── Solver Panel ─────────────────────────────────────────────────────────────

function SolverPanel({ pieces, solution, solving, solverStep, setSolverStep, T }) {
  function getSolverPieces(step) {
    let p=pieces.map(x=>({...x}));
    for(let i=0;i<step;i++) p=p.map(x=>x.id===solution[i].id?solution[i].newPos:x);
    return p;
  }
  const card = T ? T.card : "#1e1e32";
  const textDim = T ? T.textDim : "#a0a0b8";
  const border = T ? T.border : "rgba(255,255,255,0.06)";
  const nb=(dis)=>({border:"none",borderRadius:6,padding:"4px 9px",cursor:dis?"not-allowed":"pointer",fontSize:"0.82rem",backgroundColor:T?(T.cardAlt||"#252540"):"#252540",color:dis?"#3b3b52":textDim});
  return (
    <div style={{backgroundColor:card,borderRadius:10,padding:14,maxWidth:360,margin:"0 auto 14px",border:`1px solid ${border}`}}>
      {solving && <div style={{color:textDim,fontSize:"0.82rem",textAlign:"center"}}>Computing optimal solution…</div>}
      {!solving && solution && solution.length===0 && <div style={{color:"#f87171",fontSize:"0.82rem",textAlign:"center"}}>No solution found — board may be unsolvable.</div>}
      {!solving && solution && solution.length>0 && (<>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <span style={{fontSize:"0.85rem",fontWeight:700}}>✅ {solution.length}-move solution</span>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setSolverStep(0)} disabled={solverStep===0} style={nb(solverStep===0)}>⏮</button>
            <button onClick={()=>setSolverStep(s=>Math.max(0,s-1))} disabled={solverStep===0} style={nb(solverStep===0)}>◀</button>
            <span style={{fontSize:"0.78rem",color:textDim,alignSelf:"center",minWidth:52,textAlign:"center"}}>{solverStep}/{solution.length}</span>
            <button onClick={()=>setSolverStep(s=>Math.min(solution.length,s+1))} disabled={solverStep===solution.length} style={nb(solverStep===solution.length)}>▶</button>
            <button onClick={()=>setSolverStep(solution.length)} disabled={solverStep===solution.length} style={nb(solverStep===solution.length)}>⏭</button>
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
          <MiniBoard pieces={getSolverPieces(solverStep)}/>
        </div>
        <ol style={{margin:0,padding:"0 0 0 18px",fontSize:"0.78rem",maxHeight:150,overflowY:"auto"}}>
          {solution.map((mv,i)=>{
            const piece=getSolverPieces(i).find(p=>p.id===mv.id);
            const dir=mv.newPos.orient==="H"?(mv.newPos.col>(piece?.col??0)?"right":"left"):(mv.newPos.row>(piece?.row??0)?"down":"up");
            return (<li key={i} onClick={()=>setSolverStep(i+1)} style={{padding:"2px 0",cursor:"pointer",
              color:i<solverStep?"#818cf8":i===solverStep?(T?T.text:"#e8e8f0"):"#4b5563",fontWeight:i===solverStep?700:400}}>
              <span style={{padding:"1px 5px",borderRadius:3,marginRight:4,backgroundColor:pcolour(mv.id),color:fgcolour(pcolour(mv.id)),fontSize:"0.7rem",fontWeight:700}}>
                {mv.id==="red"?"★":mv.id.toUpperCase()}
              </span>{dir}
            </li>);
          })}
        </ol>
      </>)}
    </div>
  );
}

// ─── JSON Importer ────────────────────────────────────────────────────────────

function JsonImporter({ onLoad, T }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  function validate(parsed) {
    if(!Array.isArray(parsed)) return "Must be an array of pieces.";
    if(!parsed.find(p=>p.id==="red")) return "Missing red piece.";
    for(const p of parsed) {
      if(!p.id||p.row==null||p.col==null||!p.len||!p.orient) return `Piece missing fields: ${JSON.stringify(p)}`;
      if(p.row<0||p.row>5||p.col<0||p.col>5) return `Piece out of bounds: ${p.id}`;
      if(p.orient!=="H"&&p.orient!=="V") return `Invalid orient on ${p.id}`;
      if(p.len<2||p.len>3) return `Invalid len on ${p.id}`;
    }
    const occ=new Map();
    for(const p of parsed){
      for(let i=0;i<p.len;i++){
        const r=p.orient==="V"?p.row+i:p.row;
        const c=p.orient==="H"?p.col+i:p.col;
        if(r>5||c>5) return `Piece ${p.id} goes out of bounds.`;
        const k=`${r},${c}`;
        if(occ.has(k)) return `Pieces ${p.id} and ${occ.get(k)} overlap.`;
        occ.set(k,p.id);
      }
    }
    return null;
  }

  function tryLoad(raw) {
    setError("");
    try {
      const parsed = JSON.parse(raw.trim());
      const err = validate(parsed);
      if(err) { setError(err); return; }
      onLoad(parsed);
    } catch(e) {
      setError("Invalid JSON — check your input.");
    }
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setText(ev.target.result); tryLoad(ev.target.result); };
    reader.readAsText(file);
    e.target.value = "";
  }

  const cardAlt = T ? T.cardAlt : "#252540";
  const textDim = T ? T.textDim : "#a0a0b8";
  const border = T ? T.border : "1px solid #3b3b52";
  const textColor = T ? T.text : "#e8e8f0";

  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:6}}>
        <button onClick={()=>fileRef.current.click()}
          style={{border:"none",borderRadius:7,padding:"7px 12px",cursor:"pointer",
            fontWeight:600,fontSize:"0.78rem",backgroundColor:cardAlt,color:textDim,flex:1}}>
          📁 Upload JSON file
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleFile} style={{display:"none"}}/>
      </div>
      <textarea value={text} onChange={e=>{setText(e.target.value);setError("");}}
        placeholder='Or paste JSON here…'
        style={{width:"100%",height:72,backgroundColor:T?T.bg:"#12122a",color:textColor,
          border:`1px solid ${error?"#f87171":(T?"rgba(0,0,0,0.15)":"#3b3b52")}`,borderRadius:7,padding:"8px 10px",
          fontSize:"0.68rem",fontFamily:"monospace",resize:"none",
          boxSizing:"border-box",outline:"none",marginBottom:6}}/>
      {error && <div style={{fontSize:"0.72rem",color:"#f87171",marginBottom:6}}>{error}</div>}
      <button onClick={()=>tryLoad(text)} disabled={!text.trim()}
        style={{border:"none",borderRadius:7,padding:"7px 14px",cursor:text.trim()?"pointer":"not-allowed",
          fontWeight:600,fontSize:"0.82rem",width:"100%",
          backgroundColor:text.trim()?"#6366f1":cardAlt,
          color:text.trim()?"#fff":"#3b3b52"}}>
        Load Board
      </button>
    </div>
  );
}

// ─── Puzzle Editor / Solver Screen ────────────────────────────────────────────

const PIECE_IDS = ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p"];
const COLOUR_TO_ID = {
  [EDITOR_COLOURS[0]]: "a",
  [EDITOR_COLOURS[1]]: "b",
  [EDITOR_COLOURS[2]]: "c",
  [EDITOR_COLOURS[3]]: "d",
  [EDITOR_COLOURS[4]]: "e",
  [EDITOR_COLOURS[5]]: "f",
  [EDITOR_COLOURS[6]]: "g",
  [EDITOR_COLOURS[7]]: "h",
};

function EditorScreen({ onBack, onPlay, onSave, T, dark, setDark }) {
  const makeRed = (col=0) => ({id:"red",row:2,col,len:2,orient:"H"});

  const [tool, setTool]               = useState("solve");
  const [pieceLen, setPieceLen]       = useState(2);
  const [pieceOrient, setPieceOrient] = useState("H");
  const [pieceColour, setPieceColour] = useState(EDITOR_COLOURS[0]);
  const [pieces, setPieces]           = useState([makeRed(0)]);
  const [solution, setSolution]       = useState(null);
  const [solving, setSolving]         = useState(false);
  const [solverStep, setSolverStep]   = useState(0);
  const [solverOpen, setSolverOpen]   = useState(false);
  const [saveName, setSaveName]       = useState("");
  const [saveMsg, setSaveMsg]         = useState("");
  const [showJson, setShowJson]       = useState(false);

  // FIX: include tool in deps and guard so solver only auto-runs in solve mode
  useEffect(() => {
    if (tool === "solve") {
      runSolver(pieces);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pieces, tool]);

  function switchTool(t) {
    setTool(t);
  }

  function nextId(colour) {
    const preferred = COLOUR_TO_ID[colour];
    const used = new Set(pieces.map(p=>p.id));
    if(preferred && !used.has(preferred)) return preferred;
    return PIECE_IDS.find(id=>!used.has(id)) || "x";
  }

  function handleCellClick(cell) {
    setSolution(null); setSolverStep(0);

    if(tool==="red") {
      if(cell.col > 4) return;
      const occ = new Set();
      pieces.filter(p=>p.id!=="red").forEach(p=>{
        for(let i=0;i<p.len;i++){
          if(p.orient==="H") occ.add(`${p.row},${p.col+i}`);
          else occ.add(`${p.row+i},${p.col}`);
        }
      });
      if(occ.has(`2,${cell.col}`) || occ.has(`2,${cell.col+1}`)) return;
      setPieces(prev=>prev.map(p=>p.id==="red"?makeRed(cell.col):p));
      return;
    }

    if(tool==="erase") {
      setPieces(prev=>prev.filter(p=>{
        if(p.id==="red") return true;
        for(let i=0;i<p.len;i++){
          const r=p.orient==="V"?p.row+i:p.row;
          const c=p.orient==="H"?p.col+i:p.col;
          if(r===cell.row&&c===cell.col) return false;
        }
        return true;
      }));
      return;
    }

    if(tool==="solve") return;

    // Place mode
    const len=pieceLen, orient=pieceOrient;
    const cells=[];
    for(let i=0;i<len;i++){
      const r=orient==="V"?cell.row+i:cell.row;
      const c=orient==="H"?cell.col+i:cell.col;
      if(r>5||c>5) return;
      cells.push({row:r,col:c});
    }
    const occ=new Set();
    pieces.forEach(p=>{for(let i=0;i<p.len;i++){
      if(p.orient==="H") occ.add(`${p.row},${p.col+i}`);
      else occ.add(`${p.row+i},${p.col}`);
    }});
    if(cells.some(c=>occ.has(`${c.row},${c.col}`))) return;
    const id = nextId(pieceColour);
    setPieces(prev=>[...prev,{id,row:cell.row,col:cell.col,len,orient}]);
  }

  function clearBoard() {
    setPieces([makeRed(0)]);
    setSolution(null); setSolverStep(0);
  }

  function runSolver(pcs) {
    const toSolve = pcs || pieces;
    setSolving(true); setSolution(null); setSolverOpen(true); setSolverStep(0);
    setTimeout(()=>{ const sol=bfsSolve(toSolve); setSolving(false); setSolution(sol||[]); },50);
  }

  function handleSave() {
    if(!saveName.trim()) return;
    const par = solution ? solution.length : null;
    onSave({ name:saveName.trim(), pieces:pieces.map(p=>({...p})), par });
    setSaveMsg("Saved!");
    setTimeout(()=>{ setSaveMsg(""); setSaveName(""); },1500);
  }

  const jsonText = JSON.stringify(pieces, null, 2);
  const previewPiece = tool==="place" ? {len:pieceLen,orient:pieceOrient} : null;

  const bg = T ? T.bg : "#0f0f1a";
  const text = T ? T.text : "#e8e8f0";
  const card = T ? T.card : "#1e1e32";
  const cardAlt = T ? T.cardAlt : "#252540";
  const textDim = T ? T.textDim : "#a0a0b8";
  const textMuted = T ? T.textMuted : "#6b6b80";
  const border = T ? T.border : "rgba(255,255,255,0.06)";

  const btn={border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:"0.82rem"};
  const toolBtn=(active,col)=>({...btn,
    backgroundColor:active?(col||"#6366f1"):card,
    color:active?"#fff":textDim,padding:"7px 12px"});

  const hintText = {
    solve: "Board is solved automatically. Switch to Place or Erase to edit.",
    red:   "Click any cell on row 3 to reposition the red car.",
    place: "Click a cell to place the top-left corner of your piece.",
    erase: "Click any piece to remove it.",
  }[tool] || "";

  return (
    <div style={{backgroundColor:bg,minHeight:"100vh",color:text,fontFamily:"sans-serif",padding:16,boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
        <button onClick={onBack} style={{...btn,backgroundColor:card,color:textDim,padding:"6px 12px",marginRight:10}}>🎮 Game Mode</button>
        <div style={{flex:1,textAlign:"center",fontSize:"1rem",fontWeight:800}}>🛠 Board Editor</div>
        <div style={{display:"flex",gap:8}}>
          <a href="../../" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:`1px solid ${border}`,background:card,color:textMuted,fontSize:12,fontFamily:"inherit",textDecoration:"none"}}>⌂ Home</a>
          <button onClick={()=>setDark(d=>!d)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:`1px solid ${border}`,background:card,color:textMuted,fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>{dark?"☀ Light":"☾ Dark"}</button>
        </div>
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:12,flexWrap:"wrap"}}>
        <button onClick={()=>switchTool("solve")} style={toolBtn(tool==="solve","#6366f1")}>🔍 Solve</button>
        <button onClick={()=>switchTool("red")}   style={toolBtn(tool==="red","#ef4444")}>★ Red car</button>
        <button onClick={()=>switchTool("place")} style={toolBtn(tool==="place")}>✏️ Place</button>
        <button onClick={()=>switchTool("erase")} style={toolBtn(tool==="erase")}>🗑 Erase</button>
        <button onClick={clearBoard} style={{...btn,backgroundColor:card,color:"#f87171"}}>✕ Clear</button>
      </div>

      {tool==="place" && (
        <div style={{backgroundColor:card,borderRadius:10,padding:12,maxWidth:360,margin:"0 auto 12px",border:`1px solid ${border}`}}>
          <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>
            {[2,3].map(l=>(
              <button key={l} onClick={()=>setPieceLen(l)}
                style={{...btn,backgroundColor:pieceLen===l?"#6366f1":cardAlt,color:pieceLen===l?"#fff":textDim,flex:1}}>
                {l===2?"🚗 Car (2)":"🚛 Truck (3)"}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginBottom:10,justifyContent:"center"}}>
            {[["H","→ Horizontal"],["V","↓ Vertical"]].map(([o,label])=>(
              <button key={o} onClick={()=>setPieceOrient(o)}
                style={{...btn,backgroundColor:pieceOrient===o?"#6366f1":cardAlt,color:pieceOrient===o?"#fff":textDim,flex:1}}>
                {label}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            {EDITOR_COLOURS.map(col=>(
              <button key={col} onClick={()=>setPieceColour(col)}
                style={{width:36,height:36,borderRadius:8,backgroundColor:col,
                  border:pieceColour===col?"3px solid #fff":"3px solid transparent",
                  cursor:"pointer",padding:0,flexShrink:0}}/>
            ))}
          </div>
        </div>
      )}

      {tool==="red" && (
        <div style={{backgroundColor:card,borderRadius:10,padding:12,maxWidth:360,margin:"0 auto 12px",textAlign:"center",border:`1px solid ${border}`}}>
          <div style={{fontSize:"0.82rem",color:textDim}}>
            Click anywhere on <span style={{color:"#ef4444",fontWeight:700}}>row 3</span> to move the red car's starting position.
          </div>
          <div style={{fontSize:"0.72rem",color:textMuted,marginTop:4}}>It stays horizontal, length 2, and must exit to the right.</div>
        </div>
      )}

      <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
        <EditorBoard pieces={pieces} onCellClick={handleCellClick} previewPiece={previewPiece}
          redMode={tool==="red"} activeColour={tool==="place"?pieceColour:null} T={T}/>
      </div>

      <p style={{textAlign:"center",color:textMuted,fontSize:"0.72rem",marginBottom:12}}>{hintText}</p>

      <div style={{maxWidth:360,margin:"0 auto 10px",display:"flex",gap:8}}>
        <input value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Puzzle name (optional)…"
          style={{flex:1,padding:"8px 10px",borderRadius:7,border:`1px solid ${border}`,
            backgroundColor:card,color:text,fontSize:"0.82rem",boxSizing:"border-box",outline:"none"}}/>
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginBottom:14}}>
        <button onClick={()=>onPlay(pieces)} style={{...btn,backgroundColor:"#16a34a",color:"#fff"}}>▶ Play</button>
        <button onClick={handleSave}
          style={{...btn,backgroundColor:"#d97706",color:"#fff"}}>
          {saveMsg||"💾 Save"}
        </button>
        <button onClick={()=>setShowJson(s=>!s)} style={{...btn,backgroundColor:showJson?"#475569":card,color:textDim}}>
          {showJson?"Hide JSON":"{ } JSON"}
        </button>
      </div>

      {solution&&solution.length>0&&saveMsg===""&&(
        <div style={{fontSize:"0.72rem",color:textMuted,textAlign:"center",marginBottom:10}}>
          Par will be set to {solution.length} on save
        </div>
      )}

      {showJson && (
        <div style={{backgroundColor:card,borderRadius:10,padding:14,maxWidth:360,margin:"0 auto 14px",border:`1px solid ${border}`}}>
          <div style={{fontSize:"0.75rem",fontWeight:700,color:textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Export</div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <div style={{fontSize:"0.78rem",color:textDim}}>Select all and copy:</div>
            <button onClick={()=>{
              const json=JSON.stringify(pieces,null,2);
              const blob=new Blob([json],{type:"application/json"});
              const url=URL.createObjectURL(blob);
              const a=document.createElement("a");
              a.href=url;
              a.download=`rush-hour-${saveName.trim()||"puzzle"}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }} style={{border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",
              fontWeight:600,fontSize:"0.75rem",backgroundColor:"#6366f1",color:"#fff"}}>
              ⬇ Download
            </button>
          </div>
          <textarea readOnly value={jsonText} onClick={e=>e.target.select()}
            style={{width:"100%",height:100,backgroundColor:T?T.bg:"#12122a",color:textDim,
              border:`1px solid ${border}`,borderRadius:7,padding:"8px 10px",
              fontSize:"0.68rem",fontFamily:"monospace",resize:"none",
              boxSizing:"border-box",outline:"none",marginBottom:14}}/>

          <div style={{fontSize:"0.75rem",fontWeight:700,color:textMuted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Import</div>
          <JsonImporter T={T} onLoad={incoming=>{
            setPieces(incoming);
            setSolution(null); setSolverStep(0); setShowJson(false);
          }}/>
        </div>
      )}

      {solverOpen && (
        <SolverPanel pieces={pieces} solution={solution} solving={solving}
          solverStep={solverStep} setSolverStep={setSolverStep} T={T}/>
      )}
    </div>
  );
}

// ─── Puzzle Picker ────────────────────────────────────────────────────────────

function PuzzlePicker({ puzzles, records, onSelect, onOpenEditor, dark, setDark, T }) {
  const [filter, setFilter] = useState("all");
  const diffs = ["all","easy","medium","hard","expert","custom"];
  const shown = filter==="all" ? puzzles : puzzles.filter(p=>p.difficulty===(filter==="custom"?"custom":filter));
  const hasCustom = puzzles.some(p=>p.custom);

  return (
    <div style={{ backgroundColor: T.bg, minHeight: "100vh", color: T.text, fontFamily: "sans-serif", padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, maxWidth: 600, margin: '0 auto 12px' }}>
        <a href="../../" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textMuted,fontSize:12,fontFamily:'inherit',textDecoration:'none' }}>⌂ Home</a>
        <button onClick={() => setDark(d => !d)} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textMuted,fontSize:12,fontFamily:'inherit',cursor:'pointer' }}>{dark ? '☀ Light' : '☾ Dark'}</button>
      </div>
      <h1 style={{ fontSize: "1.3rem", fontWeight: 800, textAlign: "center", marginBottom: 2, color: T.text }}>🚗 Rush Hour</h1>
      <p style={{ color: T.textMuted, fontSize: "0.75rem", textAlign: "center", marginBottom: 14 }}>Slide pieces out of the way. Get the red car to the exit.</p>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <button onClick={onOpenEditor}
          style={{ border: "none", borderRadius: 20, padding: "8px 20px", cursor: "pointer", fontWeight: 600, fontSize: "0.82rem",
            backgroundColor: T.card, color: T.textDim, display: "flex", alignItems: "center", gap: 6 }}>
          🛠 Board Editor & Solver
        </button>
      </div>

      <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:14}}>
        {diffs.filter(d=>d!=="custom"||hasCustom).map(d=>(
          <button key={d} onClick={()=>setFilter(d)}
            style={{border:"none",borderRadius:20,padding:"6px 14px",cursor:"pointer",fontWeight:600,fontSize:"0.78rem",
              backgroundColor:filter===d?(d==="all"?"#6366f1":DIFF_COLOUR[d]||"#6366f1"):T.card,
              color:filter===d?"#fff":T.textMuted}}>
            {d==="all"?"All":DIFF_LABEL[d]||d}
          </button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:10,maxWidth:600,margin:"0 auto"}}>
        {shown.map(p=>(
          <button key={p.id} onClick={()=>onSelect(p)}
            style={{backgroundColor:T.card,
              border:`2px solid ${records[p.id]?DIFF_COLOUR[p.difficulty]||"#6366f1":T.border}`,
              borderRadius:10,padding:"14px 10px",cursor:"pointer",textAlign:"left"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:"0.65rem",fontWeight:700,
                color:DIFF_COLOUR[p.difficulty]||"#6366f1",
                backgroundColor:(DIFF_COLOUR[p.difficulty]||"#6366f1")+"22",
                borderRadius:20,padding:"2px 8px"}}>
                {DIFF_LABEL[p.difficulty]||"Custom"}
              </span>
              {records[p.id]&&<span>✅</span>}
            </div>
            <div style={{fontSize:"0.9rem",fontWeight:700,color:T.text,marginBottom:2}}>
              {p.custom?"★ ":""}{p.name}
            </div>
            <div style={{fontSize:"0.72rem",color:T.textMuted}}>
              {p.par!=null?`Par ${p.par}`:"No par set"}
            </div>
            {records[p.id]&&<div style={{fontSize:"0.7rem",color:"#4ade80",marginTop:4}}>Best: {records[p.id].moves} moves</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(s){return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
function getRating(moves,par){
  if(par==null) return{label:"Solved! 🎉",colour:"#a0a0b8"};
  const d=moves-par;
  if(d===0) return{label:"Perfect! 🏆",colour:"#facc15"};
  if(d<=3)  return{label:"Excellent! ✨",colour:"#4ade80"};
  if(d<=8)  return{label:"Good 👍",colour:"#60a5fa"};
  return{label:"Solved! 🎉",colour:"#a0a0b8"};
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function RushHourApp() {
  const [dark, setDark]              = useState(true);

  const T = {
    bg:        dark ? '#0f0f1a'                : '#f4f4fc',
    card:      dark ? '#1e1e32'                : '#ffffff',
    cardAlt:   dark ? '#13132a'                : '#f0f0fa',
    border:    dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)',
    boardBg:   dark ? '#090914'                : '#e8e8f8',
    text:      dark ? '#e8e8f0'                : '#1a1a2e',
    textMuted: dark ? '#6b6b80'                : '#6868a0',
    textDim:   dark ? '#a0a0b8'                : '#4a4a6a',
    accent:    '#6366f1',
  };

  const [screen, setScreen]         = useState("editor");
  const [puzzles, setPuzzles]       = useState(BUILT_IN_PUZZLES);
  const [puzzle, setPuzzle]         = useState(null);
  const [pieces, setPieces]         = useState([]);
  const [history, setHistory]       = useState([]);
  const [moveCount, setMoveCount]   = useState(0);
  const [elapsed, setElapsed]       = useState(0);
  const [running, setRunning]       = useState(false);
  const [solved, setSolved]         = useState(false);
  const [records, setRecords]       = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [hint, setHint]             = useState(null);
  const [showHint, setShowHint]     = useState(false);
  const [solution, setSolution]     = useState(null);
  const [solverOpen, setSolverOpen] = useState(false);
  const [solverStep, setSolverStep] = useState(0);
  const [solving, setSolving]       = useState(false);
  const timerRef = useRef(null);

  useEffect(()=>{
    clearInterval(timerRef.current);
    if(running&&!solved) timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000);
    return()=>clearInterval(timerRef.current);
  },[running,solved]);

  function startPuzzle(p) {
    clearInterval(timerRef.current);
    setPuzzle(p); setPieces(p.pieces.map(x=>({...x})));
    setHistory([]); setMoveCount(0); setElapsed(0);
    setRunning(false); setSolved(false); setSelectedId(null);
    setHint(null); setShowHint(false);
    setSolution(null); setSolverOpen(false); setSolverStep(0); setSolving(false);
    setScreen("game");
  }

  function playFromEditor(editorPieces) {
    const p = { id:`custom-${Date.now()}`, name:"Custom", difficulty:"custom", par:null, custom:true, pieces:editorPieces.map(x=>({...x})) };
    startPuzzle(p);
  }

  // FIX: removed window.storage — custom puzzles persist in-session memory only
  function saveCustomPuzzle({ name, pieces: pcs, par }) {
    const newPuzzle = {
      id: `custom-${Date.now()}`,
      name, par,
      difficulty: par!=null ? getDifficulty(par) : "custom",
      custom: true,
      pieces: pcs,
    };
    setPuzzles(prev => [...prev, newPuzzle]);
  }

  // FIX: compute new pieces and goal check outside state setters to avoid closure issues
  function handleDragPreview(id, orient, delta, startRow, startCol) {
    if(solved) return;
    setPieces(prev => {
      // Reset the dragged piece to its drag-start position, then clamp from there
      const base = prev.map(p => p.id === id ? { ...p, row: startRow, col: startCol } : p);
      const piece = base.find(p => p.id === id);
      const occ = getOccupied(base, id);
      let newPos = { ...piece };
      const sign = delta > 0 ? 1 : -1;
      for (let d = 1; d <= Math.abs(delta); d++) {
        const nc = orient === "H" ? piece.col + sign * d : piece.col;
        const nr = orient === "V" ? piece.row + sign * d : piece.row;
        const outOfBounds = orient === "H"
          ? (sign > 0 ? nc + piece.len > 6 : nc < 0)
          : (sign > 0 ? nr + piece.len > 6 : nr < 0);
        const blocked = orient === "H"
          ? (sign > 0 ? occ.has(`${piece.row},${nc + piece.len - 1}`) : occ.has(`${piece.row},${nc}`))
          : (sign > 0 ? occ.has(`${nr + piece.len - 1},${piece.col}`) : occ.has(`${nr},${piece.col}`));
        if (outOfBounds || blocked) break;
        newPos = { ...newPos, row: nr, col: nc };
      }
      return base.map(p => p.id === id ? newPos : p);
    });
  }

  function handleDragCommit(id, orient, delta, startRow, startCol) {
    if(solved) return;
    if(!running) setRunning(true);
    setHint(null); setShowHint(false);
    setSolution(null); setSolverOpen(false);

    setPieces(prev => {
      const piece = prev.find(p => p.id === id);
      // If piece hasn't moved from start, nothing to commit
      if (!piece || (piece.row === startRow && piece.col === startCol)) return prev;

      // Snapshot before this move for undo
      const preDrag = prev.map(p => p.id === id ? { ...p, row: startRow, col: startCol } : p);
      setHistory(h => [...h, preDrag]);

      const newPieces = prev; // already updated by handleDragPreview
      const nm = moveCount + 1;
      setMoveCount(nm);

      if (isGoal(newPieces)) {
        setSolved(true);
        setRunning(false);
        clearInterval(timerRef.current);
        setRecords(r => {
          const ex = r[puzzle.id];
          return (!ex || nm < ex.moves) ? { ...r, [puzzle.id]: { moves: nm } } : r;
        });
      }

      return newPieces;
    });
  }

  function undo() {
    if(!history.length) return;
    setPieces(history[history.length-1]);
    setHistory(h=>h.slice(0,-1));
    setMoveCount(m=>Math.max(0,m-1));
    setSolved(false); setHint(null); setShowHint(false);
    setSolution(null); setSolverOpen(false);
  }

  function getHint() {
    const sol=bfsSolve(pieces);
    if(sol&&sol.length>0){ setHint(sol[0]); setShowHint(true); setTimeout(()=>setShowHint(false),2500); }
  }

  function runSolver() {
    setSolving(true); setSolution(null); setSolverOpen(true); setSolverStep(0);
    setTimeout(()=>{ const sol=bfsSolve(pieces); setSolving(false); setSolution(sol||[]); },50);
  }

  const rating=solved&&puzzle?getRating(moveCount,puzzle.par):null;
  const btn={border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontWeight:600,fontSize:"0.82rem"};

  if(screen==="picker") return (
    <PuzzlePicker puzzles={puzzles} records={records} onSelect={startPuzzle} onOpenEditor={()=>setScreen("editor")}
      dark={dark} setDark={setDark} T={T}/>
  );

  if(screen==="editor") return (
    <EditorScreen onBack={()=>setScreen("picker")} onPlay={playFromEditor} onSave={saveCustomPuzzle}
      dark={dark} setDark={setDark} T={T}/>
  );

  return (
    <div style={{backgroundColor:T.bg,minHeight:"100vh",color:T.text,fontFamily:"sans-serif",padding:16,boxSizing:"border-box"}}>
      <div style={{display:"flex",alignItems:"center",marginBottom:10}}>
        <button onClick={()=>setScreen("picker")} style={{...btn,backgroundColor:T.card,color:T.textMuted,padding:"6px 12px",marginRight:10}}>← Back</button>
        <div style={{flex:1,textAlign:"center"}}>
          <span style={{fontSize:"0.65rem",fontWeight:700,
            color:DIFF_COLOUR[puzzle.difficulty]||"#6366f1",
            backgroundColor:(DIFF_COLOUR[puzzle.difficulty]||"#6366f1")+"22",
            borderRadius:20,padding:"2px 8px",marginRight:6}}>
            {DIFF_LABEL[puzzle.difficulty]||"Custom"}
          </span>
          <span style={{fontSize:"1rem",fontWeight:800}}>{puzzle.custom?"★ ":""}{puzzle.name}</span>
        </div>
        <button onClick={()=>setDark(d=>!d)} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textMuted,fontSize:12,fontFamily:"inherit",cursor:"pointer"}}>{dark?"☀ Light":"☾ Dark"}</button>
      </div>

      <div style={{display:"flex",justifyContent:"center",gap:20,backgroundColor:T.card,borderRadius:10,padding:"10px 20px",maxWidth:340,margin:"0 auto 14px",border:`1px solid ${T.border}`}}>
        {[["Moves",moveCount],["Par",puzzle.par??"-"],["Time",formatTime(elapsed)]].map(([label,val])=>(
          <div key={label} style={{textAlign:"center"}}>
            <div style={{fontSize:"1.05rem",fontWeight:700}}>{val}</div>
            <div style={{fontSize:"0.62rem",color:T.textMuted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{display:"flex",justifyContent:"center",marginBottom:12}}>
        <Board pieces={pieces} selectedId={selectedId} onSelectPiece={setSelectedId}
          onDragPreview={handleDragPreview} onDragCommit={handleDragCommit} solved={solved} T={T}/>
      </div>

      {showHint&&hint&&(
        <div style={{textAlign:"center",marginBottom:8,fontSize:"0.82rem",color:"#facc15",fontWeight:600}}>
          💡 Move{" "}
          <span style={{padding:"1px 7px",borderRadius:4,backgroundColor:pcolour(hint.id),color:fgcolour(pcolour(hint.id)),fontWeight:800,fontSize:"0.75rem"}}>
            {hint.id==="red"?"★ RED":hint.id.toUpperCase()}
          </span>
          {" "}→ {hint.newPos.orient==="H"?(hint.newPos.col>(pieces.find(p=>p.id===hint.id)?.col??0)?"right":"left"):(hint.newPos.row>(pieces.find(p=>p.id===hint.id)?.row??0)?"down":"up")}
        </div>
      )}

      <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap",marginBottom:14}}>
        <button onClick={undo} disabled={!history.length} style={{...btn,backgroundColor:T.card,color:!history.length?"#3b3b52":T.textDim,cursor:!history.length?"not-allowed":"pointer"}}>↩ Undo</button>
        <button onClick={getHint} disabled={solved} style={{...btn,backgroundColor:T.card,color:solved?"#3b3b52":T.textDim,cursor:solved?"not-allowed":"pointer"}}>💡 Hint</button>
        <button onClick={runSolver} disabled={solving} style={{...btn,backgroundColor:solverOpen?"#6366f1":T.card,color:solving?"#3b3b52":solverOpen?"#fff":T.textDim,cursor:solving?"not-allowed":"pointer"}}>
          {solving?"Solving…":"🔍 Solve"}
        </button>
        <button onClick={()=>startPuzzle(puzzle)} style={{...btn,backgroundColor:T.card,color:T.textDim}}>↺ Restart</button>
      </div>

      {solverOpen&&(
        <SolverPanel pieces={pieces} solution={solution} solving={solving}
          solverStep={solverStep} setSolverStep={setSolverStep} T={T}/>
      )}

      {solved&&rating&&(
        <div style={{backgroundColor:T.card,borderRadius:12,border:`2px solid ${rating.colour}`,padding:"20px 24px",textAlign:"center",maxWidth:320,margin:"0 auto"}}>
          <div style={{fontSize:"1.4rem",fontWeight:800,color:rating.colour,marginBottom:6}}>{rating.label}</div>
          <div style={{fontSize:"0.85rem",color:T.textDim,marginBottom:4}}>
            {moveCount} moves{puzzle.par!=null?` · Par ${puzzle.par}`:""} · {formatTime(elapsed)}
          </div>
          <div style={{fontSize:"0.78rem",color:T.textMuted,marginBottom:16}}>
            {puzzle.par!=null?(moveCount===puzzle.par?"Optimal solve! 🏆":`${moveCount-puzzle.par} over par`):""}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"center"}}>
            <button onClick={()=>setScreen("picker")} style={{...btn,backgroundColor:T.cardAlt,color:T.textDim}}>All Puzzles</button>
            {!puzzle.custom&&(
              <button onClick={()=>{ const nx=puzzles.find(p=>!p.custom&&p.id===puzzle.id+1); nx?startPuzzle(nx):setScreen("picker"); }}
                style={{...btn,backgroundColor:"#6366f1",color:"#fff"}}>Next →</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
