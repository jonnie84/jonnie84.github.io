import { useState, useMemo } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const GRADES = ["A", "B", "C", "D", "E"];
const GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1 };
const GRADE_COLORS = { A: "#22c55e", B: "#84cc16", C: "#eab308", D: "#f97316", E: "#ef4444", NI: "#4b5563" };
const AWARD_COLORS = { Gold: "#f59e0b", Silver: "#94a3b8", Bronze: "#b45309", Fail: "#ef4444" };
const AWARD_BG     = { Gold: "rgba(245,158,11,0.12)", Silver: "rgba(148,163,184,0.12)", Bronze: "rgba(180,83,9,0.12)", Fail: "rgba(239,68,68,0.08)" };
const STATION_KEYS = ["situps", "sbj", "sar", "pullups", "shuttle", "run"];

// ─── SCORING TABLES ───────────────────────────────────────────────────────────
// Thresholds array: [E_boundary, D_boundary, C_boundary, B_boundary, A_boundary]
// Higher-is-better stations: value >= boundary earns that grade
// Lower-is-better (shuttle, run): value <= boundary earns that grade
// Run times stored as total seconds

// Threshold arrays: [E_min, D_min, C_min, B_min, A_min]
// Higher-is-better (situps, sbj, sar, pullups): grade awarded when value >= threshold
//   A thresholds are set to (PDF ">X" value + 1) so that ">35" becomes ">=36"
// Lower-is-better (shuttle, run): grade awarded when value <= threshold
//   A thresholds are set to (PDF "<X" value - 0.1 for shuttle, - 1s for run)
//   so that "<11.3" becomes "<=11.2" and "<9:40" (580s) becomes "<=579s"

