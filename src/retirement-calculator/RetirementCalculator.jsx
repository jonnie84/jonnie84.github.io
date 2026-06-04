import { useState, useMemo } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";

const CURRENT_YEAR = 2026;

const fmt = (val) =>
  new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(isFinite(val) ? val : 0);

const fmtShort = (val) => {
  if (!isFinite(val)) return "$0";
  const abs = Math.abs(val);
  if (abs >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

// Tooltip uses full fmt for hover values, fmtShort only for axes
const CustomTooltip = ({ active, payload, label, prefix = "", T }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 6, padding: "0.6rem 0.9rem", fontSize: "0.75rem", fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ color: T.textMuted, marginBottom: "0.3rem", letterSpacing: "0.08em" }}>{prefix}Age {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color || T.textDim, marginBottom: "0.15rem" }}>
          {p.name}: <span style={{ color: T.text }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ icon, title, T }) => (
  <h2 style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.accent, marginBottom: "1rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <span>{icon}</span> {title}
  </h2>
);

export default function RetirementCalculator() {
  document.title = 'Retirement Calculator';
  const [dark, setDark] = useState(true);

  const T = {
    bg:           dark ? '#0f0f1a'                    : '#f4f4fc',
    headerBg:     dark ? '#0a0a18'                    : '#eeeef8',
    headerGrad:   dark ? 'linear-gradient(135deg, #0d0d20 0%, #0f0f1a 60%)' : 'linear-gradient(135deg, #eeeef8 0%, #f4f4fc 60%)',
    card:         dark ? '#1a1a2e'                    : '#ffffff',
    card2:        dark ? '#111122'                    : '#f8f8fe',
    inputBg:      dark ? '#080712'                    : '#fafafe',
    inputBorder:  dark ? '#161228'                    : '#e0e0f0',
    border:       dark ? '#1e1e36'                    : '#ddddf0',
    text:         dark ? '#e8e8f0'                    : '#1a1a2e',
    textDim:      dark ? '#a0a0c0'                    : '#4a4a6a',
    textMuted:    dark ? '#8888a8'                    : '#6868a0',
    textFaint:    dark ? '#6b6b80'                    : '#9090b8',
    accent:       '#6366f1',
    accentDim:    dark ? '#4f52cc'                    : '#4f52cc',
    accentBright: dark ? '#a5b4fc'                    : '#6366f1',
    accentBg:     dark ? 'rgba(99,102,241,0.15)'      : 'rgba(99,102,241,0.10)',
    teal:         dark ? '#34d399'                    : '#0d9488',
    rust:         dark ? '#f87171'                    : '#dc2626',
    gridLine:     dark ? '#161628'                    : '#e0e0f0',
    tickColor:    dark ? '#6b6b80'                    : '#9090b0',
  };

  const [inputs, setInputs] = useState({
    birthYear: 1984,
    retirementAge: 55,
    currentCapital: 50000,
    investmentRate: 10,
    postRetirementRate: 5,
    inflationRate: 3,
    dividendRate: 4,
    contributionAmount: 500,
    contributionFrequency: "annual",
  });

  const [activeTab, setActiveTab] = useState("accumulation");
  const [drawdownMode, setDrawdownMode] = useState(false);

  const set = (k) => (e) => {
    const raw = e.target.value;
    setInputs((p) => ({ ...p, [k]: raw === "" ? "" : parseFloat(raw) }));
  };

  const safe = useMemo(() => {
    const birthYear = Math.max(1920, Math.min(CURRENT_YEAR - 1, Number(inputs.birthYear) || 1984));
    const currentAge = CURRENT_YEAR - birthYear;
    const retirementAge = Math.max(currentAge + 1, Number(inputs.retirementAge) || currentAge + 1);
    return {
      birthYear,
      currentAge,
      retirementAge,
      currentCapital: Math.max(0, Number(inputs.currentCapital) || 0),
      investmentRate: Math.max(0, Number(inputs.investmentRate) || 0),
      postRetirementRate: Math.max(0, Number(inputs.postRetirementRate) || 0),
      inflationRate: Math.max(0, Number(inputs.inflationRate) || 0),
      dividendRate: Math.max(0, Number(inputs.dividendRate) || 0),
      contributionAmount: Math.max(0, Number(inputs.contributionAmount) || 0),
      contributionFrequency: inputs.contributionFrequency || "annual",
    };
  }, [inputs]);

  const { accumulation, retirementRows } = useMemo(() => {
    const { currentAge, retirementAge, currentCapital, investmentRate, postRetirementRate, inflationRate, dividendRate, contributionAmount, contributionFrequency } = safe;
    const inv = investmentRate / 100;
    const postInv = postRetirementRate / 100;
    const inf = inflationRate / 100;
    const div = dividendRate / 100;
    const yearsToRetirement = retirementAge - currentAge;
    const annualContribution = contributionFrequency === "monthly" ? contributionAmount * 12 : contributionAmount;

    const accumulation = [];
    let capital = currentCapital;
    let totalContributions = 0;
    for (let i = 0; i <= yearsToRetirement; i++) {
      const inflationFactor = Math.pow(1 + inf, i);
      accumulation.push({ age: currentAge + i, year: i, capital, capitalToday: capital / inflationFactor, totalContributions });
      if (i < yearsToRetirement) {
        capital = (capital + annualContribution) * (1 + inv);
        totalContributions += annualContribution;
      }
    }

    const retirementRows = [];
    let postCapital = accumulation[accumulation.length - 1].capital;
    const fixedAnnualDrawdown = drawdownMode ? postCapital * div : 0;
    for (let j = 0; j <= 30; j++) {
      const inflationFactor = Math.pow(1 + inf, yearsToRetirement + j);
      const annualDividend = drawdownMode ? fixedAnnualDrawdown : postCapital * div;
      const monthlyDividend = annualDividend / 12;
      retirementRows.push({
        age: retirementAge + j, year: j,
        capital: postCapital, capitalToday: postCapital / inflationFactor,
        annualDividend, monthlyDividend,
        annualToday: annualDividend / inflationFactor,
        monthlyToday: monthlyDividend / inflationFactor,
      });
      if (drawdownMode) {
        postCapital = Math.max(0, (postCapital - fixedAnnualDrawdown) * (1 + postInv));
      } else {
        postCapital = postCapital * (1 + postInv);
      }
    }

    return { accumulation, retirementRows };
  }, [safe, drawdownMode]);

  const lastAccum = accumulation[accumulation.length - 1];
  const retirementCapital = lastAccum?.capital ?? 0;
  const retirementCapitalToday = lastAccum?.capitalToday ?? 0;
  const totalContributions = lastAccum?.totalContributions ?? 0;
  const firstRetRow = retirementRows[0];

  const allChartData = useMemo(() => {
    const acc = accumulation.map((r) => ({
      age: r.age,
      nominalCapital: Math.round(r.capital),
      realCapital: Math.round(r.capitalToday),
      phase: "accumulation",
    }));
    const ret = retirementRows.slice(1).map((r) => ({
      age: r.age,
      nominalCapital: Math.round(r.capital),
      realCapital: Math.round(r.capitalToday),
      phase: "retirement",
    }));
    return [...acc, ...ret];
  }, [accumulation, retirementRows]);

  const dividendChartData = useMemo(() =>
    retirementRows.map((r) => ({
      age: r.age,
      nominalAnnual: Math.round(r.annualDividend),
      realAnnual: Math.round(r.annualToday),
      nominalMonthly: Math.round(r.monthlyDividend),
      realMonthly: Math.round(r.monthlyToday),
    })), [retirementRows]);

  const incomeLabel = drawdownMode ? "Withdrawal" : "Dividends";
  const summaryCards = [
    { label: "Capital at Retirement", value: fmt(retirementCapital), sub: `Today's value: ${fmt(retirementCapitalToday)}` },
    { label: "Total Contributions", value: fmt(totalContributions), sub: `Initial capital: ${fmt(safe.currentCapital)}` },
    { label: `Annual ${incomeLabel} (Yr 1)`, value: fmt(firstRetRow?.annualDividend ?? 0), sub: `Today's value: ${fmt(firstRetRow?.annualToday ?? 0)}` },
    { label: `Monthly ${incomeLabel} (Yr 1)`, value: fmt(firstRetRow?.monthlyDividend ?? 0), sub: `Today's value: ${fmt(firstRetRow?.monthlyToday ?? 0)}` },
  ];

  const inputFields = [
    { label: "Year of Birth", key: "birthYear", suffix: "", step: 1 },
    { label: "Retirement Age", key: "retirementAge", suffix: "yrs", step: 1 },
    { label: "Current Capital", key: "currentCapital", prefix: "$", step: 1000 },
    { label: "Investment Return", key: "investmentRate", suffix: "% p.a.", step: 0.1 },
    { label: "Post-Retirement Return", key: "postRetirementRate", suffix: "% p.a.", step: 0.1 },
    { label: "Inflation Rate", key: "inflationRate", suffix: "% p.a.", step: 0.1 },
    { label: drawdownMode ? "Drawdown Rate" : "Dividend Yield", key: "dividendRate", suffix: "% p.a.", step: 0.1 },
  ];

  const tabs = [
    { id: "charts", label: "Charts" },
    { id: "accumulation", label: "Accumulation" },
    { id: "retirement", label: drawdownMode ? "Drawdown" : "Dividends" },
  ];

  const tabStyle = (id) => ({
    background: activeTab === id ? T.card : "transparent",
    border: activeTab === id ? `1px solid ${T.border}` : "1px solid transparent",
    borderBottom: activeTab === id ? `1px solid ${T.card}` : `1px solid ${T.border}`,
    color: activeTab === id ? T.accent : T.textMuted,
    padding: "0.5rem 1.2rem",
    fontSize: "0.72rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    borderRadius: "6px 6px 0 0",
    marginBottom: "-1px",
    transition: "color 0.15s",
  });

  const chartContainerStyle = {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: "1.2rem",
    marginBottom: "1.5rem",
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", background: T.bg, minHeight: "100vh", color: T.text }}>
      {/* Header */}
      <div style={{ background: T.headerGrad, borderBottom: `1px solid ${T.border}`, padding: "1rem 2rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: '0.75rem' }}>
            <a href="../../" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textMuted,fontSize:13,fontFamily:'inherit',textDecoration:'none' }}>⌂ Home</a>
            <button onClick={() => setDark(d => !d)} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.card,color:T.textMuted,fontSize:13,fontFamily:'inherit',cursor:'pointer' }}>{dark ? '☀ Light' : '☾ Dark'}</button>
          </div>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.25em", color: T.accent, textTransform: "uppercase", marginBottom: "0.3rem" }}>
            Personal Finance · Age {safe.currentAge}
          </div>
          <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: 600, color: T.text, letterSpacing: "-0.01em", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
            Retirement Calculator
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>

        {/* ── INPUT CARDS ── recessed, near-black, bottom-bar signals editability ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.25em", textTransform: "uppercase", color: T.textFaint, marginBottom: "0.55rem" }}>⚙ Assumptions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.5rem" }}>
            {inputFields.map(({ label, key, prefix, suffix, step }) => (
              <div key={key}
                style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderBottom: `2px solid ${T.accentDim}`, borderRadius: 3, padding: "0.6rem 0.85rem", transition: "border-bottom-color 0.2s, background 0.15s", cursor: "text" }}
                onMouseEnter={e => { e.currentTarget.style.borderBottomColor = T.accent; e.currentTarget.style.background = T.inputBg; }}
                onMouseLeave={e => { e.currentTarget.style.borderBottomColor = T.accentDim; e.currentTarget.style.background = T.inputBg; }}>
                <label style={{ display: "block", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMuted, marginBottom: "0.3rem" }}>{label}</label>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                  {prefix && <span style={{ color: T.accentDim, fontSize: "0.72rem" }}>{prefix}</span>}
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={set(key)}
                    step={step}
                    style={{ background: "transparent", border: "none", color: T.text, fontSize: "1rem", fontFamily: "'Courier New', Courier, monospace", width: "100%", outline: "none" }}
                  />
                  {suffix && <span style={{ color: T.textFaint, fontSize: "0.65rem", whiteSpace: "nowrap" }}>{suffix}</span>}
                </div>
              </div>
            ))}
            {/* Retirement mode toggle — sits beside the rate card */}
            <div
              style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderBottom: `2px solid ${T.accentDim}`, borderRadius: 3, padding: "0.6rem 0.85rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <label style={{ display: "block", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMuted, marginBottom: "0.4rem" }}>Retirement Income Mode</label>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[{ key: false, label: "Yield Only" }, { key: true, label: "Drawdown" }].map(({ key, label }) => (
                  <button key={label} onClick={() => setDrawdownMode(key)}
                    style={{
                      background: drawdownMode === key ? T.accentBg : "transparent",
                      border: `1px solid ${drawdownMode === key ? T.accent : T.border}`,
                      color: drawdownMode === key ? T.accentBright : T.textFaint,
                      fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase",
                      padding: "0.2rem 0.6rem", borderRadius: 3, cursor: "pointer",
                      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", transition: "all 0.15s",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.5rem", color: T.textFaint, marginTop: "0.3rem", lineHeight: "1.4" }}>
                {drawdownMode ? "Fixed annual withdrawal from retirement capital" : "Dividends paid from yield — capital grows independently"}
              </div>
            </div>
            {/* Contribution input with frequency toggle */}
            <div
              style={{ background: T.inputBg, border: `1px solid ${T.inputBorder}`, borderBottom: `2px solid ${T.accentDim}`, borderRadius: 3, padding: "0.6rem 0.85rem", transition: "border-bottom-color 0.2s, background 0.15s", cursor: "text", gridColumn: "span 2" }}
              onMouseEnter={e => { e.currentTarget.style.borderBottomColor = T.accent; e.currentTarget.style.background = T.inputBg; }}
              onMouseLeave={e => { e.currentTarget.style.borderBottomColor = T.accentDim; e.currentTarget.style.background = T.inputBg; }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMuted }}>Additional Contributions</label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {["annual", "monthly"].map(freq => (
                    <button key={freq} onClick={() => setInputs(p => ({ ...p, contributionFrequency: freq }))}
                      style={{
                        background: inputs.contributionFrequency === freq ? T.accentBg : "transparent",
                        border: `1px solid ${inputs.contributionFrequency === freq ? T.accent : T.border}`,
                        color: inputs.contributionFrequency === freq ? T.accentBright : T.textFaint,
                        fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "0.15rem 0.5rem", borderRadius: 3, cursor: "pointer",
                        fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", transition: "all 0.15s",
                      }}>
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                <span style={{ color: T.accentDim, fontSize: "0.72rem" }}>$</span>
                <input
                  type="number"
                  value={inputs.contributionAmount}
                  onChange={set("contributionAmount")}
                  step={100}
                  style={{ background: "transparent", border: "none", color: T.text, fontSize: "1rem", fontFamily: "'Courier New', Courier, monospace", width: "100%", outline: "none" }}
                />
                <span style={{ color: T.textFaint, fontSize: "0.65rem", whiteSpace: "nowrap" }}>/ {inputs.contributionFrequency === "monthly" ? "mth" : "yr"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUMMARY CARDS ── uniform: same border, same bg, accent top-bar, consistent typography ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.25em", textTransform: "uppercase", color: T.textFaint, marginBottom: "0.55rem" }}>◈ Projections</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {summaryCards.map(({ label, value, sub }) => (
              <div key={label} style={{
                background: T.card,
                border: `1px solid ${T.border}`,
                borderTop: `2px solid ${T.accent}`,
                borderRadius: "0 0 6px 6px",
                padding: "1rem 1.2rem",
              }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: T.textMuted, marginBottom: "0.45rem" }}>{label}</div>
                <div style={{ fontSize: "1.35rem", color: T.accentBright, marginBottom: "0.25rem", letterSpacing: "-0.01em", fontWeight: "normal" }}>{value}</div>
                <div style={{ fontSize: "0.68rem", color: T.textFaint }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", borderBottom: `1px solid ${T.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderTop: "none", borderRadius: "0 6px 6px 6px", padding: "1.5rem", marginBottom: "2rem" }}>

          {/* ── CHARTS TAB ── */}
          {activeTab === "charts" && (
            <div>
              {/* Chart 1: Capital Growth */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="▲" title="Capital Growth — Nominal vs Real (Today's $)" T={T} />
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={allChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.teal} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={T.teal} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: T.tickColor, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: T.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip T={T} />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: T.textMuted, paddingTop: "0.5rem" }} />
                    <ReferenceLine x={safe.retirementAge} stroke={T.accentDim} strokeDasharray="4 4" label={{ value: "Retire", fill: T.accentDim, fontSize: 10, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="nominalCapital" name="Nominal Capital" stroke={T.accent} fill="url(#nominalGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="realCapital" name="Real Capital (Today's $)" stroke={T.teal} fill="url(#realGrad)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  Dashed line marks retirement. {drawdownMode ? "Capital declines post-retirement as a fixed amount is withdrawn each year." : "Capital grows independently post-retirement; dividends do not erode principal."}
                </p>
              </div>

              {/* Chart 2: Annual Dividend Income */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="◆" title={`Annual ${drawdownMode ? "Withdrawal" : "Dividend"} Income (Post-Retirement)`} T={T} />
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dividendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: T.tickColor, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: T.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip T={T} />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: T.textMuted, paddingTop: "0.5rem" }} />
                    <Bar dataKey="nominalAnnual" name={`Nominal Annual ${drawdownMode ? "Wdl." : "Div."}`} fill={T.accent} opacity={0.85} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="realAnnual" name={`Real Annual ${drawdownMode ? "Wdl." : "Div."} (Today's $)`} fill={T.teal} opacity={0.7} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  {drawdownMode ? "Fixed annual withdrawal — amount stays constant while capital depletes." : "Nominal dividends rise as capital compounds; real purchasing power declines with inflation."}
                </p>
              </div>

              {/* Chart 3: Monthly Income — Real vs Nominal */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="◈" title={`Monthly ${drawdownMode ? "Withdrawal" : "Dividend"} Income — Real vs Nominal`} T={T} />
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dividendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.gridLine} vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: T.tickColor, fontSize: 11 }} axisLine={{ stroke: T.border }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: T.tickColor, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip prefix="Monthly · " T={T} />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: T.textMuted, paddingTop: "0.5rem" }} />
                    <Line type="monotone" dataKey="nominalMonthly" name="Nominal Monthly" stroke={T.accentBright} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="realMonthly" name="Real Monthly (Today's $)" stroke={T.rust} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  The gap between nominal and real widens over time — a useful prompt to think about inflation-linked income needs.
                </p>
              </div>
            </div>
          )}

          {/* ── ACCUMULATION TAB ── */}
          {activeTab === "accumulation" && (
            <div>
              <SectionHeader icon="▲" title="Accumulation Phase" T={T} />
              <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${T.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                  <thead>
                    <tr style={{ background: T.card }}>
                      {["Age", "Year", "Capital (Nominal)", "Capital (Today's $)", "Total Contributions"].map((h) => (
                        <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "right", color: T.textMuted, fontWeight: "normal", fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accumulation.map((row, i) => {
                      const isRetirement = row.age === safe.retirementAge;
                      return (
                        <tr key={row.age} style={{ background: isRetirement ? T.accentBg : i % 2 === 0 ? "transparent" : T.card2, borderBottom: `1px solid ${T.border}` }}>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? T.accent : T.textMuted, fontWeight: isRetirement ? "bold" : "normal" }}>{row.age}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: T.textFaint }}>{row.year === 0 ? "Now" : `+${row.year}`}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? T.accentBright : T.textDim }}>{fmt(row.capital)}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? T.accentDim : T.textMuted }}>{fmt(row.capitalToday)}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? T.accentDim : T.textFaint }}>{fmt(row.totalContributions)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RETIREMENT TAB ── */}
          {activeTab === "retirement" && (
            <div>
              <SectionHeader icon="◆" title={drawdownMode ? "Drawdown Phase (Post-Retirement)" : "Dividend Income Phase (Post-Retirement)"} T={T} />
              <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${T.border}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "7%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "15%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "16%" }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: T.card }}>
                      {["Age", "Capital (Nominal)", "Capital (Today's $)", `Annual ${drawdownMode ? "Wdl" : "Div"} (Nominal)`, `Monthly ${drawdownMode ? "Wdl" : "Div"} (Nominal)`, `Annual ${drawdownMode ? "Wdl" : "Div"} (Today's $)`, `Monthly ${drawdownMode ? "Wdl" : "Div"} (Today's $)`].map((h) => (
                        <th key={h} style={{ padding: "0.6rem 0.5rem", textAlign: "right", color: T.textMuted, fontWeight: "normal", fontSize: "0.6rem", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${T.border}`, whiteSpace: "normal", lineHeight: "1.3", verticalAlign: "bottom" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retirementRows.map((row, i) => (
                      <tr key={row.age} style={{ background: row.depleted ? (dark ? '#1a0a1a' : '#fff0f0') : row.year === 0 ? T.accentBg : i % 2 === 0 ? "transparent" : T.card2, borderBottom: `1px solid ${T.border}`, opacity: row.depleted ? 0.5 : 1 }}>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.year === 0 ? T.accent : row.depleted ? T.rust : T.textMuted, fontWeight: row.year === 0 ? "bold" : "normal" }}>{row.age}{row.year === 0 ? " ★" : ""}{row.depleted && row.year > 0 ? " ✕" : ""}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : row.year === 0 ? T.accentBright : T.textDim }}>{fmt(row.capital)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : row.year === 0 ? T.accentDim : T.textMuted }}>{fmt(row.capitalToday)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : T.textDim }}>{row.depleted ? fmt(0) : fmt(row.annualDividend)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : T.textDim }}>{row.depleted ? fmt(0) : fmt(row.monthlyDividend)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : T.textMuted }}>{row.depleted ? fmt(0) : fmt(row.annualToday)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? T.rust : T.textMuted }}>{row.depleted ? fmt(0) : fmt(row.monthlyToday)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "0.68rem", color: T.textFaint, marginTop: "0.75rem", letterSpacing: "0.04em" }}>
                ★ Retirement year. {drawdownMode ? `Fixed annual withdrawal of ${fmt(retirementCapital * safe.dividendRate / 100)} (${safe.dividendRate}% of retirement capital) — funds can be fully depleted.` : "Dividends are paid from yield without eroding principal; capital grows at the post-retirement rate independently."} Today's $ values reflect cumulative inflation from {CURRENT_YEAR}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
