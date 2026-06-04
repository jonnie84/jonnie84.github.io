import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
  Area, AreaChart, ComposedChart, Legend, CartesianGrid
} from "recharts";

/* ═══════════════════════════════════════════
   STRATEGY DEFINITIONS
   ═══════════════════════════════════════════ */
const STRATEGIES = {
  regularDca: { label: "Regular Monthly DCA", desc: "Invest all cash immediately on receipt", type: "regularDca" },
  hybrid: { label: "Hybrid DCA + War Chest", desc: "Invest some immediately, save rest for dips", type: "hybrid", immPct: 50,
    tiers: [{ dropPct: 10, deployPct: 10 }, { dropPct: 15, deployPct: 15 }, { dropPct: 20, deployPct: 20 }, { dropPct: 25, deployPct: 25 }, { dropPct: 30, deployPct: 30 }] },
  mr1m65: { label: "Mr. 1M65 Crash Buying", desc: "Accumulate cash, deploy on tiered drawdowns", type: "tiered",
    tiers: [{ dropPct: 10, deployPct: 10 }, { dropPct: 15, deployPct: 15 }, { dropPct: 20, deployPct: 20 }, { dropPct: 25, deployPct: 25 }, { dropPct: 30, deployPct: 30 }] },
  housel: { label: "Morgan Housel Crash Buying", desc: "Heavy mid-crash, tapering at extremes", type: "tiered",
    tiers: [{ dropPct: 10, deployPct: 10 }, { dropPct: 15, deployPct: 22 }, { dropPct: 20, deployPct: 30 }, { dropPct: 30, deployPct: 13 }, { dropPct: 40, deployPct: 12.5 }, { dropPct: 50, deployPct: 12.5 }] },
  lumpsum: { label: "Lump Sum at 10% Drop", desc: "Deploy 100% of cash at 10% drawdown", type: "tiered",
    tiers: [{ dropPct: 10, deployPct: 100 }] },
  dca6: { label: "6-Month Triggered DCA", desc: "On 10% drop, spread cash over 6 months", type: "dca", trigDrop: 10, months: 6 },
  dca12: { label: "12-Month Triggered DCA", desc: "On 10% drop, spread cash over 12 months", type: "dca", trigDrop: 10, months: 12 },
  custom: { label: "Custom", desc: "Define your own tiers", type: "tiered",
    tiers: [{ dropPct: 10, deployPct: 10 }, { dropPct: 15, deployPct: 15 }, { dropPct: 20, deployPct: 20 }, { dropPct: 25, deployPct: 25 }, { dropPct: 30, deployPct: 30 }] },
};

const STOOQ = "https://stooq.com/q/d/?i=d";

/* ═══════════════════════════════════════════
   CSV PARSER
   ═══════════════════════════════════════════ */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const hdr = lines[0].split(",").map(s => s.trim().toLowerCase().replace(/"/g, ""));
  const dateIdx = hdr.findIndex(x => x === "date");
  let closeIdx = hdr.findIndex(x => x === "adj close");
  if (closeIdx === -1) closeIdx = hdr.findIndex(x => x === "close");
  if (dateIdx === -1 || closeIdx === -1) return null;
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map(s => s.trim().replace(/"/g, ""));
    const date = cols[dateIdx];
    const close = parseFloat(cols[closeIdx]);
    if (date && !isNaN(close) && close > 0) result.push({ date, close });
  }
  result.sort((a, b) => new Date(a.date) - new Date(b.date));
  return result;
}

function addMonths(dateStr, n) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + n);
  return d;
}

/* ═══════════════════════════════════════════
   XIRR CALCULATION
   ═══════════════════════════════════════════ */
function calcXIRR(cashFlows) {
  if (cashFlows.length < 2) return 0;
  const d0 = cashFlows[0].date.getTime();
  const flows = cashFlows.map(cf => ({
    amt: cf.amount,
    yrs: (cf.date.getTime() - d0) / (365.25 * 86400000)
  }));
  if (flows[flows.length - 1].yrs <= 0.01) return 0;
  function npvAtRate(rate) {
    let npv = 0;
    for (const f of flows) {
      const base = Math.pow(1 + rate, f.yrs);
      if (!isFinite(base) || base === 0) return NaN;
      npv += f.amt / base;
    }
    return npv;
  }
  let lo = -0.5, hi = 5.0;
  let nLo = npvAtRate(lo), nHi = npvAtRate(hi);
  if (isNaN(nLo) || isNaN(nHi)) return 0;
  if (nLo > 0 && nHi > 0) return hi * 100;
  if (nLo < 0 && nHi < 0) return lo * 100;
  if (nLo < 0) { const tmp = lo; lo = hi; hi = tmp; }
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const nMid = npvAtRate(mid);
    if (isNaN(nMid)) { hi = mid; continue; }
    if (Math.abs(nMid) < 0.01) { lo = mid; break; }
    if (nMid > 0) lo = mid; else hi = mid;
    if (Math.abs(hi - lo) < 1e-9) break;
  }
  return lo * 100;
}

/* ═══════════════════════════════════════════
   BACKTEST ENGINE (unchanged logic)
   ═══════════════════════════════════════════ */