const PRIMARY_MALE = {
  //         situps          sbj               sar             pullups         shuttle                  run (seconds)
  9:  { situps:[15,20,25,30,36], sbj:[130,139,149,159,169], sar:[16,21,26,30,34], pullups:[3,9,13,18,22], shuttle:[13.1,12.7,12.2,11.8,11.2], run:[830,760,700,640,579] },
  10: { situps:[17,21,26,31,37], sbj:[137,146,156,165,175], sar:[18,23,28,32,36], pullups:[3,9,14,19,23], shuttle:[12.9,12.4,12.0,11.6,11.0], run:[820,760,700,630,569] },
  11: { situps:[20,25,30,34,40], sbj:[144,155,166,177,189], sar:[20,25,30,34,38], pullups:[4,10,15,20,24], shuttle:[12.5,12.0,11.6,11.2,10.6], run:[810,740,670,600,529] },
  12: { situps:[22,27,32,36,42], sbj:[150,163,176,189,203], sar:[23,28,32,36,40], pullups:[5,11,16,21,25], shuttle:[12.2,11.7,11.3,10.9,10.3], run:[750,700,640,580,519] },
  13: { situps:[25,29,34,38,43], sbj:[164,176,189,202,215], sar:[25,30,34,38,42], pullups:[7,12,17,22,26], shuttle:[11.9,11.5,11.1,10.7,10.2], run:[720,670,610,550,489] },
  14: { situps:[29,33,37,40,43], sbj:[186,196,206,216,226], sar:[27,32,36,40,44], pullups:[8,13,18,23,27], shuttle:[11.6,11.2,10.8,10.4,10.1], run:[920,850,780,720,660] },
  15: { situps:[30,34,37,40,43], sbj:[198,208,218,228,238], sar:[29,34,38,42,46], pullups:[1,3,5,6,8],   shuttle:[11.3,10.9,10.5,10.3,10.1], run:[880,820,760,700,640] },
};
const PRIMARY_FEMALE = {
  9:  { situps:[10,14,18,22,27], sbj:[119,129,139,148,159], sar:[19,24,28,31,34], pullups:[2,6,9,12,15],  shuttle:[13.8,13.3,12.8,12.3,11.7], run:[900,830,770,700,639] },
  10: { situps:[11,15,19,23,28], sbj:[125,134,143,152,162], sar:[21,26,30,33,36], pullups:[3,6,9,12,15],  shuttle:[13.7,13.2,12.7,12.2,11.6], run:[870,805,746,685,629] },
  11: { situps:[12,16,20,24,29], sbj:[129,138,147,156,165], sar:[23,28,32,35,38], pullups:[3,7,10,13,16], shuttle:[13.4,12.9,12.5,12.1,11.5], run:[840,780,731,680,619] },
  12: { situps:[13,17,21,25,30], sbj:[132,141,150,159,168], sar:[25,30,34,37,40], pullups:[3,7,10,13,16], shuttle:[13.2,12.7,12.3,11.9,11.4], run:[830,770,721,660,609] },
  13: { situps:[14,18,22,26,31], sbj:[135,144,153,162,171], sar:[27,32,36,39,42], pullups:[3,7,10,13,17], shuttle:[13.2,12.7,12.2,11.7,11.2], run:[820,760,710,650,599] },
  14: { situps:[16,20,24,28,31], sbj:[142,151,160,169,178], sar:[29,34,38,41,44], pullups:[3,7,10,14,17], shuttle:[13.0,12.6,12.2,11.8,11.4], run:[1100,1040,980,920,860] },
  15: { situps:[17,21,25,29,31], sbj:[147,156,165,174,183], sar:[30,35,39,43,46], pullups:[3,7,10,14,17], shuttle:[12.8,12.4,12.0,11.6,11.2], run:[1090,1030,970,910,850] },
};
const SEC_MALE = {
  12: { situps:[22,27,32,36,42], sbj:[150,163,176,189,203], sar:[23,28,32,36,40], pullups:[5,11,16,21,25], shuttle:[12.2,11.7,11.3,10.9,10.3], run:[1010,930,860,781,720] },
  13: { situps:[25,29,34,38,43], sbj:[164,176,189,202,215], sar:[25,30,34,38,42], pullups:[7,12,17,22,26], shuttle:[11.9,11.5,11.1,10.7,10.2], run:[960,890,820,751,690] },
  14: { situps:[29,33,37,40,43], sbj:[186,196,206,216,226], sar:[27,32,36,40,44], pullups:[8,13,18,23,27], shuttle:[11.6,11.2,10.8,10.4,10.1], run:[920,850,780,721,660] },
  15: { situps:[30,34,37,40,43], sbj:[198,208,218,228,238], sar:[29,34,38,42,46], pullups:[1,3,5,6,8],   shuttle:[11.3,10.9,10.5,10.3,10.1], run:[880,820,760,701,640] },
  16: { situps:[31,34,37,40,43], sbj:[206,216,226,236,246], sar:[31,36,40,44,48], pullups:[1,3,5,7,9],   shuttle:[11.1,10.7,10.5,10.3,10.1], run:[830,800,740,691,630] },
  17: { situps:[31,34,37,40,43], sbj:[210,220,230,240,250], sar:[32,37,41,45,49], pullups:[2,4,6,8,10],  shuttle:[10.9,10.7,10.5,10.3,10.1], run:[820,770,720,671,620] },
  18: { situps:[31,34,37,40,43], sbj:[212,222,232,242,252], sar:[32,37,41,45,49], pullups:[3,5,7,9,11],  shuttle:[10.9,10.7,10.5,10.3,10.1], run:[810,760,710,661,620] },
  19: { situps:[31,34,37,40,43], sbj:[212,222,232,242,252], sar:[32,37,41,45,49], pullups:[3,5,7,9,11],  shuttle:[10.9,10.7,10.5,10.3,10.1], run:[800,750,701,661,620] },
};
const SEC_FEMALE = {
  12: { situps:[13,17,21,25,30], sbj:[132,141,150,159,168], sar:[25,30,34,37,40], pullups:[3,7,10,13,16], shuttle:[13.2,12.7,12.3,11.9,11.4], run:[1120,1060,1000,941,880] },
  13: { situps:[14,18,22,26,31], sbj:[135,144,153,162,171], sar:[27,32,36,39,42], pullups:[3,7,10,13,17], shuttle:[13.2,12.7,12.2,11.7,11.2], run:[1110,1050,990,931,870] },
  14: { situps:[16,20,24,28,31], sbj:[142,151,160,169,178], sar:[29,34,38,41,44], pullups:[3,7,10,14,17], shuttle:[13.0,12.6,12.2,11.8,11.4], run:[1100,1040,980,921,860] },
  15: { situps:[17,21,25,29,31], sbj:[147,156,165,174,183], sar:[30,35,39,43,46], pullups:[3,7,10,14,17], shuttle:[12.8,12.4,12.0,11.6,11.2], run:[1090,1030,970,911,850] },
  16: { situps:[18,22,26,29,31], sbj:[151,160,169,178,187], sar:[31,36,40,44,47], pullups:[3,7,11,14,18], shuttle:[12.6,12.2,11.8,11.5,11.2], run:[1070,1020,960,901,840] },
  17: { situps:[19,23,27,29,31], sbj:[154,163,172,181,190], sar:[32,36,40,44,47], pullups:[3,7,11,14,18], shuttle:[12.5,12.1,11.8,11.5,11.2], run:[1050,1001,951,891,840] },
  18: { situps:[20,24,27,29,31], sbj:[156,165,174,183,193], sar:[32,36,40,44,47], pullups:[4,8,11,15,18], shuttle:[12.4,12.1,11.8,11.5,11.2], run:[1040,981,941,891,840] },
  19: { situps:[21,24,27,29,31], sbj:[156,165,174,185,196], sar:[32,36,39,43,46], pullups:[5,8,11,15,18], shuttle:[12.4,12.1,11.8,11.5,11.2], run:[1030,981,931,921,860] },
};

