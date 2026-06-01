import { useState, useMemo, useCallback, useRef } from "react";

/* ── risk tokens ── */
const RISK = {
  optimal: { label: "Optimal", color: "#34d399", bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.22)" },
  normal:  { label: "Normal",  color: "#34d399", bg: "rgba(52,211,153,0.07)", border: "rgba(52,211,153,0.22)" },
  borderline: { label: "Borderline", color: "#fbbf24", bg: "rgba(251,191,36,0.07)", border: "rgba(251,191,36,0.22)" },
  elevated:   { label: "Elevated",   color: "#f97316", bg: "rgba(249,115,22,0.07)", border: "rgba(249,115,22,0.22)" },
  high:    { label: "High",    color: "#ef4444", bg: "rgba(239,68,68,0.07)",  border: "rgba(239,68,68,0.22)" },
  low:     { label: "Low",     color: "#60a5fa", bg: "rgba(96,165,250,0.07)", border: "rgba(96,165,250,0.22)" },
  veryHigh:{ label: "Very High",color:"#dc2626", bg: "rgba(220,38,38,0.09)", border: "rgba(220,38,38,0.28)" },
};

/* ── conversions ── */
const CHOL_F = 38.67, TRIG_F = 88.57, GLUC_F = 18.02;
function toMmol(v, f) { return v / f; }

/* ── calculations ── */
function getAge(y) { return y ? new Date().getFullYear() - y : null; }
function calcBMI(h, w) { if (!h || !w) return null; return w / ((h / 100) ** 2); }
function bmiRisk(b, asian) {
  if (asian) { if (b < 18.5) return { ...RISK.low, label: "Underweight" }; if (b < 23) return { ...RISK.optimal, label: "Normal" }; if (b < 27.5) return { ...RISK.borderline, label: "Overweight" }; return { ...RISK.high, label: "Obese" }; }
  if (b < 18.5) return { ...RISK.low, label: "Underweight" }; if (b < 25) return { ...RISK.optimal, label: "Normal" }; if (b < 30) return { ...RISK.borderline, label: "Overweight" }; return { ...RISK.high, label: "Obese" };
}
function calcWHR(w, h) { return (w && h) ? w / h : null; }
function whrRisk(r) { if (r < 0.4) return { ...RISK.low, label: "Low" }; if (r < 0.5) return RISK.optimal; if (r < 0.6) return { ...RISK.borderline, label: "Increased" }; return { ...RISK.high, label: "High Risk" }; }
function bpCat(s, d) { if (!s || !d) return null; if (s < 120 && d < 80) return RISK.optimal; if (s < 130 && d < 85) return RISK.normal; if (s < 140 && d < 90) return { ...RISK.borderline, label: "High-Normal" }; if (s < 160 && d < 100) return { ...RISK.elevated, label: "Stage 1 HTN" }; return { ...RISK.high, label: "Stage 2 HTN" }; }
function tcRisk(t) { if (!t) return null; if (t < 5.2) return RISK.optimal; if (t < 6.2) return RISK.borderline; return RISK.high; }
function hdlRisk(h, g) { if (!h) return null; const lo = g === "female" ? 1.3 : 1.0; if (h >= 1.55) return RISK.optimal; if (h >= lo) return RISK.normal; return RISK.high; }
function ldlRisk(l) { if (!l) return null; if (l < 2.6) return RISK.optimal; if (l < 3.4) return RISK.normal; if (l < 4.1) return RISK.borderline; if (l < 4.9) return RISK.elevated; return RISK.high; }
function trigRisk(t) { if (!t) return null; if (t < 1.7) return RISK.optimal; if (t < 2.3) return RISK.borderline; if (t < 5.6) return RISK.elevated; return RISK.veryHigh; }
function nonHDL(tc, h) { return (tc && h) ? tc - h : null; }
function nonHDLRisk(v) { if (v < 3.4) return RISK.optimal; if (v < 4.1) return RISK.borderline; if (v < 4.9) return RISK.elevated; return RISK.high; }
function tcHDL(tc, h) { return (tc && h) ? tc / h : null; }
function tcHDLRisk(r, g) { if (g === "male") { if (r < 3.5) return RISK.optimal; if (r < 5) return RISK.normal; if (r < 6) return RISK.borderline; return RISK.high; } if (r < 3) return RISK.optimal; if (r < 4.5) return RISK.normal; if (r < 5.5) return RISK.borderline; return RISK.high; }
function trigHDL(t, h) { return (t && h) ? t / h : null; }
function trigHDLRisk(r) { if (r < 1) return RISK.optimal; if (r < 2) return RISK.normal; if (r < 3.5) return RISK.borderline; return RISK.high; }
function vldlEst(t) { return t ? t / 2.2 : null; }
function vldlRisk(v) { if (v < 0.78) return RISK.optimal; if (v < 1.04) return RISK.borderline; return RISK.high; }
function aip(t, h) { return (t && h) ? Math.log10(t / h) : null; }
function aipRisk(v) { if (v < 0.11) return { ...RISK.optimal, label: "Low Risk" }; if (v < 0.21) return { ...RISK.borderline, label: "Intermediate" }; return { ...RISK.high, label: "High Risk" }; }
function glucRiskFasting(g) { if (!g) return null; if (g < 5.6) return RISK.normal; if (g < 7) return { ...RISK.borderline, label: "Prediabetic" }; return { ...RISK.high, label: "Diabetic Range" }; }
function glucRiskRandom(g) { if (!g) return null; if (g < 7.8) return RISK.normal; if (g < 11.1) return { ...RISK.borderline, label: "Impaired" }; return { ...RISK.high, label: "Diabetic Range" }; }
function hba1cRisk(h) { if (!h) return null; if (h < 5.7) return RISK.normal; if (h < 6.5) return { ...RISK.borderline, label: "Prediabetic" }; return { ...RISK.high, label: "Diabetic Range" }; }