function runBacktest(priceData, stratKey, tiers, dcaCfg, hybCfg, startCap, monthlyInj, exitRules) {
  if (!priceData || priceData.length === 0) return null;
  const strat = STRATEGIES[stratKey];
  if (!strat) return null;
  const sType = strat.type;
  const useTier = sType === "tiered";
  const useDCA = sType === "dca";
  const useReg = sType === "regularDca";
  const useHyb = sType === "hybrid";
  const sortedTiers = (useTier || useHyb) ? [...tiers].sort((a, b) => a.dropPct - b.dropPct) : [];
  const immPct = useHyb ? hybCfg.immPct : 0;

  let cash = startCap, shares = 0, ath = priceData[0].close;
  const tiersHit = new Set();
  const trades = [], timeline = [], xirrFlows = [], posReturns = [], openPos = [];
  let totalDeployed = 0, totalRecovered = 0, openCostBasis = 0;
  let totalInjected = startCap, dcaActive = false, dcaTriggered = false;
  let dcaSchedule = [], dcaIdx = 0, dcaLockedCash = 0, lastInjMonth = "";

  if (startCap > 0) xirrFlows.push({ date: new Date(priceData[0].date), amount: -startCap });

  function sellAllPositions(date, close, reason) {
    for (const pos of [...openPos]) {
      const gain = (close - pos.price) / pos.price;
      const proceeds = pos.shares * close;
      cash += proceeds; totalRecovered += proceeds;
      posReturns.push({ entry: pos.date, exit: date, returnPct: gain * 100, holdDays: Math.round((new Date(date) - new Date(pos.date)) / 86400000) });
      trades.push({ date, type: "SELL", price: close, amount: proceeds, shares: pos.shares, reason, returnPct: (gain * 100).toFixed(2) });
    }
    shares = 0; openPos.length = 0; openCostBasis = 0;
    if (dcaActive) { dcaActive = false; dcaSchedule = []; dcaIdx = 0; }
  }

  function sellByCondition(date, close, testFn, reasonFn) {
    const toRemove = [];
    for (let j = openPos.length - 1; j >= 0; j--) {
      const pos = openPos[j];
      if (testFn(pos, close)) {
        toRemove.push(j);
        const gain = ((close - pos.price) / pos.price) * 100;
        const proceeds = pos.shares * close;
        cash += proceeds; totalRecovered += proceeds; shares -= pos.shares;
        posReturns.push({ entry: pos.date, exit: date, returnPct: gain, holdDays: Math.round((new Date(date) - new Date(pos.date)) / 86400000) });
        trades.push({ date, type: "SELL", price: close, amount: proceeds, shares: pos.shares, reason: reasonFn(gain), returnPct: gain.toFixed(2) });
      }
    }
    for (const idx of toRemove) openPos.splice(idx, 1);
    openCostBasis = openPos.reduce((sum, p) => sum + p.shares * p.price, 0);
    if (openPos.length === 0) { shares = 0; openCostBasis = 0; }
    if (openPos.length === 0 && dcaActive) { dcaActive = false; dcaSchedule = []; dcaIdx = 0; }
  }

  function buyShares(date, close, amount, detail) {
    if (amount <= 0.01 || cash <= 0.01) return;
    const actual = Math.min(cash, amount);
    const sharesBought = actual / close;
    cash -= actual; shares += sharesBought; totalDeployed += actual; openCostBasis += actual;
    openPos.push({ date, price: close, shares: sharesBought, athAtBuy: ath });
    trades.push({ date, type: "BUY", price: close, amount: actual, shares: sharesBought, ...detail, drawdown: (((ath - close) / ath) * 100).toFixed(2) });
  }

  function deployTiers(date, close) {
    const drawdown = ((ath - close) / ath) * 100;
    for (const tier of sortedTiers) {
      const key = tier.id || (tier.dropPct + "-" + tier.deployPct);
      if (drawdown >= tier.dropPct && !tiersHit.has(key) && cash > 0.01) {
        buyShares(date, close, cash * tier.deployPct / 100, { tier: tier.dropPct });
        tiersHit.add(key);
      }
    }
  }

  for (let i = 0; i < priceData.length; i++) {
    const date = priceData[i].date, close = priceData[i].close;
    const currentDate = new Date(date), currentMonth = date.slice(0, 7);

    if (close > ath) {
      ath = close; tiersHit.clear(); dcaTriggered = false;
      if (exitRules.enabled && exitRules.mode === "recovery" && exitRules.recoveryPct >= 100 && openPos.length > 0)
        sellAllPositions(date, close, "ATH recovery");
    }
    const drawdown = ((ath - close) / ath) * 100;

    if (exitRules.enabled && exitRules.mode === "gain" && openPos.length > 0)
      sellByCondition(date, close, (pos, cl) => ((cl - pos.price) / pos.price) * 100 >= exitRules.gainPct, () => "+" + exitRules.gainPct + "% gain");
    if (exitRules.enabled && exitRules.mode === "recovery" && exitRules.recoveryPct < 100 && openPos.length > 0) {
      const recoveryTarget = ath - (ath * (100 - exitRules.recoveryPct)) / 100;
      if (close >= recoveryTarget) sellAllPositions(date, close, exitRules.recoveryPct + "% recovery");
    }
    if (exitRules.enabled && exitRules.mode === "athTarget" && openPos.length > 0) {
      const tgtPct = exitRules.athTargetPct;
      sellByCondition(date, close, (pos, cl) => cl >= pos.athAtBuy * (1 + tgtPct / 100), () => "ATH+" + tgtPct + "%");
    }

    let injectedThisTurn = false;
    if (monthlyInj > 0 && currentMonth !== lastInjMonth) {
      const isFirstMonth = lastInjMonth === "";
      lastInjMonth = currentMonth;
      if (!isFirstMonth) {
        cash += monthlyInj; totalInjected += monthlyInj;
        xirrFlows.push({ date: currentDate, amount: -monthlyInj });
        injectedThisTurn = true;
      }
    }

    if (useReg) {
      if (i === 0 && cash > 0.01) buyShares(date, close, cash, { tier: "Day 1" });
      else if (injectedThisTurn && cash > 0.01) buyShares(date, close, cash, { tier: "DCA" });
    }
    if (useHyb) {
      if (i === 0 && startCap > 0 && immPct > 0) buyShares(date, close, Math.min(cash, startCap * immPct / 100), { tier: "Day 1" });
      else if (injectedThisTurn && immPct > 0) buyShares(date, close, Math.min(cash, monthlyInj * immPct / 100), { tier: "Auto" });
      deployTiers(date, close);
    }
    if (useDCA) {
      if (dcaActive && dcaIdx < dcaSchedule.length) {
        while (dcaIdx < dcaSchedule.length && currentDate >= dcaSchedule[dcaIdx].targetDate) {
          buyShares(date, close, Math.min(cash, dcaSchedule[dcaIdx].amount), { tier: "DCA " + (dcaIdx + 1) + "/" + dcaCfg.months });
          dcaIdx++;
        }
        if (dcaIdx >= dcaSchedule.length) dcaActive = false;
      }
      if (!dcaTriggered && drawdown >= dcaCfg.trigDrop && cash > 0.01) {
        dcaLockedCash = cash; dcaTriggered = true; dcaActive = true; dcaIdx = 0; dcaSchedule = [];
        const monthlyAmt = dcaLockedCash / dcaCfg.months;
        for (let m = 0; m < dcaCfg.months; m++) dcaSchedule.push({ targetDate: m === 0 ? currentDate : addMonths(date, m), amount: monthlyAmt });
        buyShares(date, close, Math.min(cash, monthlyAmt), { tier: "DCA 1/" + dcaCfg.months });
        dcaIdx = 1;
      }
    }
    if (useTier) deployTiers(date, close);

    const investedValue = shares * close;
    const depDD = (openCostBasis > 0.01 && openPos.length > 0) ? ((investedValue - openCostBasis) / openCostBasis) * 100 : 0;
    timeline.push({ date, close, portfolioValue: cash + investedValue, cash, invested: investedValue, deployedDD: depDD });
  }

  const lastClose = priceData[priceData.length - 1].close;
  const finalPortfolio = cash + shares * lastClose;
  const totalReturn = totalInjected > 0 ? ((finalPortfolio - totalInjected) / totalInjected) * 100 : 0;
  const startDate = new Date(priceData[0].date), endDate = new Date(priceData[priceData.length - 1].date);
  const years = (endDate - startDate) / (365.25 * 86400000);
  xirrFlows.push({ date: endDate, amount: finalPortfolio });
  const xirr = calcXIRR(xirrFlows);

  for (const pos of openPos) {
    const posGain = ((lastClose - pos.price) / pos.price) * 100;
    posReturns.push({ entry: pos.date, exit: "OPEN", returnPct: posGain, holdDays: Math.round((endDate - new Date(pos.date)) / 86400000) });
  }

  const allReturns = posReturns.map(p => p.returnPct);
  const median = arr => { if (!arr.length) return 0; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const average = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const ddNeg = timeline.filter(t => t.deployedDD < 0).map(t => t.deployedDD);

  return {
    timeline, trades, posReturns,
    sum: {
      totalInjected, finalPortfolio, totalReturn, xirr, years, cash,
      numBuys: trades.filter(t => t.type === "BUY").length,
      numSells: trades.filter(t => t.type === "SELL").length,
      avgDD: average(ddNeg), medDD: median(ddNeg),
      avgPR: average(allReturns), medPR: median(allReturns),
      maxDD: ddNeg.length > 0 ? Math.min(...ddNeg) : 0,
      roundTrips: posReturns.filter(p => p.exit !== "OPEN").length,
    }
  };
}

/* ═══════════════════════════════════════════
   FORMAT HELPERS
   ═══════════════════════════════════════════ */
const fmt = (n, d = 2) => typeof n === "number" ? n.toFixed(d) : "--";
const fmtM = n => typeof n === "number" ? "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "--";
const fmtN = (n, d = 2) => typeof n === "number" ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : "--";
const fmtInt = n => typeof n === "number" ? n.toLocaleString() : "--";
const fmtAxis = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(0);
const fmtPriceAxis = v => v >= 1e6 ? (v / 1e6).toFixed(1) + "M" : v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toLocaleString();

const TIPS = {
  "Total Return": "Simple return: (Final − Injected) / Injected. DCA is typically highest because capital compounds continuously; crash-buying leaves cash idle in bull runs.",
  "XIRR": "Money-weighted annualised return. Accounts for timing of each injection. Solved via bisection for stability.",
  "Final Portfolio": "Cash + open positions at end of backtest.",
  "Trades": "Buy and sell count. Round trips = opened and closed.",
  "Max DD": "Deepest unrealised loss on deployed capital vs cost basis across the entire backtest.",
  "Avg DD": "Average drawdown on days when deployed capital is below cost basis. Only counts loss days.",
  "Med DD": "Midpoint drawdown on loss days. Less sensitive to extreme crash outliers than average.",
  "Avg Pos Ret": "Mean return per position.",
  "Med Pos Ret": "Midpoint return per position.",
};

/* ═══════════════════════════════════════════
   DESIGN TOKENS  (built inside component – kept here as type reference only)
   ═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════ */

// Number input: stores value as string, parses on blur (per ui-design skill)
function NumInput({ value, onChange, min, max, style, placeholder, ariaLabel, T }) {
  const [raw, setRaw] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => { if (!focused) setRaw(String(value)); }, [value, focused]);

  const clamp = n => {
    if (min != null && max != null) return Math.max(min, Math.min(max, n));
    if (min != null) return Math.max(min, n);
    return n;
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*\.?[0-9]*"
      aria-label={ariaLabel || placeholder || "number input"}
      value={focused ? raw : (Number.isInteger(value) ? value.toLocaleString() : String(value))}
      placeholder={placeholder}
      style={{
        width: "100%", padding: "10px 12px",
        background: "rgba(0,0,0,0.3)", border: `1px solid ${T.border}`,
        borderRadius: T.radius, color: T.text, fontSize: "0.875rem",
        fontFamily: T.mono, outline: "none", boxSizing: "border-box",
        transition: "border-color 0.15s",
        ...style,
      }}
      onFocus={e => { setFocused(true); setRaw(String(value)); e.target.style.borderColor = T.borderActive; }}
      onBlur={e => {
        setFocused(false);
        e.target.style.borderColor = T.border;
        const n = parseFloat(raw);
        if (isNaN(n) || !raw.trim()) setRaw(String(value));
        else onChange(clamp(n));
      }}
      onChange={e => {
        const v = e.target.value;
        if (v === "" || /^-?\d*\.?\d*$/.test(v)) {
          setRaw(v);
          const n = parseFloat(v);
          if (!isNaN(n)) onChange(clamp(n));
        }
      }}
    />
  );
}

