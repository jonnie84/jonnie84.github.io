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

const GOLD = "#c9a227";
const GOLD_DIM = "#9a7e4a";
const GOLD_DARK = "#6e5a35";
const AMBER = "#f0d070";
const BG = "#0f0f0f";
const BG_CARD = "#181410";
const BG_CARD2 = "#111009";
const BORDER = "#2e2416";
const TEXT = "#e8e2d4";
const TEXT_DIM = "#d4c49a";
const TEXT_MUTED = "#9a7e4a";
const TEXT_FAINT = "#6e5a35";
const TEAL = "#4db8a0";
const RUST = "#c45c2a";

// Tooltip uses full fmt for hover values, fmtShort only for axes
const CustomTooltip = ({ active, payload, label, prefix = "" }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{ background: "#1a1409", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.6rem 0.9rem", fontSize: "0.75rem", fontFamily: "Georgia, serif" }}>
      <div style={{ color: GOLD_DIM, marginBottom: "0.3rem", letterSpacing: "0.08em" }}>{prefix}Age {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color || TEXT_DIM, marginBottom: "0.15rem" }}>
          {p.name}: <span style={{ color: TEXT }}>{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const SectionHeader = ({ icon, title }) => (
  <h2 style={{ fontSize: "0.75rem", letterSpacing: "0.2em", textTransform: "uppercase", color: GOLD, marginBottom: "1rem", fontWeight: "normal", display: "flex", alignItems: "center", gap: "0.5rem" }}>
    <span>{icon}</span> {title}
  </h2>
);

export default function RetirementCalculator() {
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
    background: activeTab === id ? BG_CARD : "transparent",
    border: activeTab === id ? `1px solid ${BORDER}` : "1px solid transparent",
    borderBottom: activeTab === id ? `1px solid ${BG_CARD}` : `1px solid ${BORDER}`,
    color: activeTab === id ? GOLD : TEXT_MUTED,
    padding: "0.5rem 1.2rem",
    fontSize: "0.72rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    borderRadius: "6px 6px 0 0",
    marginBottom: "-1px",
    transition: "color 0.15s",
  });

  const chartContainerStyle = {
    background: BG_CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: "1.2rem",
    marginBottom: "1.5rem",
  };

  return (
    <div style={{ fontFamily: "'Georgia', 'Times New Roman', serif", background: BG, minHeight: "100vh", color: TEXT }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1a1409 0%, #0f0f0f 60%)", borderBottom: `1px solid ${BORDER}`, padding: "2rem 2rem 1.5rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontSize: "0.65rem", letterSpacing: "0.25em", color: GOLD, textTransform: "uppercase", marginBottom: "0.3rem" }}>
            Personal Finance · Age {safe.currentAge}
          </div>
          <h1 style={{ margin: 0, fontSize: "1.9rem", fontWeight: "normal", color: "#f0e6c8", letterSpacing: "-0.01em" }}>
            Retirement Calculator
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>

        {/* ── INPUT CARDS ── recessed, near-black, bottom-bar signals editability ── */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.25em", textTransform: "uppercase", color: TEXT_FAINT, marginBottom: "0.55rem" }}>⚙ Assumptions</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: "0.5rem" }}>
            {inputFields.map(({ label, key, prefix, suffix, step }) => (
              <div key={key}
                style={{ background: "#080705", border: "1px solid #161209", borderBottom: `2px solid ${GOLD_DARK}`, borderRadius: 3, padding: "0.6rem 0.85rem", transition: "border-bottom-color 0.2s, background 0.15s", cursor: "text" }}
                onMouseEnter={e => { e.currentTarget.style.borderBottomColor = GOLD; e.currentTarget.style.background = "#0d0b07"; }}
                onMouseLeave={e => { e.currentTarget.style.borderBottomColor = GOLD_DARK; e.currentTarget.style.background = "#080705"; }}>
                <label style={{ display: "block", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: "0.3rem" }}>{label}</label>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                  {prefix && <span style={{ color: GOLD_DIM, fontSize: "0.72rem" }}>{prefix}</span>}
                  <input
                    type="number"
                    value={inputs[key]}
                    onChange={set(key)}
                    step={step}
                    style={{ background: "transparent", border: "none", color: "#f0e6c8", fontSize: "1rem", fontFamily: "'Courier New', Courier, monospace", width: "100%", outline: "none" }}
                  />
                  {suffix && <span style={{ color: TEXT_FAINT, fontSize: "0.65rem", whiteSpace: "nowrap" }}>{suffix}</span>}
                </div>
              </div>
            ))}
            {/* Retirement mode toggle — sits beside the rate card */}
            <div
              style={{ background: "#080705", border: "1px solid #161209", borderBottom: `2px solid ${GOLD_DARK}`, borderRadius: 3, padding: "0.6rem 0.85rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <label style={{ display: "block", fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: "0.4rem" }}>Retirement Income Mode</label>
              <div style={{ display: "flex", gap: "0.25rem" }}>
                {[{ key: false, label: "Yield Only" }, { key: true, label: "Drawdown" }].map(({ key, label }) => (
                  <button key={label} onClick={() => setDrawdownMode(key)}
                    style={{
                      background: drawdownMode === key ? GOLD_DARK : "transparent",
                      border: `1px solid ${drawdownMode === key ? GOLD : "#2a1f10"}`,
                      color: drawdownMode === key ? AMBER : TEXT_FAINT,
                      fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase",
                      padding: "0.2rem 0.6rem", borderRadius: 3, cursor: "pointer",
                      fontFamily: "Georgia, serif", transition: "all 0.15s",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.5rem", color: TEXT_FAINT, marginTop: "0.3rem", lineHeight: "1.4" }}>
                {drawdownMode ? "Fixed annual withdrawal from retirement capital" : "Dividends paid from yield — capital grows independently"}
              </div>
            </div>
            {/* Contribution input with frequency toggle */}
            <div
              style={{ background: "#080705", border: "1px solid #161209", borderBottom: `2px solid ${GOLD_DARK}`, borderRadius: 3, padding: "0.6rem 0.85rem", transition: "border-bottom-color 0.2s, background 0.15s", cursor: "text", gridColumn: "span 2" }}
              onMouseEnter={e => { e.currentTarget.style.borderBottomColor = GOLD; e.currentTarget.style.background = "#0d0b07"; }}
              onMouseLeave={e => { e.currentTarget.style.borderBottomColor = GOLD_DARK; e.currentTarget.style.background = "#080705"; }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                <label style={{ fontSize: "0.55rem", letterSpacing: "0.2em", textTransform: "uppercase", color: TEXT_MUTED }}>Additional Contributions</label>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  {["annual", "monthly"].map(freq => (
                    <button key={freq} onClick={() => setInputs(p => ({ ...p, contributionFrequency: freq }))}
                      style={{
                        background: inputs.contributionFrequency === freq ? GOLD_DARK : "transparent",
                        border: `1px solid ${inputs.contributionFrequency === freq ? GOLD : "#2a1f10"}`,
                        color: inputs.contributionFrequency === freq ? AMBER : TEXT_FAINT,
                        fontSize: "0.55rem", letterSpacing: "0.12em", textTransform: "uppercase",
                        padding: "0.15rem 0.5rem", borderRadius: 3, cursor: "pointer",
                        fontFamily: "Georgia, serif", transition: "all 0.15s",
                      }}>
                      {freq}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.2rem" }}>
                <span style={{ color: GOLD_DIM, fontSize: "0.72rem" }}>$</span>
                <input
                  type="number"
                  value={inputs.contributionAmount}
                  onChange={set("contributionAmount")}
                  step={100}
                  style={{ background: "transparent", border: "none", color: "#f0e6c8", fontSize: "1rem", fontFamily: "'Courier New', Courier, monospace", width: "100%", outline: "none" }}
                />
                <span style={{ color: TEXT_FAINT, fontSize: "0.65rem", whiteSpace: "nowrap" }}>/ {inputs.contributionFrequency === "monthly" ? "mth" : "yr"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SUMMARY CARDS ── uniform: same border, same bg, gold top-bar, consistent typography ── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.25em", textTransform: "uppercase", color: TEXT_FAINT, marginBottom: "0.55rem" }}>◈ Projections</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
            {summaryCards.map(({ label, value, sub }) => (
              <div key={label} style={{
                background: BG_CARD,
                border: `1px solid ${BORDER}`,
                borderTop: `2px solid ${GOLD}`,
                borderRadius: "0 0 6px 6px",
                padding: "1rem 1.2rem",
              }}>
                <div style={{ fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: TEXT_MUTED, marginBottom: "0.45rem" }}>{label}</div>
                <div style={{ fontSize: "1.35rem", color: AMBER, marginBottom: "0.25rem", letterSpacing: "-0.01em", fontWeight: "normal" }}>{value}</div>
                <div style={{ fontSize: "0.68rem", color: TEXT_FAINT }}>{sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.25rem", borderBottom: `1px solid ${BORDER}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={tabStyle(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderTop: "none", borderRadius: "0 6px 6px 6px", padding: "1.5rem", marginBottom: "2rem" }}>

          {/* ── CHARTS TAB ── */}
          {activeTab === "charts" && (
            <div>
              {/* Chart 1: Capital Growth */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="▲" title="Capital Growth — Nominal vs Real (Today's $)" />
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={allChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GOLD} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={TEAL} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={TEAL} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#221a0a" vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: TEXT_FAINT, fontSize: 11 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: TEXT_FAINT, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: TEXT_MUTED, paddingTop: "0.5rem" }} />
                    <ReferenceLine x={safe.retirementAge} stroke={GOLD_DARK} strokeDasharray="4 4" label={{ value: "Retire", fill: GOLD_DIM, fontSize: 10, position: "insideTopRight" }} />
                    <Area type="monotone" dataKey="nominalCapital" name="Nominal Capital" stroke={GOLD} fill="url(#nominalGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="realCapital" name="Real Capital (Today's $)" stroke={TEAL} fill="url(#realGrad)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: TEXT_FAINT, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  Dashed line marks retirement. {drawdownMode ? "Capital declines post-retirement as a fixed amount is withdrawn each year." : "Capital grows independently post-retirement; dividends do not erode principal."}
                </p>
              </div>

              {/* Chart 2: Annual Dividend Income */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="◆" title={`Annual ${drawdownMode ? "Withdrawal" : "Dividend"} Income (Post-Retirement)`} />
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={dividendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#221a0a" vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: TEXT_FAINT, fontSize: 11 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: TEXT_FAINT, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: TEXT_MUTED, paddingTop: "0.5rem" }} />
                    <Bar dataKey="nominalAnnual" name={`Nominal Annual ${drawdownMode ? "Wdl." : "Div."}`} fill={GOLD} opacity={0.85} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="realAnnual" name={`Real Annual ${drawdownMode ? "Wdl." : "Div."} (Today's $)`} fill={TEAL} opacity={0.7} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: TEXT_FAINT, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  {drawdownMode ? "Fixed annual withdrawal — amount stays constant while capital depletes." : "Nominal dividends rise as capital compounds; real purchasing power declines with inflation."}
                </p>
              </div>

              {/* Chart 3: Monthly Income — Real vs Nominal */}
              <div style={chartContainerStyle}>
                <SectionHeader icon="◈" title={`Monthly ${drawdownMode ? "Withdrawal" : "Dividend"} Income — Real vs Nominal`} />
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={dividendChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#221a0a" vertical={false} />
                    <XAxis dataKey="age" tick={{ fill: TEXT_FAINT, fontSize: 11 }} axisLine={{ stroke: BORDER }} tickLine={false} />
                    <YAxis tickFormatter={fmtShort} tick={{ fill: TEXT_FAINT, fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
                    <Tooltip content={<CustomTooltip prefix="Monthly · " />} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem", color: TEXT_MUTED, paddingTop: "0.5rem" }} />
                    <Line type="monotone" dataKey="nominalMonthly" name="Nominal Monthly" stroke={AMBER} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="realMonthly" name="Real Monthly (Today's $)" stroke={RUST} strokeWidth={2} strokeDasharray="5 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <p style={{ fontSize: "0.68rem", color: TEXT_FAINT, marginTop: "0.5rem", marginBottom: 0, letterSpacing: "0.04em" }}>
                  The gap between nominal and real widens over time — a useful prompt to think about inflation-linked income needs.
                </p>
              </div>
            </div>
          )}

          {/* ── ACCUMULATION TAB ── */}
          {activeTab === "accumulation" && (
            <div>
              <SectionHeader icon="▲" title="Accumulation Phase" />
              <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${BORDER}` }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                  <thead>
                    <tr style={{ background: "#181410" }}>
                      {["Age", "Year", "Capital (Nominal)", "Capital (Today's $)", "Total Contributions"].map((h) => (
                        <th key={h} style={{ padding: "0.65rem 1rem", textAlign: "right", color: TEXT_MUTED, fontWeight: "normal", fontSize: "0.66rem", letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {accumulation.map((row, i) => {
                      const isRetirement = row.age === safe.retirementAge;
                      return (
                        <tr key={row.age} style={{ background: isRetirement ? "#1e1608" : i % 2 === 0 ? "transparent" : BG_CARD2, borderBottom: `1px solid #1e1a10` }}>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? GOLD : TEXT_MUTED, fontWeight: isRetirement ? "bold" : "normal" }}>{row.age}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: TEXT_FAINT }}>{row.year === 0 ? "Now" : `+${row.year}`}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? AMBER : TEXT_DIM }}>{fmt(row.capital)}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? GOLD_DIM : TEXT_MUTED }}>{fmt(row.capitalToday)}</td>
                          <td style={{ padding: "0.5rem 1rem", textAlign: "right", color: isRetirement ? GOLD_DIM : TEXT_FAINT }}>{fmt(row.totalContributions)}</td>
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
              <SectionHeader icon="◆" title={drawdownMode ? "Drawdown Phase (Post-Retirement)" : "Dividend Income Phase (Post-Retirement)"} />
              <div style={{ overflowX: "auto", borderRadius: 6, border: `1px solid ${BORDER}` }}>
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
                    <tr style={{ background: BG_CARD }}>
                      {["Age", "Capital (Nominal)", "Capital (Today's $)", `Annual ${drawdownMode ? "Wdl" : "Div"} (Nominal)`, `Monthly ${drawdownMode ? "Wdl" : "Div"} (Nominal)`, `Annual ${drawdownMode ? "Wdl" : "Div"} (Today's $)`, `Monthly ${drawdownMode ? "Wdl" : "Div"} (Today's $)`].map((h) => (
                        <th key={h} style={{ padding: "0.6rem 0.5rem", textAlign: "right", color: TEXT_MUTED, fontWeight: "normal", fontSize: "0.6rem", letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: `1px solid ${BORDER}`, whiteSpace: "normal", lineHeight: "1.3", verticalAlign: "bottom" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {retirementRows.map((row, i) => (
                      <tr key={row.age} style={{ background: row.depleted ? "#1a0a0a" : row.year === 0 ? "#1e1608" : i % 2 === 0 ? "transparent" : BG_CARD2, borderBottom: `1px solid #1e1a10`, opacity: row.depleted ? 0.5 : 1 }}>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.year === 0 ? GOLD : row.depleted ? RUST : TEXT_MUTED, fontWeight: row.year === 0 ? "bold" : "normal" }}>{row.age}{row.year === 0 ? " ★" : ""}{row.depleted && row.year > 0 ? " ✕" : ""}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : row.year === 0 ? AMBER : TEXT_DIM }}>{fmt(row.capital)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : row.year === 0 ? GOLD_DIM : TEXT_MUTED }}>{fmt(row.capitalToday)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : TEXT_DIM }}>{row.depleted ? fmt(0) : fmt(row.annualDividend)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : TEXT_DIM }}>{row.depleted ? fmt(0) : fmt(row.monthlyDividend)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : TEXT_MUTED }}>{row.depleted ? fmt(0) : fmt(row.annualToday)}</td>
                        <td style={{ padding: "0.45rem 0.5rem", textAlign: "right", color: row.depleted ? RUST : TEXT_MUTED }}>{row.depleted ? fmt(0) : fmt(row.monthlyToday)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: "0.68rem", color: "#4a3c20", marginTop: "0.75rem", letterSpacing: "0.04em" }}>
                ★ Retirement year. {drawdownMode ? `Fixed annual withdrawal of ${fmt(retirementCapital * safe.dividendRate / 100)} (${safe.dividendRate}% of retirement capital) — funds can be fully depleted.` : "Dividends are paid from yield without eroding principal; capital grows at the post-retirement rate independently."} Today's $ values reflect cumulative inflation from {CURRENT_YEAR}.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