/* ── sub-components ── */
function Toggle({ label, active, onToggle, style: sx }) {
  return (
    <button onClick={onToggle} style={{
      display: "inline-flex", alignItems: "center", gap: 7,
      background: active ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)",
      border: `1.5px solid ${active ? "rgba(99,102,241,0.45)" : "rgba(255,255,255,0.07)"}`,
      borderRadius: 7, padding: "5px 12px", fontSize: 11, fontWeight: 600,
      color: active ? "#a5b4fc" : "#64748b", cursor: "pointer", transition: "all 0.15s", ...sx,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#818cf8" : "#475569", flexShrink: 0 }} />
      {label}
    </button>
  );
}

function MetricCard({ title, value, unit, risk, what, ranges }) {
  return (
    <div style={{
      background: risk.bg, border: `1px solid ${risk.border}`, borderRadius: 14,
      padding: "16px 18px",
      display: "grid",
      gridTemplateColumns: "minmax(140px, 180px) 1fr",
      gap: 18,
      alignItems: "flex-start",
    }}>
      {/* Left column — fixed width so all right columns start at the same point */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "normal", lineHeight: 1.4 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 5, flexWrap: "wrap" }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: risk.color, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</span>
          {unit && <span style={{ fontSize: 11, color: "#64748b" }}>{unit}</span>}
        </div>
        <span style={{
          alignSelf: "flex-start", background: `${risk.color}22`, color: risk.color,
          fontSize: 9.5, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
          letterSpacing: "0.04em", textTransform: "uppercase", border: `1px solid ${risk.color}44`,
        }}>{risk.label}</span>
      </div>
      {/* Right column — description, always starts at the same horizontal position */}
      <div style={{ display: "flex", flexDirection: "column", gap: 5, paddingTop: 2, minWidth: 0 }}>
        {what && <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.55 }}>{what}</div>}
        {ranges && <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5, marginTop: 2, padding: "6px 10px", background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.04)" }}>{ranges}</div>}
      </div>
    </div>
  );
}

function InputField({ field, value, onChange, unit }) {
  const suf = (field.lipid || field.isTrig) ? ` (${unit === "mgdl" ? "mg/dL" : "mmol/L"})` : field.isGluc ? ` (${unit === "mgdl" ? "mg/dL" : "mmol/L"})` : "";
  const base = {
    width: "100%", padding: "8px 11px", border: "1.5px solid rgba(255,255,255,0.08)",
    borderRadius: 7, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(255,255,255,0.04)", color: "#e2e8f0", outline: "none",
    transition: "border-color 0.15s", boxSizing: "border-box",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{field.label}{suf}</label>
      {field.type === "select" ? (
        <select style={{ ...base, cursor: "pointer" }} value={value} onChange={e => onChange(field.key, e.target.value)}>
          {field.opts.map(o => <option key={o.v} value={o.v} style={{ background: "#1e1e2e" }}>{o.l}</option>)}
        </select>
      ) : (
        <input type="number" style={base}
          placeholder={field.ph || ((field.lipid || field.isTrig || field.isGluc) ? (unit === "mgdl" ? "mg/dL" : "mmol/L") : "")}
          step={field.step || "1"} value={value} onChange={e => onChange(field.key, e.target.value)}
          onFocus={e => e.target.style.borderColor = "#6366f1"}
          onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
      )}
    </div>
  );
}

function SectionHeader({ title, children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8, paddingBottom: 5, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.1em" }}>{title}</div>
      {children}
    </div>
  );
}

/* ── Summary bar ── */
function SummaryBar({ counts, total }) {
  if (total === 0) return null;
  const green = counts.green, yellow = counts.yellow, red = counts.red;
  const other = total - green - yellow - red;
  return (
    <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 99, overflow: "hidden", marginBottom: 16 }}>
      {green > 0  && <div style={{ flex: green,  background: "#34d399", borderRadius: 99, transition: "flex 0.4s" }} />}
      {yellow > 0 && <div style={{ flex: yellow, background: "#fbbf24", borderRadius: 99, transition: "flex 0.4s" }} />}
      {red > 0    && <div style={{ flex: red,    background: "#ef4444", borderRadius: 99, transition: "flex 0.4s" }} />}
      {other > 0  && <div style={{ flex: other,  background: "#334155", borderRadius: 99, transition: "flex 0.4s" }} />}
    </div>
  );
}