function getStandards(age, gender, level) {
  const a = parseInt(age);
  if (level === "primary") {
    return (gender === "male" ? PRIMARY_MALE : PRIMARY_FEMALE)[a] ?? null;
  } else {
    return (gender === "male" ? SEC_MALE : SEC_FEMALE)[a] ?? null;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function gradeIndex(value, thresholds, lowerBetter) {
  if (value === null || value === undefined || isNaN(value)) return -1;
  if (lowerBetter) {
    if (value <= thresholds[4]) return 4;
    if (value <= thresholds[3]) return 3;
    if (value <= thresholds[2]) return 2;
    if (value <= thresholds[1]) return 1;
    if (value <= thresholds[0]) return 0;
    return -1;
  } else {
    if (value >= thresholds[4]) return 4;
    if (value >= thresholds[3]) return 3;
    if (value >= thresholds[2]) return 2;
    if (value >= thresholds[1]) return 1;
    if (value >= thresholds[0]) return 0;
    return -1;
  }
}

function gradeFromIndex(idx) { return idx === -1 ? "NI" : GRADES[4 - idx]; }

function getAward(gradeList, totalPts) {
  const letters = gradeList.map(g => g.letter);
  if (letters.some(l => l === "NI")) return "Fail";
  if (letters.every(l => ["A","B","C"].includes(l)) && totalPts >= 21) return "Gold";
  if (letters.every(l => ["A","B","C","D"].includes(l)) && totalPts >= 15) return "Silver";
  if (letters.every(l => ["A","B","C","D","E"].includes(l)) && totalPts >= 6) return "Bronze";
  return "Fail";
}

function secToDisplay(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m}:${String(sec).padStart(2,"0")}`;
}

function stationLabel(key, age, gender) {
  const a = parseInt(age);
  if (key === "situps")  return "Sit-ups (reps / min)";
  if (key === "sbj")     return "Standing Broad Jump (cm)";
  if (key === "sar")     return "Sit & Reach (cm)";
  if (key === "pullups") return (gender === "male" && a >= 15) ? "Pull-ups (reps / 30 s)" : "Inclined Pull-ups (reps / 30 s)";
  if (key === "shuttle") return "4 × 10 m Shuttle Run (sec)";
  if (key === "run")     return a <= 13 ? "1.6 km Run-Walk (min : sec)" : "2.4 km Run-Walk (min : sec)";
  return key;
}

function stationShort(key) {
  return { situps:"Sit-ups", sbj:"Broad Jump", sar:"Sit & Reach", pullups:"Pull-ups", shuttle:"Shuttle", run:"Run-Walk" }[key] ?? key;
}

// ─── SEGMENTED BAR CHART ─────────────────────────────────────────────────────
// One continuous bar split into 5 colour bands (A–E).
// A white triangle marker drops from above to show the user's result.
// Higher-is-better: left = fail zone, right = A zone
// Lower-is-better:  left = A zone, right = fail zone

function SegmentedBar({ thresholds, userValue, lowerBetter, formatTick, dark }) {
  const W = 400;
  const BAR_H  = 32;
  const TICK_H = 14;
  const LABEL_H = 14;
  const MARKER_ABOVE = 10;
  const SVG_H = MARKER_ABOVE + BAR_H + TICK_H + LABEL_H + 4;

  // Domain: extend 10% beyond outer edges
  const rawMin  = Math.min(...thresholds);
  const rawMax  = Math.max(...thresholds);
  const span    = rawMax - rawMin || 1;
  const domMin  = rawMin - span * 0.12;
  const domMax  = rawMax + span * 0.12;
  const domSpan = domMax - domMin;

  // For lower-is-better, flip the axis so A (fast/low) is on the right
  const toX = v => lowerBetter
    ? ((domMax - v) / domSpan) * W
    : ((v - domMin) / domSpan) * W;

  const clampX = x => Math.max(0, Math.min(W, x));

  // Boundaries by grade name
  const B = { E: thresholds[0], D: thresholds[1], C: thresholds[2], B: thresholds[3], A: thresholds[4] };

  // Segments: always E on the left, A on the right
  // lowerBetter axis is flipped, so "left" means higher domain value (slower = worse)
  const segments = lowerBetter
    ? [
        { grade:"E", left: domMax,  right: B.D  },
        { grade:"D", left: B.D,     right: B.C  },
        { grade:"C", left: B.C,     right: B.B  },
        { grade:"B", left: B.B,     right: B.A  },
        { grade:"A", left: B.A,     right: domMin },
      ]
    : [
        { grade:"E", left: domMin,  right: B.D },
        { grade:"D", left: B.D,     right: B.C },
        { grade:"C", left: B.C,     right: B.B },
        { grade:"B", left: B.B,     right: B.A },
        { grade:"A", left: B.A,     right: domMax },
      ];

  // Tick values: left→right always reads E boundary → A boundary
  const tickVals = [B.E, B.D, B.C, B.B, B.A];

  const hasUser = userValue !== null && userValue !== undefined && !isNaN(userValue);
  const markerX = hasUser ? clampX(toX(userValue)) : null;
  const markerY = MARKER_ABOVE; // top of bar

  const barTrackBg = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <div style={{ width:"100%" }}>
      <svg
        viewBox={`0 0 ${W} ${SVG_H}`}
        width="100%"
        style={{ display:"block", overflow:"visible" }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* ── Bar track background ── */}
        <rect x={0} y={MARKER_ABOVE} width={W} height={BAR_H} fill={barTrackBg} />

        {/* ── Grade band segments ── */}
        {segments.map(seg => {
          const x1 = toX(seg.left);
          const x2 = toX(seg.right);
          const w  = Math.max(0, x2 - x1);
          return (
            <rect
              key={seg.grade}
              x={x1} y={MARKER_ABOVE}
              width={w} height={BAR_H}
              fill={GRADE_COLORS[seg.grade]}
              opacity={0.8}
            />
          );
        })}

        {/* ── Grade letters inside bands ── */}
        {segments.map(seg => {
          const x1 = toX(seg.left);
          const x2 = toX(seg.right);
          const cx = (x1 + x2) / 2;
          const w  = x2 - x1;
          if (w < 16) return null;
          return (
            <text
              key={`lbl-${seg.grade}`}
              x={cx} y={MARKER_ABOVE + BAR_H / 2 + 5}
              textAnchor="middle"
              fill="#fff" fontSize={13} fontWeight={700}
              style={{ pointerEvents:"none", userSelect:"none" }}
            >
              {seg.grade}
            </text>
          );
        })}

        {/* ── Boundary tick lines ── */}
        {tickVals.map((v, i) => {
          const x = toX(v);
          return (
            <line
              key={`tl-${i}`}
              x1={x} y1={MARKER_ABOVE + BAR_H}
              x2={x} y2={MARKER_ABOVE + BAR_H + TICK_H * 0.55}
              stroke="rgba(255,255,255,0.25)" strokeWidth={1}
            />
          );
        })}

        {/* ── Boundary tick labels ── */}
        {tickVals.map((v, i) => {
          const x = toX(v);
          return (
            <text
              key={`tl-lbl-${i}`}
              x={x} y={MARKER_ABOVE + BAR_H + TICK_H + LABEL_H - 2}
              textAnchor="middle"
              fill="#6b7280" fontSize={9.5}
              style={{ userSelect:"none" }}
            >
              {formatTick(v)}
            </text>
          );
        })}

        {/* ── User marker (triangle + stem) ── */}
        {hasUser && (
          <g>
            {/* Stem from top down into bar */}
            <line
              x1={markerX} y1={0}
              x2={markerX} y2={MARKER_ABOVE + BAR_H + TICK_H}
              stroke="#ffffff" strokeWidth={2}
            />
            {/* Downward-pointing triangle at top */}
            <polygon
              points={`${markerX - 6},0 ${markerX + 6},0 ${markerX},${MARKER_ABOVE}`}
              fill="#ffffff"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

// ─── THRESHOLD TABLE ──────────────────────────────────────────────────────────

function ThresholdTable({ stationKey, thresholds, lowerBetter, formatTick, T }) {
  // A grade: display the original PDF boundary (stored threshold is one step stricter)
  // Higher-is-better: stored A = PDF_value + 1, so display = stored - 1
  // Lower-is-better shuttle: stored A = PDF_value - 0.1, so display = stored + 0.1
  // Lower-is-better run: stored A = PDF_value - 1, so display = stored + 1
  const aDisplayVal = (key, val) => {
    if (!lowerBetter) return val - 1;
    if (key === "run") return val + 1;
    return parseFloat((val + 0.1).toFixed(1));
  };
  const rows = lowerBetter
    ? [
        { grade:"A", pts:5, band:"Outstanding",  op:"<",  val: aDisplayVal(stationKey, thresholds[4]) },
        { grade:"B", pts:4, band:"Very Good",    op:"≤",  val: thresholds[3] },
        { grade:"C", pts:3, band:"Good",         op:"≤",  val: thresholds[2] },
        { grade:"D", pts:2, band:"Good",         op:"≤",  val: thresholds[1] },
        { grade:"E", pts:1, band:"Satisfactory", op:"≤",  val: thresholds[0] },
      ]
    : [
        { grade:"A", pts:5, band:"Outstanding",  op:">",  val: aDisplayVal(stationKey, thresholds[4]) },
        { grade:"B", pts:4, band:"Very Good",    op:"≥",  val: thresholds[3] },
        { grade:"C", pts:3, band:"Good",         op:"≥",  val: thresholds[2] },
        { grade:"D", pts:2, band:"Good",         op:"≥",  val: thresholds[1] },
        { grade:"E", pts:1, band:"Satisfactory", op:"≥",  val: thresholds[0] },
      ];
  return (
    <div style={{ overflowX:"auto" }}>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ borderBottom:`1px solid ${T.divider}` }}>
            {["Grade","Band","Pts","Min. Threshold"].map(h => (
              <th key={h} style={{ textAlign:"left", padding:"4px 8px", color: T.textMuted, fontWeight:500 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.grade} style={{ borderBottom:`1px solid ${T.divider}` }}>
              <td style={{ padding:"5px 8px" }}>
                <span style={{ color:GRADE_COLORS[r.grade], fontWeight:700, fontSize:13 }}>{r.grade}</span>
              </td>
              <td style={{ padding:"5px 8px", color: T.textDim }}>{r.band}</td>
              <td style={{ padding:"5px 8px", color: T.textDim, fontFamily:"monospace" }}>{r.pts}</td>
              <td style={{ padding:"5px 8px", color: T.text, fontFamily:"monospace" }}>{r.op} {formatTick(r.val)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function NAPFACalculator() {
  document.title = 'NAPFA Calculator';
  const [dark, setDark] = useState(true);

  const T = {
    bg:        dark ? '#0f0f1a'                    : '#f4f4fc',
    headerBg:  dark ? '#13132a'                    : '#eeeef8',
    card:      dark ? '#1e1e32'                    : '#ffffff',
    border:    dark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.09)',
    border2:   dark ? 'rgba(255,255,255,0.1)'      : 'rgba(0,0,0,0.12)',
    text:      dark ? '#e8e8f0'                    : '#1a1a2e',
    textMuted: dark ? '#6b6b80'                    : '#6868a0',
    textDim:   dark ? '#a0a0b8'                    : '#4a4a6a',
    accent:    '#6366f1',
    accentSoft:dark ? 'rgba(99,102,241,0.1)'       : 'rgba(99,102,241,0.08)',
    accentText:dark ? '#a0a0b8'                    : '#6366f1',
    inputBg:   dark ? 'rgba(255,255,255,0.05)'     : '#fafafe',
    inputBorder: dark ? 'rgba(255,255,255,0.1)'    : 'rgba(0,0,0,0.12)',
    divider:   dark ? 'rgba(255,255,255,0.06)'     : 'rgba(0,0,0,0.07)',
  };

  const [age, setAge]               = useState("9");
  const [gender, setGender]         = useState("male");
  const [schoolLevel, setSchoolLevel] = useState("primary");
  const [vals, setVals] = useState({
    situps:"", sbj:"", sar:"", pullups:"", shuttle:"",
    run:{ min:"", sec:"" },
  });

  const effectiveLevel = useMemo(() => {
    const a = parseInt(age);
    if (schoolLevel === "secondary" && a < 12) return "primary";
    if (schoolLevel === "primary"   && a > 15) return "secondary";
    return schoolLevel;
  }, [age, schoolLevel]);

  const standards = useMemo(
    () => getStandards(age, gender, effectiveLevel),
    [age, gender, effectiveLevel]
  );

  const numericVals = useMemo(() => {
    const r = {};
    STATION_KEYS.forEach(key => {
      if (key === "run") {
        const { min: m, sec: s } = vals.run;
        r[key] = (m === "" && s === "") ? null : parseInt(m || 0) * 60 + parseInt(s || 0);
      } else if (key === "shuttle") {
        r[key] = vals.shuttle === "" ? null : parseFloat(vals.shuttle);
      } else {
        r[key] = vals[key] === "" ? null : parseInt(vals[key]);
      }
    });
    return r;
  }, [vals]);

  const grades = useMemo(() => {
    const result = {};
    STATION_KEYS.forEach(key => {
      if (!standards) { result[key] = null; return; }
      const lb = key === "shuttle" || key === "run";
      const nv = numericVals[key];
      if (nv === null || isNaN(nv)) { result[key] = null; return; }
      const idx    = gradeIndex(nv, standards[key], lb);
      const letter = gradeFromIndex(idx);
      result[key]  = { letter, points: idx === -1 ? 0 : GRADE_POINTS[letter] };
    });
    return result;
  }, [numericVals, standards]);

  const filledGrades = STATION_KEYS.map(k => grades[k]).filter(Boolean);
  const totalPoints  = filledGrades.reduce((s, g) => s + g.points, 0);
  const allFilled    = filledGrades.length === 6;
  const award        = allFilled ? getAward(filledGrades, totalPoints) : null;

  const setVal = (key, v) => setVals(p => ({ ...p, [key]: v }));

  const makeFmt = key => v => {
    if (key === "run")     return secToDisplay(v);
    if (key === "shuttle") return v.toFixed(1) + "s";
    if (key === "sbj" || key === "sar") return v + " cm";
    return String(v);
  };

  // ── Shared styles ──
  const inp = {
    width:"100%", background: T.inputBg,
    border: `1px solid ${T.inputBorder}`, borderRadius:6,
    padding:"9px 10px", color: T.text, fontSize:14,
    outline:"none", boxSizing:"border-box",
  };
  const lbl  = { display:"block", color: T.textMuted, fontSize:11, marginBottom:4 };
  const card = { background: T.card, borderRadius:10, padding:16, border: `1px solid ${T.border}` };
  const secH = { margin:"0 0 14px", fontSize:11, color: T.textMuted, textTransform:"uppercase", letterSpacing:"0.6px", fontWeight:600 };

  return (
    <div style={{ minHeight:"100vh", background: T.bg, color: T.text, fontFamily:"system-ui,-apple-system,sans-serif", paddingBottom:60 }}>

      {/* Header */}
      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}`, padding: "16px 16px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
            <a href="../../" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:`1px solid ${T.border2}`,background:T.card,color:T.textMuted,fontSize:12,fontFamily:'inherit',textDecoration:'none' }}>⌂ Home</a>
            <button onClick={() => setDark(d => !d)} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'5px 12px',borderRadius:8,border:`1px solid ${T.border2}`,background:T.card,color:T.textMuted,fontSize:12,fontFamily:'inherit',cursor:'pointer' }}>{dark ? '☀ Light' : '☾ Dark'}</button>
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.3px", color: T.text }}>NAPFA Calculator</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: T.textMuted }}>National Physical Fitness Award · Singapore</p>
        </div>
      </div>

      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px" }}>

        {effectiveLevel !== schoolLevel && (
          <div style={{ background: T.accentSoft, border:"1px solid rgba(99,102,241,0.3)", borderRadius:8, padding:"8px 14px", marginBottom:16, fontSize:12, color: T.accentText }}>
            ℹ️ Using <strong style={{ color: T.text }}>{effectiveLevel}</strong> standards for age {age}.
          </div>
        )}

        {/* ══ SECTION 1: INPUTS ══ */}
        <div style={{ ...card, marginBottom:20 }}>
          <p style={secH}>Profile &amp; Results</p>

          {/* Profile */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:18 }}>
            <div>
              <label style={lbl}>Age</label>
              <select value={age} onChange={e => setAge(e.target.value)} style={inp}>
                {Array.from({length:11},(_,i)=>i+9).map(a=>(
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} style={inp}>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Level</label>
              <select value={schoolLevel} onChange={e => setSchoolLevel(e.target.value)} style={inp}>
                <option value="primary">Primary</option>
                <option value="secondary">Secondary</option>
              </select>
            </div>
          </div>

          <div style={{ borderTop:`1px solid ${T.divider}`, marginBottom:16 }} />

          {/* Station inputs 2-column grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>

            <div>
              <label style={lbl}>{stationLabel("situps", age, gender)}</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 30" value={vals.situps}
                onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("situps",v); }} style={inp} />
            </div>

            <div>
              <label style={lbl}>{stationLabel("sbj", age, gender)}</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 165" value={vals.sbj}
                onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("sbj",v); }} style={inp} />
            </div>

            <div>
              <label style={lbl}>{stationLabel("sar", age, gender)}</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 32" value={vals.sar}
                onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("sar",v); }} style={inp} />
            </div>

            <div>
              <label style={lbl}>{stationLabel("pullups", age, gender)}</label>
              <input type="text" inputMode="numeric" placeholder="e.g. 8" value={vals.pullups}
                onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("pullups",v); }} style={inp} />
            </div>

            <div>
              <label style={lbl}>{stationLabel("shuttle", age, gender)}</label>
              <input type="text" inputMode="decimal" placeholder="e.g. 11.5" value={vals.shuttle}
                onChange={e => { const v=e.target.value; if(v===""||/^\d*\.?\d*$/.test(v)) setVal("shuttle",v); }} style={inp} />
            </div>

            <div>
              <label style={lbl}>{stationLabel("run", age, gender)}</label>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <input type="text" inputMode="numeric" placeholder="min" value={vals.run.min}
                  onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("run",{...vals.run,min:v}); }}
                  style={{ ...inp, textAlign:"center", background:"transparent", color: T.text }} />
                <span style={{ color: T.textMuted, fontWeight:700, fontSize:18, flexShrink:0 }}>:</span>
                <input type="text" inputMode="numeric" placeholder="sec" value={vals.run.sec}
                  onChange={e => { const v=e.target.value; if(v===""||/^\d*$/.test(v)) setVal("run",{...vals.run,sec:v}); }}
                  style={{ ...inp, textAlign:"center", background:"transparent", color: T.text }} />
              </div>
            </div>

          </div>
        </div>

        {/* ══ SECTION 2: RESULTS SUMMARY ══ */}
        {filledGrades.length > 0 && (
          <div style={{ ...card, marginBottom:20 }}>
            <p style={secH}>Results</p>

            {allFilled && award && (
              <div style={{ background:AWARD_BG[award], border:`1px solid ${AWARD_COLORS[award]}50`, borderRadius:8, padding:"14px 16px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <p style={{ margin:0, fontSize:11, color: T.textDim, textTransform:"uppercase", letterSpacing:"0.5px" }}>Overall Award</p>
                  <p style={{ margin:"4px 0 0", fontSize:28, fontWeight:800, color:AWARD_COLORS[award], letterSpacing:"-0.5px" }}>{award}</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ margin:0, fontSize:11, color: T.textMuted }}>Total Points</p>
                  <p style={{ margin:"2px 0 0", fontSize:30, fontWeight:700, fontFamily:"monospace", color: T.text }}>
                    {totalPoints}<span style={{ fontSize:14, color: T.textMuted }}> / 30</span>
                  </p>
                </div>
              </div>
            )}

            {/* NI warning — show if any filled station is NI */}
            {STATION_KEYS.some(k => grades[k]?.letter === "NI") && (
              <div style={{ background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:12, color:"#fca5a5" }}>
                <strong>NI = Needs Improvement</strong> — result is below the minimum for Grade E.
                A station graded NI means the overall award is <strong>Fail</strong>, regardless of other scores.
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {STATION_KEYS.map(key => {
                const g = grades[key];
                const isNI = g?.letter === "NI";
                return (
                  <div key={key} style={{ background: T.inputBg, borderRadius:8, padding:"10px 8px", textAlign:"center", border: isNI ? "1px solid rgba(239,68,68,0.4)" : `1px solid ${T.border}` }}>
                    <p style={{ margin:0, fontSize:10, color: T.textMuted }}>{stationShort(key)}</p>
                    <p style={{ margin:"4px 0 0", fontSize:22, fontWeight:700, lineHeight:1, color: g ? GRADE_COLORS[g.letter] : T.divider }}>
                      {g ? g.letter : "—"}
                    </p>
                    {isNI
                      ? <p style={{ margin:"2px 0 0", fontSize:9, color:"#ef4444" }}>Needs Improvement</p>
                      : <p style={{ margin:"2px 0 0", fontSize:10, color: T.textMuted }}>{g ? `${g.points} pt` : ""}</p>
                    }
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop:`1px solid ${T.divider}`, marginTop:14, paddingTop:12 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6, marginBottom:8 }}>
                {[{a:"Gold",r:"C+ in all · ≥21 pts"},{a:"Silver",r:"D+ in all · ≥15 pts"},{a:"Bronze",r:"E+ in all · ≥6 pts"}].map(x=>(
                  <div key={x.a} style={{ textAlign:"center" }}>
                    <p style={{ margin:0, fontSize:12, fontWeight:700, color:AWARD_COLORS[x.a] }}>{x.a}</p>
                    <p style={{ margin:"2px 0 0", fontSize:10, color: T.textMuted }}>{x.r}</p>
                  </div>
                ))}
              </div>
              <p style={{ margin:0, fontSize:10, color: T.textMuted, textAlign:"center" }}>
                Any station graded <span style={{ color:"#ef4444", fontWeight:600 }}>NI</span> (below Grade E) = automatic <span style={{ color:"#ef4444", fontWeight:600 }}>Fail</span>
              </p>
            </div>
          </div>
        )}

        {/* ══ SECTION 3: REFERENCE CHARTS ══ */}
        {standards && (
          <div style={card}>
            <p style={secH}>
              Reference Charts — Age {age} · {gender === "male" ? "Male" : "Female"} · {effectiveLevel === "primary" ? "Primary" : "Secondary"}
            </p>

            <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
              {STATION_KEYS.map((key, i) => {
                const lb  = key === "shuttle" || key === "run";
                const fmt = makeFmt(key);
                const nv  = numericVals[key];
                const g   = grades[key];
                return (
                  <div key={key}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color: T.text }}>
                        {stationLabel(key, age, gender)}
                      </p>
                      {g && (
                        <span style={{ fontSize:13, fontWeight:700, color:GRADE_COLORS[g.letter] }}>
                          {g.letter} · {g.points} pt{g.points !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <SegmentedBar
                      thresholds={standards[key]}
                      userValue={nv}
                      lowerBetter={lb}
                      formatTick={fmt}
                      dark={dark}
                    />

                    <div style={{ marginTop:12 }}>
                      <ThresholdTable stationKey={key} thresholds={standards[key]} lowerBetter={lb} formatTick={fmt} T={T} />
                    </div>

                    {i < STATION_KEYS.length - 1 && (
                      <div style={{ borderTop:`1px solid ${T.divider}`, marginTop:24 }} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p style={{ marginTop:20, textAlign:"center", fontSize:11, color: T.textMuted }}>
          Based on MOE NAPFA standards · Data sourced from official school fitness assessment tables
        </p>
      </div>
    </div>
  );
}