function MetricCard({ label, value, color, sub, mob, T }) {
  const [tip, setTip] = useState(false);
  return (
    <div
      role="region"
      aria-label={label}
      onMouseEnter={() => { if (!mob) setTip(true); }}
      onMouseLeave={() => setTip(false)}
      onClick={() => { if (mob) setTip(t => !t); }}
      style={{
        background: T.surface, borderRadius: T.radius,
        border: `1px solid ${tip ? T.borderActive : T.border}`,
        padding: mob ? "12px 14px" : "18px 20px",
        position: "relative", cursor: mob ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ fontSize: "0.625rem", fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: mob ? "1rem" : "1.375rem", fontWeight: 700, color: color || T.text, fontFamily: T.mono }}>{value}</div>
      {sub && <div style={{ fontSize: "0.6875rem", color: T.textMuted, marginTop: "4px", fontFamily: T.mono }}>{sub}</div>}
      {tip && TIPS[label] && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
          background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: T.radius,
          padding: "10px 12px", fontSize: "0.6875rem", lineHeight: 1.6, color: T.textSec,
          zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
        }}>{TIPS[label]}</div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children, mob, T }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: mob ? "8px 14px" : "10px 20px",
        background: active ? T.accentSoft : "transparent",
        color: active ? T.accent : T.textMuted,
        border: "none", borderRadius: T.radius, cursor: "pointer",
        fontWeight: active ? 600 : 400, fontSize: mob ? "0.75rem" : "0.8125rem",
        fontFamily: T.sans, whiteSpace: "nowrap",
        outline: "none", transition: "all 0.15s",
        minHeight: "44px",
      }}
      onFocus={e => { e.target.style.boxShadow = `0 0 0 2px ${T.accent}`; }}
      onBlur={e => { e.target.style.boxShadow = "none"; }}
    >{children}</button>
  );
}