/* ── field definitions ── */
const FIELDS_BASIC = [
  { key: "yearOfBirth", label: "Year of Birth", ph: "e.g. 1985", type: "number" },
  { key: "gender", label: "Gender", type: "select", opts: [{ v: "", l: "Select..." }, { v: "male", l: "Male" }, { v: "female", l: "Female" }] },
];
const FIELDS_BODY = [
  { key: "height", label: "Height (cm)", ph: "e.g. 170", type: "number", step: "0.1" },
  { key: "weight", label: "Weight (kg)", ph: "e.g. 70",  type: "number", step: "0.1" },
  { key: "waist",  label: "Waist (cm)",  ph: "e.g. 80",  type: "number", step: "0.1" },
];
const FIELDS_BP = [
  { key: "systolic",  label: "Systolic (mmHg)",  ph: "e.g. 120", type: "number" },
  { key: "diastolic", label: "Diastolic (mmHg)", ph: "e.g. 80",  type: "number" },
];
const FIELDS_LIPID = [
  { key: "totalChol",     label: "Total Cholesterol", type: "number", step: "0.01", lipid: true },
  { key: "hdl",           label: "HDL Cholesterol",   type: "number", step: "0.01", lipid: true },
  { key: "triglycerides", label: "Triglycerides",      type: "number", step: "0.01", isTrig: true },
];
const FIELDS_GLUC_FASTING  = [
  { key: "glucose",        label: "Fasting Glucose",         type: "number", step: "0.01", isGluc: true },
  { key: "fastingInsulin", label: "Fasting Insulin (µIU/mL)", ph: "e.g. 8",   type: "number", step: "0.1" },
  { key: "hba1c",          label: "HbA1c (%)",               ph: "e.g. 5.4", type: "number", step: "0.1" },
];
const FIELDS_GLUC_RANDOM = [
  { key: "glucose", label: "Non-Fasting Glucose", type: "number", step: "0.01", isGluc: true },
  { key: "hba1c",   label: "HbA1c (%)",           ph: "e.g. 5.4", type: "number", step: "0.1" },
];
const FIELDS_LIVER = [
  { key: "alt", label: "ALT (U/L)", ph: "e.g. 25", type: "number", step: "0.1" },
  { key: "ast", label: "AST (U/L)", ph: "e.g. 22", type: "number", step: "0.1" },
  { key: "ggt", label: "GGT (U/L)", ph: "e.g. 30", type: "number", step: "0.1" },
];