function StrategyButton({ active, onClick, label, desc, isBench, mob, T }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: mob ? "10px 12px" : "14px 16px",
        borderRadius: T.radius, cursor: "pointer", textAlign: "left",
        border: `1.5px solid ${active ? T.borderActive : T.border}`,
        background: active ? T.accentSoft : T.surface,
        outline: "none", fontFamily: T.sans,
        minHeight: "44px", transition: "all 0.15s",
      }}
      onFocus={e => { e.target.style.boxShadow = `0 0 0 2px ${T.accent}`; }}
      onBlur={e => { e.target.style.boxShadow = "none"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px", flexWrap: "wrap" }}>
        <span style={{ fontSize: mob ? "0.75rem" : "0.8125rem", fontWeight: 600, color: active ? T.accent : T.text }}>{label}</span>
        {isBench && <span style={{ fontSize: "0.5625rem", fontWeight: 700, color: T.yellow, background: T.yellowSoft, padding: "1px 5px", borderRadius: "4px" }}>BENCHMARK</span>}
      </div>
      <div style={{ fontSize: mob ? "0.625rem" : "0.6875rem", color: T.textMuted, lineHeight: 1.4 }}>{desc}</div>
    </button>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function BacktestApp() {
  document.title = 'Investment Backtester';
  const [mob, setMob] = useState(false);
  useEffect(() => {
    const check = () => setMob(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [priceData, setPriceData] = useState(null);
  const [fileName, setFileName] = useState("");
  const [stratKey, setStratKey] = useState("regularDca");
  const [tiers, setTiers] = useState(STRATEGIES.mr1m65.tiers.map((t, i) => ({ ...t, id: i + 1 })));
  const [dcaCfg, setDcaCfg] = useState({ trigDrop: 10, months: 6 });
  const [hybCfg, setHybCfg] = useState({ immPct: 50 });
  const [startCap, setStartCap] = useState(10000);
  const [monthlyInj, setMonthlyInj] = useState(500);
  const [exitRules, setExitRules] = useState({ enabled: true, mode: "recovery", recoveryPct: 100, gainPct: 20, athTargetPct: 10 });
  const [activeTab, setActiveTab] = useState("overview");
  const [nextId, setNextId] = useState(100);
  const [showMeth, setShowMeth] = useState(false);
  const [dateRange, setDateRange] = useState([0, 0]);
  const [dark, setDark] = useState(true);

  const T = {
    bg:           dark ? '#0f0f1a'                    : '#f4f4fc',
    surface:      dark ? '#1a1a2e'                    : '#ffffff',
    surfaceRaised:dark ? '#222240'                    : '#f0f0fa',
    border:       dark ? 'rgba(255,255,255,0.07)'     : 'rgba(0,0,0,0.09)',
    borderActive: dark ? 'rgba(99,132,255,0.35)'      : 'rgba(99,102,241,0.40)',
    text:         dark ? '#e0e0ee'                    : '#1a1a2e',
    textSec:      dark ? '#9898b0'                    : '#4a4a6a',
    textMuted:    dark ? '#5e5e78'                    : '#6868a0',
    accent:       '#6366f1',
    accentSoft:   dark ? 'rgba(99,102,241,0.12)'      : 'rgba(99,102,241,0.10)',
    green:        dark ? '#34d399'                    : '#059669',
    greenSoft:    dark ? 'rgba(52,211,153,0.1)'       : 'rgba(5,150,105,0.08)',
    red:          dark ? '#f87171'                    : '#dc2626',
    redSoft:      dark ? 'rgba(248,113,113,0.1)'      : 'rgba(220,38,38,0.08)',
    yellow:       dark ? '#fbbf24'                    : '#d97706',
    yellowSoft:   dark ? 'rgba(251,191,36,0.08)'      : 'rgba(217,119,6,0.08)',
    blue:         dark ? '#60a5fa'                    : '#2563eb',
    blueSoft:     dark ? 'rgba(96,165,250,0.1)'       : 'rgba(37,99,235,0.08)',
    radius:       '8px',
    mono:         "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
    sans:         "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  };

  const sType = STRATEGIES[stratKey]?.type || "";
  const showTierEditor = sType === "tiered" || sType === "hybrid";

  const monthList = useMemo(() => {
    if (!priceData) return [];
    const mSet = {};
    for (const d of priceData) mSet[d.date.slice(0, 7)] = true;
    return Object.keys(mSet).sort();
  }, [priceData]);

  const handleFile = useCallback(e => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseCSV(ev.target.result);
      if (parsed && parsed.length > 0) {
        setPriceData(parsed);
        const mSet = {};
        for (const d of parsed) mSet[d.date.slice(0, 7)] = true;
        const sorted = Object.keys(mSet).sort();
        setDateRange([0, sorted.length - 1]);
      } else alert("Could not parse CSV. Needs Date and Close columns.");
    };
    reader.readAsText(file);
  }, []);

  function pickStrategy(key) {
    setStratKey(key);
    const s = STRATEGIES[key];
    if (s.type === "tiered") setTiers(s.tiers.map((t, i) => ({ ...t, id: i + 1 })));
    else if (s.type === "hybrid") {
      setTiers(s.tiers.map((t, i) => ({ ...t, id: i + 1 })));
      setHybCfg({ immPct: s.immPct });
    } else if (s.type === "dca") setDcaCfg({ trigDrop: s.trigDrop, months: s.months });
  }

  function addTier() {
    setTiers([...tiers, { id: nextId, dropPct: 10, deployPct: 10 }]);
    setNextId(nextId + 1);
    if (sType === "tiered" && stratKey !== "custom") setStratKey("custom");
  }
  function removeTier(id) {
    setTiers(tiers.filter(t => t.id !== id));
    if (sType === "tiered" && stratKey !== "custom") setStratKey("custom");
  }
  function updateTier(id, field, val) {
    setTiers(tiers.map(t => t.id !== id ? t : { ...t, [field]: Math.max(0, Math.min(100, parseFloat(val) || 0)) }));
    if (sType === "tiered" && stratKey !== "custom") setStratKey("custom");
  }

  const filteredData = useMemo(() => {
    if (!priceData || monthList.length === 0) return null;
    const startMonth = monthList[dateRange[0]] || monthList[0];
    const endMonth = monthList[dateRange[1]] || monthList[monthList.length - 1];
    return priceData.filter(d => { const m = d.date.slice(0, 7); return m >= startMonth && m <= endMonth; });
  }, [priceData, monthList, dateRange]);

  const results = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    return runBacktest(filteredData, stratKey, tiers, dcaCfg, hybCfg, startCap, monthlyInj, exitRules);
  }, [filteredData, stratKey, tiers, dcaCfg, hybCfg, startCap, monthlyInj, exitRules]);

  const downSample = arr => {
    const target = mob ? 300 : 500;
    const step = Math.max(1, Math.floor(arr.length / target));
    return arr.filter((_, i) => i % step === 0);
  };

  const rs = results?.sum;
  const gap = mob ? "8px" : "16px";
  const chartH = mob ? 260 : 400;
  const chartMargin = { top: 10, right: mob ? 4 : 24, bottom: 4, left: mob ? 0 : 16 };
  const axTick = { fontSize: mob ? 9 : 11, fill: T.textMuted };
  const tooltipStyle = { background: T.surfaceRaised, border: `1px solid ${T.border}`, borderRadius: T.radius, fontSize: "0.6875rem" };

  // Shared section panel style
  const panel = {
    background: T.surface, borderRadius: T.radius,
    border: `1px solid ${T.border}`, padding: mob ? "16px" : "24px",
  };
  const sectionLabel = {
    fontSize: "0.6875rem", fontWeight: 700, color: T.textMuted,
    textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px",
  };

  return (
    <div style={{ fontFamily: T.sans, background: T.bg, color: T.text, minHeight: "100vh", padding: mob ? "16px" : "40px", maxWidth: "1200px", margin: "0 auto" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <header style={{ marginBottom: mob ? "20px" : "36px", paddingBottom: "20px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
          <a href="../../" style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.textSec,fontSize:13,fontFamily:T.sans,textDecoration:'none' }}>⌂ Home</a>
          <button onClick={() => setDark(d => !d)} style={{ display:'inline-flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:8,border:`1px solid ${T.border}`,background:T.surface,color:T.textSec,fontSize:13,fontFamily:T.sans,cursor:'pointer' }}>{dark ? '☀ Light' : '☾ Dark'}</button>
        </div>
        <h1 style={{ fontSize: mob ? "1.25rem" : "1.75rem", fontWeight: 800, margin: 0, color: T.text }}>Drawdown Strategy Backtester</h1>
        <p style={{ fontSize: mob ? "0.75rem" : "0.8125rem", color: T.textMuted, margin: "6px 0 0" }}>Test capital deployment strategies with monthly injections</p>
      </header>

      {/* ── CONFIG GRID ── */}
      <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr" : "1fr 1fr", gap, marginBottom: gap }}>
        {/* Price Data Panel */}
        <div style={panel}>
          <h2 style={sectionLabel}>Price Data</h2>
          <label style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: mob ? "12px" : "16px", borderRadius: T.radius,
            border: `1.5px dashed ${priceData ? "rgba(52,211,153,0.4)" : T.border}`,
            cursor: "pointer", fontSize: mob ? "0.8125rem" : "0.875rem", fontWeight: 500,
            color: priceData ? T.green : T.textMuted,
            background: priceData ? T.greenSoft : "transparent",
            minHeight: "48px", transition: "all 0.15s",
          }}>
            <input type="file" accept=".csv" onChange={handleFile} style={{ display: "none" }} />
            {priceData ? `${fileName} \u2014 ${priceData.length.toLocaleString()} pts` : "Upload price CSV"}
          </label>

          {!priceData && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "0.6875rem", color: T.textMuted }}>CSV with Date and Close columns. Any stock/index.</p>
              <a href={STOOQ} target="_blank" rel="noopener noreferrer" style={{
                display: "inline-flex", alignItems: "center", gap: "4px",
                padding: "8px 14px", borderRadius: T.radius, background: T.blueSoft,
                color: T.blue, fontSize: "0.6875rem", fontWeight: 600,
                textDecoration: "none", border: `1px solid rgba(96,165,250,0.15)`,
                minHeight: "36px",
              }}>{"\u2193"} Download from Stooq</a>
            </div>
          )}

          {priceData && <p style={{ fontSize: "0.625rem", color: T.textMuted, margin: "8px 0 0", fontFamily: T.mono }}>{priceData[0].date} to {priceData[priceData.length - 1].date}</p>}

          {priceData && monthList.length > 1 && (
            <div style={{ marginTop: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.625rem", color: T.textMuted, fontWeight: 600, textTransform: "uppercase" }}>Period</span>
                <span style={{ fontSize: "0.6875rem", color: T.accent, fontFamily: T.mono }}>{monthList[dateRange[0]]} to {monthList[dateRange[1]]}</span>
              </div>
              {(() => {
                const maxIdx = Math.max(1, monthList.length - 1);
                const pctFrom = (dateRange[0] / maxIdx) * 100;
                const pctTo = (dateRange[1] / maxIdx) * 100;
                const trackBg = `linear-gradient(to right, rgba(255,255,255,0.1) ${pctFrom}%, ${T.accent} ${pctFrom}%, ${T.accent} ${pctTo}%, rgba(255,255,255,0.1) ${pctTo}%)`;
                return (
                  <div style={{ position: "relative", height: "32px", marginBottom: "4px" }}>
                    {/* Track */}
                    <div style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)", height: "4px", borderRadius: "2px", background: trackBg, pointerEvents: "none" }} />
                    {/* From thumb */}
                    <input type="range" min={0} max={maxIdx}
                      value={dateRange[0]}
                      aria-label="From month"
                      onChange={e => { const v = parseInt(e.target.value); setDateRange([Math.min(v, dateRange[1]), dateRange[1]]); }}
                      style={{
                        position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
                        WebkitAppearance: "none", appearance: "none",
                        background: "transparent", cursor: "pointer",
                        pointerEvents: "none", zIndex: dateRange[0] > maxIdx - 5 ? 3 : 2,
                      }}
                    />
                    {/* To thumb */}
                    <input type="range" min={0} max={maxIdx}
                      value={dateRange[1]}
                      aria-label="To month"
                      onChange={e => { const v = parseInt(e.target.value); setDateRange([dateRange[0], Math.max(v, dateRange[0])]); }}
                      style={{
                        position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
                        WebkitAppearance: "none", appearance: "none",
                        background: "transparent", cursor: "pointer",
                        pointerEvents: "none", zIndex: 2,
                      }}
                    />
                    <style>{`
                      input[type=range]::-webkit-slider-thumb {
                        -webkit-appearance: none; appearance: none;
                        width: 16px; height: 16px; border-radius: 50%;
                        background: ${T.accent}; border: 2px solid ${T.bg};
                        cursor: pointer; box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
                        pointer-events: auto;
                      }
                      input[type=range]::-moz-range-thumb {
                        width: 16px; height: 16px; border-radius: 50%;
                        background: ${T.accent}; border: 2px solid ${T.bg};
                        cursor: pointer; box-shadow: 0 0 0 2px rgba(99,102,241,0.3);
                        pointer-events: auto;
                      }
                      input[type=range]::-webkit-slider-runnable-track { background: transparent; }
                      input[type=range]::-moz-range-track { background: transparent; }
                    `}</style>
                  </div>
                );
              })()}
              {filteredData && <p style={{ fontSize: "0.5625rem", color: T.textMuted, margin: "4px 0 0", fontFamily: T.mono }}>{filteredData.length.toLocaleString()} trading days</p>}
            </div>
          )}
        </div>

        {/* Settings Panel */}
        <div style={panel}>
          <h2 style={sectionLabel}>Settings</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "0.6875rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 500 }}>Starting Capital ($)</label>
              <NumInput value={startCap} onChange={v => setStartCap(Math.round(v))} min={0} ariaLabel="Starting capital" T={T} />
            </div>
            <div>
              <label style={{ fontSize: "0.6875rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 500 }}>Monthly Injection ($)</label>
              <NumInput value={monthlyInj} onChange={v => setMonthlyInj(Math.round(v))} min={0} ariaLabel="Monthly injection" T={T} />
            </div>
          </div>

          {/* Exit Rules */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
            <label style={{ fontSize: "0.6875rem", color: T.textMuted, fontWeight: 500 }}>Exit Rules</label>
            <button
              onClick={() => setExitRules({ ...exitRules, enabled: !exitRules.enabled })}
              aria-pressed={exitRules.enabled}
              style={{
                padding: "4px 14px", borderRadius: "20px", border: "none",
                fontSize: "0.625rem", fontWeight: 700, cursor: "pointer", fontFamily: T.sans,
                background: exitRules.enabled ? T.greenSoft : "rgba(255,255,255,0.04)",
                color: exitRules.enabled ? T.green : T.textMuted,
                minHeight: "32px", transition: "all 0.15s",
              }}
            >{exitRules.enabled ? "ON" : "OFF"}</button>
          </div>

          {exitRules.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {[["recovery", "ATH Recovery %"], ["gain", "Pos Gain %"], ["athTarget", "ATH + Target %"]].map(([m, label]) => (
                  <button key={m} onClick={() => setExitRules({ ...exitRules, mode: m })}
                    style={{
                      flex: "1 1 auto", padding: mob ? "8px" : "8px 12px",
                      borderRadius: T.radius, border: `1px solid ${exitRules.mode === m ? T.borderActive : T.border}`,
                      fontSize: "0.6875rem", cursor: "pointer", fontFamily: T.sans, fontWeight: 500,
                      background: exitRules.mode === m ? T.accentSoft : "transparent",
                      color: exitRules.mode === m ? T.accent : T.textMuted,
                      whiteSpace: "nowrap", minHeight: "40px", transition: "all 0.15s", outline: "none",
                    }}
                  >{label}</button>
                ))}
              </div>
              <NumInput
                value={exitRules.mode === "recovery" ? exitRules.recoveryPct : exitRules.mode === "gain" ? exitRules.gainPct : exitRules.athTargetPct}
                onChange={v => {
                  const update = {};
                  if (exitRules.mode === "recovery") update.recoveryPct = v;
                  else if (exitRules.mode === "gain") update.gainPct = v;
                  else update.athTargetPct = v;
                  setExitRules({ ...exitRules, ...update });
                }}
                min={0}
                style={{ padding: "8px 12px", fontSize: "0.8125rem" }}
                ariaLabel="Exit rule value"
                T={T}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── STRATEGY ── */}
      <div style={{ ...panel, marginBottom: gap }}>
        <h2 style={sectionLabel}>Strategy</h2>
        <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap: mob ? "6px" : "10px", marginBottom: "16px" }}>
          {Object.keys(STRATEGIES).map(key => (
            <StrategyButton key={key} active={stratKey === key} onClick={() => pickStrategy(key)}
              label={STRATEGIES[key].label} desc={STRATEGIES[key].desc}
              isBench={STRATEGIES[key].type === "regularDca"} mob={mob} T={T} />
          ))}
        </div>

        {sType === "regularDca" && (
          <div style={{ padding: "12px 16px", background: "rgba(0,0,0,0.2)", borderRadius: T.radius, fontSize: "0.75rem", color: T.textMuted, lineHeight: 1.5 }}>
            Invests all cash immediately: starting capital on day 1, injections on receipt, sale proceeds on next injection.
          </div>
        )}

        {sType === "hybrid" && (
          <div style={{ marginBottom: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "rgba(0,0,0,0.2)", borderRadius: T.radius, padding: "14px 16px", marginBottom: "8px" }}>
              <div>
                <label style={{ fontSize: "0.625rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Invest Immediately (%)</label>
                <NumInput value={hybCfg.immPct} onChange={v => setHybCfg({ immPct: v })} min={0} max={100} style={{ color: T.green }} ariaLabel="Immediate investment percentage" T={T} />
              </div>
              <div>
                <label style={{ fontSize: "0.625rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>War Chest (%)</label>
                <div style={{ padding: "10px 12px", fontSize: "0.875rem", fontFamily: T.mono, color: T.yellow }}>{(100 - hybCfg.immPct).toFixed(0)}%</div>
              </div>
            </div>
            <div style={{ fontSize: "0.6875rem", color: T.textMuted }}>War chest deployed via tiers below:</div>
          </div>
        )}

        {sType === "dca" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "rgba(0,0,0,0.2)", borderRadius: T.radius, padding: "14px 16px" }}>
            <div>
              <label style={{ fontSize: "0.625rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Trigger Drop %</label>
              <NumInput value={dcaCfg.trigDrop} onChange={v => setDcaCfg({ ...dcaCfg, trigDrop: v })} min={1} max={90} style={{ color: T.red }} ariaLabel="Trigger drop percentage" T={T} />
            </div>
            <div>
              <label style={{ fontSize: "0.625rem", color: T.textMuted, display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase" }}>Spread Over (months)</label>
              <NumInput value={dcaCfg.months} onChange={v => setDcaCfg({ ...dcaCfg, months: Math.round(v) })} min={2} max={60} style={{ color: T.green }} ariaLabel="DCA spread months" T={T} />
            </div>
          </div>
        )}

        {showTierEditor && (
          <div style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
              <span style={{ fontSize: "0.6875rem", color: T.textMuted }}>Deploy % of available cash at trigger</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {tiers.length > 1 && (
                  <button onClick={() => removeTier(tiers[tiers.length - 1].id)} style={{
                    padding: "6px 12px", borderRadius: T.radius, border: `1px solid rgba(248,113,113,0.2)`,
                    background: T.redSoft, color: T.red, fontSize: "0.6875rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: T.sans, minHeight: "36px",
                  }}>{"\u2212"} Remove</button>
                )}
                <button onClick={addTier} style={{
                  padding: "6px 12px", borderRadius: T.radius, border: `1px solid rgba(99,102,241,0.2)`,
                  background: T.accentSoft, color: T.accent, fontSize: "0.6875rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: T.sans, minHeight: "36px",
                }}>+ Add</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: "8px" }}>
              {tiers.map((tier, idx) => (
                <div key={tier.id} style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 12px", background: "rgba(0,0,0,0.2)",
                  borderRadius: T.radius, border: `1px solid ${T.border}`,
                }}>
                  <span style={{ fontSize: "0.625rem", color: T.textMuted, fontWeight: 700, minWidth: "14px" }}>{idx + 1}</span>
                  <div style={{ flex: 1, display: "flex", gap: "6px", alignItems: "center" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.5rem", color: T.textMuted, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Drop</label>
                      <NumInput value={tier.dropPct} onChange={v => updateTier(tier.id, "dropPct", v)} min={0} max={100}
                        style={{ padding: "6px 8px", fontSize: "0.8125rem", color: T.red }} ariaLabel={`Tier ${idx + 1} drop`} T={T} />
                    </div>
                    <span style={{ color: T.textMuted, fontSize: "0.75rem", marginTop: "12px" }}>{"\u2192"}</span>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "0.5rem", color: T.textMuted, fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "2px" }}>Deploy</label>
                      <NumInput value={tier.deployPct} onChange={v => updateTier(tier.id, "deployPct", v)} min={0} max={100}
                        style={{ padding: "6px 8px", fontSize: "0.8125rem", color: T.green }} ariaLabel={`Tier ${idx + 1} deploy`} T={T} />
                    </div>
                  </div>
                  {tiers.length > 1 && (
                    <button onClick={() => removeTier(tier.id)} aria-label={`Remove tier ${idx + 1}`}
                      style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", fontSize: "0.875rem", marginTop: "10px", padding: "4px", minWidth: "28px", minHeight: "28px" }}>
                      {"\u00d7"}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RESULTS ── */}
      {rs && (
        <div>
          {/* Metric cards */}
          <div style={{ display: "grid", gridTemplateColumns: mob ? "1fr 1fr" : "repeat(4, 1fr)", gap, marginBottom: gap }}>
            <MetricCard label="Total Return" value={fmtN(rs.totalReturn) + "%"} color={rs.totalReturn >= 0 ? T.green : T.red} sub={`Injected: ${fmtM(rs.totalInjected)}`} mob={mob} T={T} />
            <MetricCard label="XIRR" value={fmtN(rs.xirr) + "%"} color={rs.xirr >= 0 ? T.green : T.red} sub="Annualised" mob={mob} T={T} />
            <MetricCard label="Final Portfolio" value={fmtM(rs.finalPortfolio)} sub={`${fmtN(rs.years, 1)} yrs`} mob={mob} T={T} />
            <MetricCard label="Trades" value={`${fmtInt(rs.numBuys)}B / ${fmtInt(rs.numSells)}S`} color={T.accent} sub={`${fmtInt(rs.roundTrips)} round trips`} mob={mob} T={T} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap, marginBottom: gap }}>
            <MetricCard label="Max DD" value={fmtN(rs.maxDD) + "%"} color={T.red} mob={mob} T={T} />
            <MetricCard label="Avg DD" value={fmtN(rs.avgDD) + "%"} color={T.red} mob={mob} T={T} />
            <MetricCard label="Med DD" value={fmtN(rs.medDD) + "%"} color={T.red} mob={mob} T={T} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap, marginBottom: gap }}>
            <MetricCard label="Avg Pos Ret" value={fmtN(rs.avgPR) + "%"} color={rs.avgPR >= 0 ? T.green : T.red} mob={mob} T={T} />
            <MetricCard label="Med Pos Ret" value={fmtN(rs.medPR) + "%"} color={rs.medPR >= 0 ? T.green : T.red} mob={mob} T={T} />
          </div>

          {/* Methodology accordion */}
          <div style={{ ...panel, marginBottom: gap, padding: 0, overflow: "hidden" }}>
            <button
              onClick={() => setShowMeth(!showMeth)}
              aria-expanded={showMeth}
              style={{
                width: "100%", padding: "14px 20px", background: "none", border: "none",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                color: T.textMuted, fontFamily: T.sans, minHeight: "48px",
              }}
            >
              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Methodology</span>
              <span style={{ transform: showMeth ? "rotate(180deg)" : "none", transition: "transform 0.2s", fontSize: "0.75rem" }}>{"\u25BE"}</span>
            </button>
            {showMeth && (
              <div style={{ padding: "0 20px 20px", fontSize: "0.75rem", lineHeight: 1.7, color: T.textSec }}>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>Execution order per day:</strong> 1. ATH update + exit sells. 2. Monthly injection. 3. Strategy buys.</p>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>Capital:</strong> Starting capital + monthly injections. Cash earns nothing. Injections on first trading day of each month. All trades at closing price, no slippage/commissions/dividends.</p>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>Strategies:</strong> Regular DCA invests ALL cash immediately (day 1 + injections + sale proceeds). Hybrid invests x% immediately, rest via tiers. Crash-buying accumulates all cash for tier deployment. Triggered DCA spreads cash over N months on drawdown. Tiers deploy % of available cash. Tiers reset on new ATH.</p>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>Why DCA returns are higher:</strong> Regular DCA keeps capital fully invested and compounding. Crash-buying leaves cash idle in bull runs. Over long periods in rising markets, time in the market typically beats timing the market.</p>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>XIRR:</strong> Money-weighted annualised return. Each injection is a negative cash flow; final portfolio is positive. Solved via bisection for numerical stability.</p>
                <p style={{ marginBottom: "10px" }}><strong style={{ color: T.accent }}>Deployed Drawdown:</strong> (Market value − cost basis) / cost basis. Positive = in profit, negative = underwater. Max/Avg/Med DD only count days below cost basis. Resets to 0 when all positions sold.</p>
                <div style={{ marginTop: "8px", padding: "10px 14px", background: T.yellowSoft, borderRadius: T.radius, border: `1px solid rgba(251,191,36,0.12)`, color: "#b8860b", fontSize: "0.6875rem" }}>
                  {mob ? "Tap" : "Hover over"} metric cards for descriptions.
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: "2px", marginBottom: gap,
            background: T.surface, borderRadius: T.radius, padding: "4px",
            overflowX: "auto", border: `1px solid ${T.border}`,
            width: "fit-content", maxWidth: "100%",
          }}>
            {[["overview", "Overview"], ["drawdown", "Drawdown"], ["capital", "Capital"], ["trades", "Trades"], ["positions", "Positions"]].map(([id, label]) => (
              <TabButton key={id} active={activeTab === id} onClick={() => setActiveTab(id)} mob={mob} T={T}>{label}</TabButton>
            ))}
          </div>

          {/* Chart / Table panel */}
          <div style={panel}>
            {activeTab === "overview" && (
              <div>
                <div style={{ fontSize: mob ? "0.875rem" : "1rem", fontWeight: 600, marginBottom: "16px", color: T.text }}>Portfolio Value vs Price</div>
                <ResponsiveContainer width="100%" height={chartH}>
                  <ComposedChart data={downSample(results.timeline)} margin={chartMargin}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={axTick} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" minTickGap={mob ? 30 : 60} />
                    <YAxis yAxisId="l" tick={axTick} tickFormatter={fmtAxis} />
                    <YAxis yAxisId="r" orientation="right" tick={axTick} tickFormatter={fmtPriceAxis} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.textMuted }} formatter={(v, name) => [name === "Price" ? fmtN(v, 2) : fmtM(v), name]} />
                    <Legend wrapperStyle={{ fontSize: "0.6875rem" }} />
                    <Line yAxisId="r" type="monotone" dataKey="close" name="Price" stroke={T.textMuted} strokeWidth={1} dot={false} />
                    <Line yAxisId="l" type="monotone" dataKey="portfolioValue" name="Portfolio" stroke={T.accent} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "drawdown" && (
              <div>
                <div style={{ fontSize: mob ? "0.875rem" : "1rem", fontWeight: 600, marginBottom: "4px", color: T.text }}>Deployed Capital Drawdown</div>
                <div style={{ fontSize: "0.6875rem", color: T.textMuted, marginBottom: "16px" }}>P&L vs cost basis. 0% = breakeven.</div>
                <ResponsiveContainer width="100%" height={chartH}>
                  <ComposedChart data={downSample(results.timeline)} margin={chartMargin}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={axTick} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" minTickGap={mob ? 30 : 60} />
                    <YAxis tick={axTick} tickFormatter={v => v.toFixed(0) + "%"} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.textMuted }} formatter={v => [v.toFixed(2) + "%", "P&L"]} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.12)" />
                    <Line type="monotone" dataKey="deployedDD" stroke={T.accent} strokeWidth={1.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "capital" && (
              <div>
                <div style={{ fontSize: mob ? "0.875rem" : "1rem", fontWeight: 600, marginBottom: "16px", color: T.text }}>Capital Allocation</div>
                <ResponsiveContainer width="100%" height={chartH}>
                  <AreaChart data={downSample(results.timeline)} margin={chartMargin}>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={axTick} tickFormatter={d => d.slice(0, 7)} interval="preserveStartEnd" minTickGap={mob ? 30 : 60} />
                    <YAxis tick={axTick} tickFormatter={fmtAxis} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: T.textMuted }} formatter={v => [fmtM(v), ""]} />
                    <Legend wrapperStyle={{ fontSize: "0.6875rem" }} />
                    <defs>
                      <linearGradient id="invG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.green} stopOpacity={0.2} /><stop offset="100%" stopColor={T.green} stopOpacity={0.02} /></linearGradient>
                      <linearGradient id="cashG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={T.accent} stopOpacity={0.2} /><stop offset="100%" stopColor={T.accent} stopOpacity={0.02} /></linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="invested" name="Invested" stackId="1" stroke={T.green} fill="url(#invG)" strokeWidth={1} />
                    <Area type="monotone" dataKey="cash" name="Cash" stackId="1" stroke={T.accent} fill="url(#cashG)" strokeWidth={1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {activeTab === "trades" && (
              <div>
                <div style={{ fontSize: mob ? "0.875rem" : "1rem", fontWeight: 600, marginBottom: "16px", color: T.text }}>Trades ({fmtInt(results.trades.length)})</div>
                <div style={{ maxHeight: "420px", overflowX: "auto", overflowY: "auto", borderRadius: T.radius, border: `1px solid ${T.border}`, WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", minWidth: mob ? "520px" : "auto", borderCollapse: "collapse", fontSize: "0.6875rem", fontFamily: T.mono }}>
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.3)", position: "sticky", top: 0, zIndex: 1 }}>
                        {["Date", "Type", "Price", "Amount", "Shares", "Detail"].map(h => (
                          <th key={h} style={{ padding: "10px", textAlign: "left", color: T.textMuted, fontWeight: 700, fontSize: "0.5625rem", textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.trades.map((t, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                          <td style={{ padding: "8px 10px", color: T.textSec }}>{t.date}</td>
                          <td style={{ padding: "8px 10px", color: t.type === "BUY" ? T.green : T.red, fontWeight: 600 }}>{t.type}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtN(t.price, 2)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtM(t.amount)}</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtN(t.shares, 4)}</td>
                          <td style={{ padding: "8px 10px", color: T.textMuted, fontSize: "0.625rem" }}>
                            {t.type === "BUY" ? `${t.tier || "--"} | DD ${t.drawdown}%` : `${t.reason} | ${t.returnPct}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "positions" && (
              <div>
                <div style={{ fontSize: mob ? "0.875rem" : "1rem", fontWeight: 600, marginBottom: "16px", color: T.text }}>Positions ({fmtInt(results.posReturns.length)})</div>
                <div style={{ maxHeight: "420px", overflowX: "auto", overflowY: "auto", borderRadius: T.radius, border: `1px solid ${T.border}`, WebkitOverflowScrolling: "touch" }}>
                  <table style={{ width: "100%", minWidth: mob ? "380px" : "auto", borderCollapse: "collapse", fontSize: "0.6875rem", fontFamily: T.mono }}>
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.3)", position: "sticky", top: 0, zIndex: 1 }}>
                        {["Entry", "Exit", "Return", "Days"].map(h => (
                          <th key={h} style={{ padding: "10px", textAlign: "left", color: T.textMuted, fontWeight: 700, fontSize: "0.5625rem", textTransform: "uppercase", borderBottom: `1px solid ${T.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.posReturns.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)`, background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.015)" }}>
                          <td style={{ padding: "8px 10px", color: T.textSec }}>{p.entry}</td>
                          <td style={{ padding: "8px 10px", color: p.exit === "OPEN" ? T.yellow : T.textSec }}>{p.exit}</td>
                          <td style={{ padding: "8px 10px", color: p.returnPct >= 0 ? T.green : T.red, fontWeight: 600, textAlign: "right" }}>{fmtN(p.returnPct)}%</td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>{fmtInt(p.holdDays)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EMPTY STATE ── */}
      {!priceData && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: mob ? "48px 20px" : "96px 20px", color: T.textMuted }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.3, marginBottom: "16px" }}>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <p style={{ fontSize: "0.875rem", fontWeight: 500 }}>Upload price data to begin</p>
          <p style={{ fontSize: "0.75rem", marginTop: "4px", color: T.textMuted }}>CSV with Date and Close columns from any source</p>
        </div>
      )}
    </div>
  );
}