/* ─────────────────────────────────────────────
   PDF generation — printer-friendly light theme
───────────────────────────────────────────── */
function generatePDF(metrics, userName, assessDate, counts) {
  // Light-theme colour map: coloured left border + tinted bg, black text for print
  const riskPrint = {
    "#34d399": { accent: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
    "#fbbf24": { accent: "#d97706", bg: "#fffbeb", border: "#fde68a" },
    "#f97316": { accent: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
    "#ef4444": { accent: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    "#dc2626": { accent: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
    "#60a5fa": { accent: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  };

  const badge = (risk) => {
    const c = riskPrint[risk.color] || { accent: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
    return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:9px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;background:${c.bg};color:${c.accent};border:1px solid ${c.border}">${risk.label}</span>`;
  };

  const cards = metrics.map(m => {
    const c = riskPrint[m.risk.color] || { accent: "#475569", bg: "#f8fafc", border: "#e2e8f0" };
    return `
      <div style="background:${c.bg};border:1px solid ${c.border};border-left:4px solid ${c.accent};border-radius:8px;padding:12px 14px;margin-bottom:9px;page-break-inside:avoid">
        <div style="display:flex;gap:14px;align-items:flex-start">
          <div style="min-width:115px;flex-shrink:0">
            <div style="font-size:9px;font-weight:700;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:3px">${m.title}</div>
            <div style="font-size:20px;font-weight:700;color:${c.accent};font-family:monospace;line-height:1;margin-bottom:5px">
              ${m.value}${m.unit ? `<span style="font-size:10px;color:#94a3b8;margin-left:3px">${m.unit}</span>` : ""}
            </div>
            ${badge(m.risk)}
          </div>
          <div style="flex:1;padding-top:1px">
            ${m.what   ? `<div style="font-size:11px;color:#334155;line-height:1.6;margin-bottom:4px">${m.what}</div>` : ""}
            ${m.ranges ? `<div style="font-size:10px;color:#64748b;line-height:1.5;padding:4px 8px;background:#fff;border-radius:4px;border:1px solid #e2e8f0">${m.ranges}</div>` : ""}
          </div>
        </div>
      </div>`;
  }).join("");

  const greenCount = counts.green, yellowCount = counts.yellow, redCount = counts.red;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Health Assessment${userName ? ` — ${userName}` : ""}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #ffffff;
    color: #1e293b;
    font-family: 'DM Sans', 'Segoe UI', sans-serif;
    padding: 36px 40px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page { size: A4; margin: 14mm 12mm; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

  <!-- Header -->
  <div style="margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:8px">
    <div>
      <div style="font-size:9px;font-weight:700;color:#6366f1;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:4px">Health Dashboard</div>
      <div style="font-size:20px;font-weight:700;color:#0f172a">Basic Health Assessment</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#64748b;line-height:1.7">
      ${userName ? `<div><strong style="color:#334155">${userName}</strong></div>` : ""}
      <div>${assessDate || new Date().toISOString().split("T")[0]}</div>
    </div>
  </div>

  <!-- Summary row -->
  <div style="display:flex;gap:10px;margin-bottom:18px;flex-wrap:wrap">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 16px;text-align:center;min-width:70px">
      <div style="font-size:20px;font-weight:700;color:#16a34a;font-family:monospace">${greenCount}</div>
      <div style="font-size:9px;font-weight:700;color:#16a34a;text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Optimal</div>
    </div>
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px 16px;text-align:center;min-width:70px">
      <div style="font-size:20px;font-weight:700;color:#d97706;font-family:monospace">${yellowCount}</div>
      <div style="font-size:9px;font-weight:700;color:#d97706;text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Borderline</div>
    </div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;text-align:center;min-width:70px">
      <div style="font-size:20px;font-weight:700;color:#dc2626;font-family:monospace">${redCount}</div>
      <div style="font-size:9px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">Attention</div>
    </div>
  </div>

  <!-- Metric cards -->
  ${cards}

  <!-- Disclaimer -->
  <div style="margin-top:16px;padding:9px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0">
    <p style="font-size:9.5px;color:#64748b;line-height:1.6">
      <strong style="color:#475569">Disclaimer:</strong> For informational purposes only — not medical advice.
      Reference ranges vary by laboratory, population, and individual risk factors.
      All lipid and glucose calculations use mmol/L internally.
      Consult a healthcare professional for interpretation of your results.
    </p>
  </div>

  <!-- Print button — hidden when printing -->
  <div class="no-print" style="text-align:center;margin-top:28px">
    <p style="font-size:12px;color:#64748b;margin-bottom:12px">Open this file in your browser, then use the button below or Ctrl/Cmd+P and select "Save as PDF".</p>
    <button onclick="window.print()" style="background:#6366f1;border:none;border-radius:8px;padding:10px 28px;font-size:13px;font-weight:600;color:#fff;cursor:pointer;font-family:inherit">
      Print / Save as PDF
    </button>
  </div>
</body>
</html>`;

  // Download as .html file — user opens it in browser and uses Print → Save as PDF
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const namePart = userName ? userName.replace(/\s+/g, "_").toLowerCase() + "_" : "";
  const datePart = assessDate || new Date().toISOString().split("T")[0];
  a.href     = url;
  a.download = `health_report_${namePart}${datePart}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}


function insulinRisk(i) { if (!i) return null; if (i < 6) return { ...RISK.optimal, label: "Optimal" }; if (i <= 12) return RISK.normal; if (i <= 20) return RISK.borderline; return RISK.high; }
function homaIR(g, i) { return (g && i) ? (g * i) / 22.5 : null; }
function homaRisk(h) { if (!h) return null; if (h < 1) return RISK.optimal; if (h < 2) return RISK.normal; if (h < 2.5) return RISK.borderline; return RISK.high; }
function altRisk(v, g) { if (!v) return null; const hi = g === "female" ? 35 : 45; if (v <= hi * 0.5) return RISK.optimal; if (v <= hi) return RISK.normal; if (v <= hi * 2) return RISK.borderline; if (v <= hi * 5) return RISK.elevated; return RISK.high; }
function astRisk(v) { if (!v) return null; if (v <= 17) return RISK.optimal; if (v <= 34) return RISK.normal; if (v <= 68) return RISK.borderline; if (v <= 170) return RISK.elevated; return RISK.high; }
function ggtRisk(v, g) { if (!v) return null; const hi = g === "female" ? 36 : 55; if (v <= hi * 0.4) return RISK.optimal; if (v <= hi) return RISK.normal; if (v <= hi * 2) return RISK.borderline; if (v <= hi * 5) return RISK.elevated; return RISK.high; }
function astAltRatio(ast, alt) { return (ast && alt) ? ast / alt : null; }
function astAltRisk(r) { if (!r) return null; if (r < 0.8) return { ...RISK.low, label: "NAFLD Pattern" }; if (r <= 2) return { ...RISK.normal, label: "Normal" }; return { ...RISK.high, label: "Elevated (>2)" }; }

/* ── main ── */
export default function HealthAssessment() {
  const [inputs, setInputs] = useState({
    yearOfBirth: "", gender: "", height: "", weight: "", waist: "",
    systolic: "", diastolic: "",
    totalChol: "", hdl: "", triglycerides: "",
    glucose: "", fastingInsulin: "", hba1c: "",
    alt: "", ast: "", ggt: "",
  });
  const [userName, setUserName]     = useState("");
  const [assessDate, setAssessDate] = useState(new Date().toISOString().split("T")[0]);
  const [lipidUnit, setLipidUnit]   = useState("mmol");
  const [glucUnit, setGlucUnit]     = useState("mmol");
  const [asianBMI, setAsianBMI]     = useState(true);
  const [fasting, setFasting]       = useState(true);
  const [snapshotMsg, setSnapshotMsg] = useState("");
  const [pdfMsg, setPdfMsg]         = useState("");

  const set = useCallback((k, val) => setInputs(p => ({ ...p, [k]: val })), []);

  /* ── computed values ── */
  const v = useMemo(() => {
    const n = {};
    for (const k in inputs) {
      if (k === "gender") { n[k] = inputs[k]; continue; }
      const p = parseFloat(inputs[k]);
      n[k] = isNaN(p) ? null : p;
    }
    if (lipidUnit === "mgdl") { if (n.totalChol) n.totalChol = toMmol(n.totalChol, CHOL_F); if (n.hdl) n.hdl = toMmol(n.hdl, CHOL_F); if (n.triglycerides) n.triglycerides = toMmol(n.triglycerides, TRIG_F); }
    if (glucUnit  === "mgdl") { if (n.glucose)   n.glucose   = toMmol(n.glucose, GLUC_F); }
    return n;
  }, [inputs, lipidUnit, glucUnit]);

  /* ── metrics ── */
  const metrics = useMemo(() => {
    const m = [];
    const age = getAge(v.yearOfBirth);
    if (age !== null) m.push({ title: "Age", value: age, unit: "years", risk: { ...RISK.low, label: "Info" }, info: true,
      what: "Your current age, derived from year of birth. Age is a non-modifiable cardiovascular risk factor — risk increases with age, particularly above 45 for men and 55 for women." });

    const bmi = calcBMI(v.height, v.weight);
    if (bmi !== null) m.push({ title: "Body Mass Index (BMI)", value: bmi.toFixed(1), unit: "kg/m²", risk: bmiRisk(bmi, asianBMI),
      what: "A simple weight-to-height ratio used to screen for weight categories. It does not distinguish between muscle and fat mass, so should be interpreted alongside other measures like waist circumference.",
      ranges: asianBMI ? "Asian cut-offs: Underweight <18.5 • Normal 18.5–23 • Overweight 23–27.5 • Obese ≥27.5" : "WHO cut-offs: Underweight <18.5 • Normal 18.5–25 • Overweight 25–30 • Obese ≥30" });

    const whr = calcWHR(v.waist, v.height);
    if (whr !== null) m.push({ title: "Waist-to-Height Ratio", value: whr.toFixed(2), risk: whrRisk(whr),
      what: "Measures central adiposity relative to your frame. Research suggests this is a stronger predictor of cardiometabolic risk than BMI alone, as abdominal fat is more metabolically active and closely linked to insulin resistance and heart disease.",
      ranges: "Healthy <0.5 • Increased risk 0.5–0.6 • High risk ≥0.6" });

    if (v.systolic && v.diastolic) m.push({ title: "Blood Pressure", value: `${v.systolic}/${v.diastolic}`, unit: "mmHg", risk: bpCat(v.systolic, v.diastolic),
      what: "Systolic (top) measures arterial pressure during heartbeats; diastolic (bottom) measures pressure between beats. Sustained high blood pressure damages blood vessels and significantly increases risk of stroke, heart attack, and kidney disease.",
      ranges: "Optimal <120/80 • Normal <130/85 • High-normal 130–139/85–89 • Stage 1 HTN 140–159/90–99 • Stage 2 HTN ≥160/100" });

    const nh = nonHDL(v.totalChol, v.hdl);
    if (nh !== null) m.push({ title: "Non-HDL Cholesterol", value: nh.toFixed(2), unit: "mmol/L", risk: nonHDLRisk(nh),
      what: "Total cholesterol minus HDL. This captures all atherogenic (artery-clogging) lipoproteins in a single number — LDL, VLDL, and others. Many guidelines now consider it a better predictor of cardiovascular risk than LDL alone, and it doesn't require fasting to be accurate.",
      ranges: "Optimal <3.4 • Borderline 3.4–4.0 • High 4.1–4.8 • Very high ≥4.9 mmol/L" });

    const r3 = trigHDL(v.triglycerides, v.hdl);
    if (r3 !== null) m.push({ title: "Triglycerides / HDL Ratio", value: r3.toFixed(2), unit: "(mmol/L basis)", risk: trigHDLRisk(r3),
      what: "A practical surrogate marker for insulin resistance and LDL particle size. When triglycerides are high and HDL is low, it often reflects underlying metabolic dysfunction that precedes type 2 diabetes. A high ratio also correlates with a predominance of small, dense LDL particles (the more dangerous type), which standard lipid panels cannot distinguish. Note: this ratio is always calculated in mmol/L, where triglycerides and cholesterol have different molecular weights. The same ratio in mg/dL would be roughly 1.8× higher.",
      ranges: "Optimal <1.0 • Normal 1.0–1.9 • Borderline 2.0–3.4 • High ≥3.5 (mmol/L basis)" });

    if (v.glucose && fasting) m.push({ title: "Fasting Blood Glucose", value: v.glucose.toFixed(1), unit: "mmol/L", risk: glucRiskFasting(v.glucose),
      what: "Measures blood sugar after at least 8 hours of fasting. Elevated fasting glucose indicates the body is struggling to regulate blood sugar, which over time can damage blood vessels, nerves, and organs. It is the primary screening test for diabetes.",
      ranges: "Normal <5.6 • Prediabetic 5.6–6.9 • Diabetic ≥7.0 mmol/L" });

    if (v.glucose && !fasting) m.push({ title: "Non-Fasting Blood Glucose", value: v.glucose.toFixed(1), unit: "mmol/L", risk: glucRiskRandom(v.glucose),
      what: "Measures blood sugar without a fasting requirement (also called random or casual glucose). Non-fasting levels are naturally higher due to recent food intake, so higher thresholds apply. A value ≥11.1 mmol/L at any time is strongly suggestive of diabetes regardless of fasting status.",
      ranges: "Normal <7.8 • Impaired 7.8–11.0 • Diabetic ≥11.1 mmol/L" });

    if (v.hba1c) m.push({ title: "HbA1c (Glycated Haemoglobin)", value: v.hba1c.toFixed(1), unit: "%", risk: hba1cRisk(v.hba1c),
      what: "Reflects your average blood sugar over the past 2–3 months by measuring the percentage of haemoglobin with attached glucose. Unlike fasting glucose, it is not affected by day-to-day variation or fasting status, making it a more stable indicator of long-term glycaemic control.",
      ranges: "Normal <5.7% • Prediabetic 5.7–6.4% • Diabetic ≥6.5%" });

    if (v.fastingInsulin && fasting) m.push({ title: "Fasting Insulin", value: v.fastingInsulin.toFixed(1), unit: "µIU/mL", risk: insulinRisk(v.fastingInsulin),
      what: "Fasting insulin reflects how much insulin the pancreas is secreting to maintain normal blood sugar at rest. Chronically elevated fasting insulin is an early marker of insulin resistance, often preceding rises in blood glucose by years. Note: conventional lab reference ranges typically extend to 25 µIU/mL; the thresholds here reflect a more conservative metabolic health interpretation.",
      ranges: "Optimal <6 • Normal 6–12 • Borderline 13–20 • High >20 µIU/mL" });

    const homa = homaIR(v.glucose, v.fastingInsulin);
    if (homa !== null && fasting) m.push({ title: "HOMA-IR", value: homa.toFixed(2), risk: homaRisk(homa),
      what: "Homeostatic Model Assessment of Insulin Resistance. Calculated from fasting glucose and fasting insulin, it quantifies how resistant your cells are to insulin's effects. A higher score means more resistance — the pancreas is working harder to keep blood sugar in check.",
      ranges: "Optimal <1.0 • Normal 1.0–1.9 • Borderline 2.0–2.4 • Insulin Resistant ≥2.5" });

    if (v.alt) m.push({ title: "ALT (Alanine Aminotransferase)", value: v.alt.toFixed(0), unit: "U/L", risk: altRisk(v.alt, v.gender),
      what: "An enzyme found predominantly in the liver. When liver cells are damaged or inflamed, ALT leaks into the bloodstream. It is the most specific marker of liver injury and is routinely used to screen for non-alcoholic fatty liver disease (NAFLD), hepatitis, and drug-related liver toxicity.",
      ranges: `ULN: ≤35 U/L (women) / ≤45 U/L (men) • Optimal ≤half ULN • Borderline 1–2× ULN • Elevated 2–5× ULN • High >5× ULN` });

    if (v.ast) m.push({ title: "AST (Aspartate Aminotransferase)", value: v.ast.toFixed(0), unit: "U/L", risk: astRisk(v.ast),
      what: "An enzyme found in the liver, heart, and muscle. Less liver-specific than ALT — elevated AST can indicate liver disease, but also cardiac injury or strenuous exercise. It is most informative when interpreted alongside ALT.",
      ranges: "ULN ≤34 U/L (IFCC reference) • Optimal ≤17 • Borderline 35–68 • Elevated 69–170 • High >170 U/L" });

    const aar = astAltRatio(v.ast, v.alt);
    if (aar !== null) m.push({ title: "AST / ALT Ratio", value: aar.toFixed(2), risk: astAltRisk(aar),
      what: "The ratio of AST to ALT helps distinguish between types of liver disease. A ratio below 1 is typical of non-alcoholic fatty liver disease (NAFLD), where ALT tends to be disproportionately elevated. A ratio above 2 is a classic pattern in alcoholic liver disease. Values between 0.8 and 2 are generally considered non-specific.",
      ranges: "NAFLD pattern <0.8 • Non-specific 0.8–2.0 • Alcoholic liver pattern >2.0" });

    if (v.ggt) m.push({ title: "GGT (Gamma-Glutamyl Transpeptidase)", value: v.ggt.toFixed(0), unit: "U/L", risk: ggtRisk(v.ggt, v.gender),
      what: "An enzyme sensitive to liver stress, bile duct problems, and alcohol consumption. GGT is often the first liver enzyme to rise with regular alcohol use, even before ALT or AST become abnormal. It is also elevated in fatty liver, metabolic syndrome, and with certain medications.",
      ranges: "ULN: ≤36 U/L (women) / ≤55 U/L (men) • Optimal ≤~40% ULN • Borderline 1–2× ULN • Elevated 2–5× ULN • High >5× ULN" });

    return m;
  }, [v, asianBMI, fasting]);

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0 };
    metrics.forEach(m => {
      if (m.info) return;
      const col = m.risk.color;
      if (col === "#34d399") c.green++;
      else if (col === "#fbbf24") c.yellow++;
      else if (col === "#ef4444" || col === "#dc2626" || col === "#f97316") c.red++;
    });
    return c;
  }, [metrics]);

  /* ── snapshot text ── */
  const buildSnapshotText = useCallback(() => {
    const lines = [];
    lines.push("BASIC HEALTH ASSESSMENT SNAPSHOT");
    lines.push("================================");
    lines.push("");
    if (userName) lines.push(`Name:    ${userName}`);
    lines.push(`Date:    ${assessDate}`);
    lines.push("");
    lines.push("--- RESULTS SUMMARY ---");
    lines.push("");
    const maxTitle = Math.max(...metrics.map(m => m.title.length));
    metrics.forEach(m => {
      const pad = " ".repeat(maxTitle - m.title.length + 2);
      const valStr = `${m.value}${m.unit ? " " + m.unit : ""}`;
      lines.push(`${m.title}${pad}${valStr.padEnd(18)}[${m.risk.label}]`);
    });
    lines.push("");
    lines.push("--- DETAILS ---");
    lines.push("");
    metrics.forEach(m => {
      lines.push(`> ${m.title}: ${m.value}${m.unit ? " " + m.unit : ""} [${m.risk.label}]`);
      if (m.what)   lines.push(`  ${m.what}`);
      if (m.ranges) lines.push(`  Ranges: ${m.ranges}`);
      lines.push("");
    });
    lines.push("---");
    lines.push("Disclaimer: For informational purposes only — not medical advice.");
    lines.push("Consult a healthcare professional for interpretation of your results.");
    return lines.join("\n");
  }, [userName, assessDate, metrics]);

  const copySnapshot = useCallback(() => {
    if (metrics.length === 0) return;
    const text = buildSnapshotText();
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      try { document.execCommand("copy"); setSnapshotMsg("Copied!"); } catch { setSnapshotMsg("Copy failed"); }
      document.body.removeChild(ta); setTimeout(() => setSnapshotMsg(""), 2200);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => { setSnapshotMsg("Copied!"); setTimeout(() => setSnapshotMsg(""), 2200); }).catch(fallback);
    } else { fallback(); }
  }, [buildSnapshotText, metrics]);

  const saveSnapshot = useCallback(() => {
    if (metrics.length === 0) return;
    const text = buildSnapshotText();
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    const namePart = userName ? userName.replace(/\s+/g, "_").toLowerCase() + "_" : "";
    a.href = url; a.download = `health_snapshot_${namePart}${assessDate || "export"}.txt`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSnapshotMsg("Saved!"); setTimeout(() => setSnapshotMsg(""), 2200);
  }, [buildSnapshotText, metrics, userName, assessDate]);

  const handlePDF = useCallback(() => {
    if (metrics.length === 0) return;
    generatePDF(metrics, userName, assessDate, counts);
    setPdfMsg("Saved — open the .html file and click Print / Save as PDF.");
    setTimeout(() => setPdfMsg(""), 6000);
  }, [metrics, userName, assessDate, counts]);

  const clear = () => setInputs({ yearOfBirth:"",gender:"",height:"",weight:"",waist:"",systolic:"",diastolic:"",totalChol:"",hdl:"",triglycerides:"",glucose:"",fastingInsulin:"",hba1c:"",alt:"",ast:"",ggt:"" });

  const gridFields = (fields) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 10 }}>
      {fields.map(f => <InputField key={f.key} field={f} value={inputs[f.key]} onChange={set} unit={f.lipid || f.isTrig ? lipidUnit : f.isGluc ? glucUnit : "mmol"} />)}
    </div>
  );

  /* ── shared text input style ── */
  const textInputStyle = {
    width: "100%", padding: "8px 11px", border: "1.5px solid rgba(255,255,255,0.08)",
    borderRadius: 7, fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    background: "rgba(255,255,255,0.04)", color: "#e2e8f0", outline: "none",
    transition: "border-color 0.15s", boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0c0c16", color: "#e2e8f0", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 22, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#818cf8", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Health Dashboard</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", margin: 0, lineHeight: 1.2 }}>Basic Health Assessment</h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "5px 0 0" }}>Enter any available metrics. Only relevant insights are shown.</p>
          </div>
          {metrics.length > 0 && (
            <div style={{ display: "flex", gap: 14, fontSize: 12, fontWeight: 600, flexWrap: "wrap" }}>
              <span style={{ color: "#34d399" }}>{counts.green} optimal</span>
              <span style={{ color: "#fbbf24" }}>{counts.yellow} borderline</span>
              <span style={{ color: "#ef4444" }}>{counts.red} attention</span>
            </div>
          )}
        </div>

        {/* ── Input panel ── */}
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.05)", padding: "20px 18px 14px", marginBottom: 22 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "#cbd5e1", margin: 0 }}>Input Metrics</h2>
            <button onClick={clear} style={{ background: "none", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, padding: "5px 14px", fontSize: 11, fontWeight: 600, color: "#64748b", cursor: "pointer" }}>Clear All</button>
          </div>

          {/* Snapshot Info */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Snapshot Info" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Name</label>
                <input type="text" style={textInputStyle} placeholder="e.g. John" value={userName} onChange={e => setUserName(e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>Assessment Date</label>
                <input type="date" style={{ ...textInputStyle, colorScheme: "dark" }} value={assessDate} onChange={e => setAssessDate(e.target.value)}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e  => e.target.style.borderColor = "rgba(255,255,255,0.08)"} />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Basic Info" />
            {gridFields(FIELDS_BASIC)}
          </div>

          {/* Body */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Body Measurements">
              <Toggle label={asianBMI ? "Asian BMI" : "WHO BMI"} active={asianBMI} onToggle={() => setAsianBMI(p => !p)} />
            </SectionHeader>
            {gridFields(FIELDS_BODY)}
          </div>

          {/* BP */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Blood Pressure" />
            {gridFields(FIELDS_BP)}
          </div>

          {/* Lipid */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Lipid Profile">
              <Toggle label={lipidUnit === "mmol" ? "mmol/L" : "mg/dL"} active={lipidUnit === "mgdl"} onToggle={() => setLipidUnit(p => p === "mmol" ? "mgdl" : "mmol")} />
            </SectionHeader>
            {gridFields(FIELDS_LIPID)}
          </div>

          {/* Glucose */}
          <div style={{ marginBottom: 16 }}>
            <SectionHeader title="Glucose Profile">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <Toggle label={fasting ? "Fasting" : "Non-Fasting"} active={!fasting} onToggle={() => setFasting(p => !p)} />
                <Toggle label={glucUnit === "mmol" ? "mmol/L" : "mg/dL"} active={glucUnit === "mgdl"} onToggle={() => setGlucUnit(p => p === "mmol" ? "mgdl" : "mmol")} />
              </div>
            </SectionHeader>
            {gridFields(fasting ? FIELDS_GLUC_FASTING : FIELDS_GLUC_RANDOM)}
          </div>

          {/* Liver */}
          <div style={{ marginBottom: 8 }}>
            <SectionHeader title="Liver Function" />
            {gridFields(FIELDS_LIVER)}
          </div>
        </div>

        {/* ── Results ── */}
        {metrics.length > 0 ? (
          <>
            {/* Summary bar */}
            <SummaryBar counts={counts} total={metrics.filter(m => !m.info).length} />

            {/* Results header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "#cbd5e1", margin: 0 }}>Results</h2>
                <span style={{ fontSize: 12, color: "#475569" }}>{metrics.length} metrics</span>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {snapshotMsg && <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>{snapshotMsg}</span>}
                {pdfMsg && <span style={{ fontSize: 11, color: "#a5b4fc", fontWeight: 600, maxWidth: 200, lineHeight: 1.4 }}>{pdfMsg}</span>}

                {/* PDF export */}
                <button onClick={handlePDF} style={{
                  background: "rgba(99,102,241,0.12)", border: "1.5px solid rgba(99,102,241,0.45)",
                  borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  color: "#a5b4fc", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
                }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(99,102,241,0.22)"}
                  onMouseOut={e  => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}>
                  Save HTML
                </button>

                {/* Copy */}
                <button onClick={copySnapshot} style={{
                  background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
                }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseOut={e  => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                  Copy .txt
                </button>

                {/* Save .txt */}
                <button onClick={saveSnapshot} style={{
                  background: "rgba(255,255,255,0.04)", border: "1.5px solid rgba(255,255,255,0.1)",
                  borderRadius: 8, padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  color: "#94a3b8", cursor: "pointer", transition: "all 0.15s",
                }}
                  onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                  onMouseOut={e  => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
                  Save .txt
                </button>
              </div>
            </div>

            {/* Cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {metrics.map(m => <MetricCard key={m.title} {...m} />)}
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
              <p style={{ fontSize: 11, color: "#475569", margin: 0, lineHeight: 1.6 }}>
                <strong style={{ color: "#64748b" }}>Disclaimer:</strong> For informational purposes only — not medical advice. Reference ranges vary by laboratory, population, and individual risk factors. All lipid and glucose calculations use mmol/L internally. Consult a healthcare professional for interpretation of your results.
              </p>
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#334155" }}>
            <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.5 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Enter some values above to see your health metrics</div>
          </div>
        )}
      </div>
    </div>
  );
}
