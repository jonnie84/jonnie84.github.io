import { useState, useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Label, ReferenceDot
} from "recharts";

const EXAMPLES = [
  { label: "y = x² − 5x + 6", a: 1, b: -5, c: 6, note: "Two x-intercepts, opens upward" },
  { label: "y = x² − 4", a: 1, b: 0, c: -4, note: "Symmetric about y-axis" },
  { label: "y = −x² + 2x + 3", a: -1, b: 2, c: 3, note: "Opens downward, two x-intercepts" },
  { label: "y = x² + 2x + 1", a: 1, b: 2, c: 1, note: "Touches x-axis at one point" },
  { label: "y = x² + 1", a: 1, b: 0, c: 1, note: "No x-intercepts" },
  { label: "y = −x² + 4x − 4", a: -1, b: 4, c: -4, note: "Opens downward, one x-intercept" },
];

function fmtN(n) {
  if (Math.abs(n) < 0.0001) return "0";
  const r = parseFloat(n.toFixed(2));
  return r % 1 === 0 ? r.toString() : r.toString();
}

function buildEquationStr(a, b, c) {
  const aTerm = a === 1 ? "x²" : a === -1 ? "−x²" : `${a}x²`;
  const bAbs = Math.abs(b);
  const bTerm = b === 0 ? "" : b === 1 ? " + x" : b === -1 ? " − x" : b > 0 ? ` + ${b}x` : ` − ${bAbs}x`;
  const cTerm = c === 0 ? "" : c > 0 ? ` + ${c}` : ` − ${Math.abs(c)}`;
  return `y = ${aTerm}${bTerm}${cTerm}`;
}

function calcY(a, b, c, x) {
  return a * x * x + b * x + c;
}

const VOCAB = [
  { term: "Parabola", def: "The U-shaped (or ∩-shaped) curve formed by a quadratic equation." },
  { term: "Turning Point", def: "The lowest point (minimum) if the curve opens upward, or the highest point (maximum) if it opens downward. Also called the vertex." },
  { term: "Line of Symmetry", def: "The vertical line that passes through the turning point, dividing the parabola into two mirror halves." },
  { term: "x-intercept", def: "Where the curve crosses the x-axis (y = 0). Also called roots or solutions." },
  { term: "y-intercept", def: "Where the curve crosses the y-axis (x = 0). Its value is always equal to c." },
];

export default function QuadraticExplorer() {
  const [a, setA] = useState(1);
  const [b, setB] = useState(-5);
  const [c, setC] = useState(6);
  const [activeTab, setActiveTab] = useState("steps");
  const [expandedStep, setExpandedStep] = useState(null);

  const analysis = useMemo(() => {
    if (a === 0) return null;
    const vertexX = -b / (2 * a);
    const vertexY = calcY(a, b, c, vertexX);
    const disc = b * b - 4 * a * c;
    let roots = [];
    if (disc > 0) {
      roots = [
        (-b + Math.sqrt(disc)) / (2 * a),
        (-b - Math.sqrt(disc)) / (2 * a),
      ].sort((x, y) => x - y);
    } else if (Math.abs(disc) < 0.0001) {
      roots = [-b / (2 * a)];
    }

    const allX = [vertexX, ...roots, 0];
    const rawMin = Math.min(...allX);
    const rawMax = Math.max(...allX);
    const pad = Math.max(3, (rawMax - rawMin) * 0.6);
    const minX = Math.floor(rawMin - pad);
    const maxX = Math.ceil(rawMax + pad);

    const points = [];
    const numSteps = (maxX - minX) * 20;
    for (let i = 0; i <= numSteps; i++) {
      const x = minX + (i / numSteps) * (maxX - minX);
      const y = calcY(a, b, c, x);
      points.push({ x: parseFloat(x.toFixed(3)), y: parseFloat(y.toFixed(3)) });
    }

    const tableXs = [];
    for (let x = minX; x <= maxX; x++) {
      tableXs.push({ x, y: calcY(a, b, c, x) });
    }

    const ys = points.map(p => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const yPad = Math.max(2, (maxY - minY) * 0.2);
    const domainY = [Math.floor(minY - yPad), Math.ceil(maxY + yPad)];

    return { vertexX, vertexY, disc, roots, yIntercept: c, points, minX, maxX, domainY, tableXs };
  }, [a, b, c]);

  const eqStr = buildEquationStr(a, b, c);
  const tickStyle = { fill: "#9090b0", fontSize: 11 };

  const tabStyle = (tab) => ({
    padding: "8px 14px",
    borderRadius: "6px 6px 0 0",
    border: "1px solid",
    borderBottom: activeTab === tab ? "1px solid #13132a" : "1px solid #2e2e50",
    borderColor: activeTab === tab ? "#6366f1 #6366f1 #13132a #6366f1" : "#2e2e50 #2e2e50 #2e2e50 #2e2e50",
    background: activeTab === tab ? "#13132a" : "#1a1a30",
    color: activeTab === tab ? "#a5b4fc" : "#6b6b80",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: activeTab === tab ? "bold" : "normal",
    marginRight: 4,
  });

  return (
    <div style={{ background: "#0f0f1a", minHeight: "100vh", padding: "20px 16px", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#e8e8f0" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: "bold", color: "#c4b5fd", margin: "0 0 4px 0" }}>
            📈 Quadratic Graph Explorer
          </h1>
          <p style={{ fontSize: 13, color: "#8888aa", margin: 0 }}>
            Sec 2 Maths · Learn to plot y = ax² + bx + c step by step
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: "#6b6b80", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Try an example</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setA(ex.a); setB(ex.b); setC(ex.c); setExpandedStep(null); }}
                title={ex.note}
                style={{
                  background: "#1e1e32", border: "1px solid #2e2e50", borderRadius: 6,
                  color: "#c4b5fd", fontSize: 12, padding: "6px 12px", cursor: "pointer"
                }}>
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            ["a", a, setA, "Controls shape & direction. Must not be 0."],
            ["b", b, setB, "Shifts the turning point left or right."],
            ["c", c, setC, "Sets the y-intercept."],
          ].map(([label, val, setter, hint]) => (
            <div key={label} style={{ background: "#1e1e32", border: "1px solid #2e2e50", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: "bold" }}>{label}</span>
                <span style={{ fontSize: 14, fontFamily: "monospace", color: "#e8e8f0" }}>{val}</span>
              </div>
              <input type="range" min={-6} max={6} step={1} value={val}
                onChange={e => { setter(Number(e.target.value)); setExpandedStep(null); }}
                style={{ width: "100%", accentColor: "#6366f1" }} />
              <p style={{ fontSize: 10, color: "#6b6b80", margin: "6px 0 0 0", lineHeight: 1.4 }}>{hint}</p>
            </div>
          ))}
        </div>

        <div style={{
          background: "#1e1e32", border: "2px solid #6366f1", borderRadius: 10, padding: "12px 20px",
          marginBottom: 20, textAlign: "center"
        }}>
          <span style={{ fontSize: 22, color: "#a5b4fc", fontStyle: "italic", letterSpacing: 1 }}>{eqStr}</span>
        </div>

        {a === 0 && (
          <div style={{ color: "#fbbf24", background: "#1f1a00", border: "1px solid #fbbf24", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13 }}>
            ⚠️ <strong>Note:</strong> When a = 0, there is no x² term, so it is not a quadratic — just a straight line. Set a to any value except 0.
          </div>
        )}

        {analysis && (
          <>
            <div style={{ background: "#13132a", border: "1px solid #2e2e50", borderRadius: 10, padding: "16px 6px 10px 6px", marginBottom: 6 }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysis.points} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="#2a2a45" strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number"
                    domain={[analysis.minX, analysis.maxX]}
                    tick={tickStyle} tickLine={false}
                    axisLine={{ stroke: "#404060" }}
                    tickCount={Math.min(13, analysis.maxX - analysis.minX + 1)}
                    allowDuplicatedCategory={false}>
                    <Label value="x" position="insideRight" offset={-4} fill="#6b6b80" fontSize={12} />
                  </XAxis>
                  <YAxis domain={analysis.domainY} tick={tickStyle} tickLine={false}
                    axisLine={{ stroke: "#404060" }} width={38}>
                    <Label value="y" position="insideTop" offset={-2} fill="#6b6b80" fontSize={12} />
                  </YAxis>
                  <Tooltip
                    contentStyle={{ background: "#1e1e32", border: "1px solid #6366f1", borderRadius: 6, fontSize: 12 }}
                    labelStyle={{ color: "#a5b4fc" }}
                    itemStyle={{ color: "#e8e8f0" }}
                    formatter={(v) => [fmtN(v), "y"]}
                    labelFormatter={(v) => `x = ${fmtN(v)}`}
                  />
                  <ReferenceLine x={0} stroke="#404060" strokeWidth={1.5} />
                  <ReferenceLine y={0} stroke="#404060" strokeWidth={1.5} />
                  <ReferenceLine x={analysis.vertexX} stroke="#818cf8" strokeDasharray="6 3" strokeWidth={1.5}
                    label={{ value: `x = ${fmtN(analysis.vertexX)}`, fill: "#818cf8", fontSize: 10, position: "insideTopRight" }} />
                  {analysis.roots.map((r, i) => (
                    <ReferenceDot key={i} x={r} y={0} r={5} fill="#34d399" stroke="#0f0f1a" strokeWidth={2}
                      label={{ value: `(${fmtN(r)}, 0)`, fill: "#34d399", fontSize: 10, position: i === 0 ? "insideBottomLeft" : "insideBottomRight" }} />
                  ))}
                  <ReferenceDot x={0} y={analysis.yIntercept} r={5} fill="#fbbf24" stroke="#0f0f1a" strokeWidth={2}
                    label={{ value: `(0, ${fmtN(analysis.yIntercept)})`, fill: "#fbbf24", fontSize: 10, position: "insideTopRight" }} />
                  <ReferenceDot x={analysis.vertexX} y={analysis.vertexY} r={6} fill="#f472b6" stroke="#0f0f1a" strokeWidth={2}
                    label={{ value: `(${fmtN(analysis.vertexX)}, ${fmtN(analysis.vertexY)})`, fill: "#f472b6", fontSize: 10, position: a > 0 ? "insideTop" : "insideBottom" }} />
                  <Line type="monotone" dataKey="y" stroke="#6366f1" strokeWidth={2.5}
                    dot={false} activeDot={{ r: 4, fill: "#a5b4fc" }} />
                </LineChart>
              </ResponsiveContainer>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 8, paddingTop: 8, borderTop: "1px solid #2e2e50" }}>
                {[
                  ["●", "#f472b6", "Turning point"],
                  ["●", "#fbbf24", "y-intercept"],
                  ["●", "#34d399", "x-intercept(s)"],
                  ["╌", "#818cf8", "Line of symmetry"],
                ].map(([sym, col, lbl]) => (
                  <span key={lbl} style={{ fontSize: 11, color: "#9090b0", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ color: col, fontSize: 14 }}>{sym}</span> {lbl}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={{ display: "flex", marginBottom: 0 }}>
                {[["steps", "📋 Step-by-Step"], ["table", "📊 Values Table"], ["vocab", "📖 Key Terms"]].map(([tab, label]) => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>{label}</button>
                ))}
              </div>

              <div style={{ background: "#13132a", border: "1px solid #6366f1", borderRadius: "0 8px 8px 8px", padding: "16px" }}>

                {activeTab === "steps" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

                    <StepCard num={1} title="Which way does the curve open?"
                      expanded={expandedStep === 1} onToggle={() => setExpandedStep(expandedStep === 1 ? null : 1)}>
                      <p>Look at <strong>a</strong> — the number in front of x².</p>
                      <div style={{ display: "flex", gap: 8, margin: "10px 0", flexWrap: "wrap" }}>
                        <Pill active={a > 0} color="#34d399">a &gt; 0 → opens upward ∪ → minimum turning point</Pill>
                        <Pill active={a < 0} color="#f87171">a &lt; 0 → opens downward ∩ → maximum turning point</Pill>
                      </div>
                      <p>Here, <strong>a = {a}</strong>, so the curve opens <strong style={{ color: a > 0 ? "#34d399" : "#f87171" }}>{a > 0 ? "upward ∪" : "downward ∩"}</strong> and has a <strong>{a > 0 ? "minimum" : "maximum"}</strong> turning point.</p>
                    </StepCard>

                    <StepCard num={2} title="Find the y-intercept"
                      expanded={expandedStep === 2} onToggle={() => setExpandedStep(expandedStep === 2 ? null : 2)}>
                      <p>The y-intercept is where the curve crosses the <strong>y-axis</strong>. This happens when x = 0.</p>
                      <CalcBox>
                        y = {a}(0)² + ({b})(0) + {c} = <Strong>{c}</Strong>
                      </CalcBox>
                      <p>✅ y-intercept: <YellowCoord>(0, {c})</YellowCoord></p>
                      <p style={{ fontSize: 12, color: "#8888aa" }}>💡 Shortcut: the y-intercept is always equal to <strong>c</strong>. Just read it off the equation!</p>
                    </StepCard>

                    <StepCard num={3} title="Find the line of symmetry and turning point"
                      expanded={expandedStep === 3} onToggle={() => setExpandedStep(expandedStep === 3 ? null : 3)}>
                      <p>The <strong>line of symmetry</strong> is a vertical dashed line that cuts the parabola into two equal mirror halves. Its equation gives you the x-coordinate of the turning point.</p>
                      <p style={{ marginTop: 8 }}><strong>Formula for line of symmetry:</strong></p>
                      <CalcBox>
                        x = −b ÷ (2a) = −({b}) ÷ (2 × {a}) = <Strong>{fmtN(analysis.vertexX)}</Strong>
                      </CalcBox>
                      <p>Now substitute x = {fmtN(analysis.vertexX)} back into the equation to find the y-coordinate:</p>
                      <CalcBox>
                        y = {a}({fmtN(analysis.vertexX)})² + ({b})({fmtN(analysis.vertexX)}) + {c} = <Strong>{fmtN(analysis.vertexY)}</Strong>
                      </CalcBox>
                      <p>✅ Turning point: <PinkCoord>({fmtN(analysis.vertexX)}, {fmtN(analysis.vertexY)})</PinkCoord></p>
                      <p>✅ Line of symmetry: <strong style={{ color: "#818cf8" }}>x = {fmtN(analysis.vertexX)}</strong></p>
                    </StepCard>

                    <StepCard num={4} title="Find the x-intercepts (if any)"
                      expanded={expandedStep === 4} onToggle={() => setExpandedStep(expandedStep === 4 ? null : 4)}>
                      <p>x-intercepts are where the curve crosses the <strong>x-axis</strong>, i.e. when y = 0.</p>
                      <p style={{ marginTop: 8 }}>First, calculate <strong>b² − 4ac</strong> to find out how many x-intercepts there are:</p>
                      <CalcBox>
                        b² − 4ac = ({b})² − 4({a})({c}) = {b * b} − ({4 * a * c}) = <Strong color={analysis.disc > 0 ? "#34d399" : analysis.disc < 0 ? "#f87171" : "#fbbf24"}>{fmtN(analysis.disc)}</Strong>
                      </CalcBox>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}>
                        <Pill active={analysis.disc > 0} color="#34d399">Result &gt; 0 → two x-intercepts</Pill>
                        <Pill active={Math.abs(analysis.disc) < 0.001} color="#fbbf24">Result = 0 → one x-intercept (curve just touches x-axis)</Pill>
                        <Pill active={analysis.disc < 0} color="#f87171">Result &lt; 0 → no x-intercepts (curve does not cross x-axis)</Pill>
                      </div>
                      {analysis.disc > 0 && (
                        <>
                          <p>Use the quadratic formula to find the two x-intercepts:</p>
                          <CalcBox>
                            x = (−b ± √(b²−4ac)) ÷ 2a<br />
                            x = (−({b}) ± √{fmtN(analysis.disc)}) ÷ (2 × {a})<br />
                            x₁ = <Strong color="#34d399">{fmtN(analysis.roots[0])}</Strong> &nbsp;&nbsp; x₂ = <Strong color="#34d399">{fmtN(analysis.roots[1])}</Strong>
                          </CalcBox>
                          <p>✅ x-intercepts: <GreenCoord>({fmtN(analysis.roots[0])}, 0)</GreenCoord> and <GreenCoord>({fmtN(analysis.roots[1])}, 0)</GreenCoord></p>
                        </>
                      )}
                      {Math.abs(analysis.disc) < 0.001 && (
                        <p>✅ x-intercept: <GreenCoord>({fmtN(analysis.roots[0])}, 0)</GreenCoord> — the curve just touches here.</p>
                      )}
                      {analysis.disc < 0 && (
                        <p style={{ color: "#f87171" }}>The curve does not cross the x-axis at all.</p>
                      )}
                    </StepCard>

                    <StepCard num={5} title="Build a table of values"
                      expanded={expandedStep === 5} onToggle={() => setExpandedStep(expandedStep === 5 ? null : 5)}>
                      <p>Choose several integer x-values around the turning point (x = {fmtN(analysis.vertexX)}). Substitute each into the equation to find y.</p>
                      <p style={{ fontSize: 12, color: "#8888aa", marginTop: 4 }}>👉 Click the <strong>Values Table</strong> tab to see the full table for this curve.</p>
                      <p style={{ marginTop: 8 }}>Notice how the y-values on the left and right of the turning point are <strong>mirror images</strong> — this is because the parabola is perfectly symmetrical.</p>
                      <p style={{ fontSize: 12, color: "#8888aa" }}>💡 In your exam, you will usually be given a table with some y-values missing, and asked to fill them in.</p>
                    </StepCard>

                    <StepCard num={6} title="Plot and draw the curve"
                      expanded={expandedStep === 6} onToggle={() => setExpandedStep(expandedStep === 6 ? null : 6)}>
                      <p>On graph paper, follow these steps in order:</p>
                      <ol style={{ paddingLeft: 20, lineHeight: 2.2, marginTop: 8, fontSize: 13 }}>
                        <li>Draw and label the x-axis and y-axis. Mark a consistent scale.</li>
                        <li>Plot all the points from your table of values as small crosses (×).</li>
                        <li>Mark the <strong style={{ color: "#f472b6" }}>turning point</strong> and label it with its coordinates.</li>
                        <li>Mark the <strong style={{ color: "#fbbf24" }}>y-intercept</strong> and label it.</li>
                        <li>Mark any <strong style={{ color: "#34d399" }}>x-intercepts</strong> and label them.</li>
                        <li>Draw a <strong>smooth, continuous curve</strong> through all the points — do <em>not</em> use a ruler!</li>
                        <li>Draw a <strong style={{ color: "#818cf8" }}>dashed vertical line</strong> for the line of symmetry and write its equation (e.g. x = {fmtN(analysis.vertexX)}).</li>
                        <li>Write the equation of the curve next to it.</li>
                      </ol>
                    </StepCard>

                  </div>
                )}

                {activeTab === "table" && (
                  <div>
                    <p style={{ fontSize: 13, color: "#9090b0", marginBottom: 12 }}>
                      Substitute each x-value into <em>{eqStr}</em> to get y. Key points are highlighted.
                    </p>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ padding: "8px 12px", background: "#1e1e32", color: "#a5b4fc", textAlign: "center", border: "1px solid #2e2e50" }}>x</th>
                            <th style={{ padding: "8px 12px", background: "#1e1e32", color: "#a5b4fc", textAlign: "center", border: "1px solid #2e2e50" }}>y</th>
                            <th style={{ padding: "8px 12px", background: "#1e1e32", color: "#6b6b80", textAlign: "center", border: "1px solid #2e2e50", fontSize: 11 }}>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {analysis.tableXs.map(({ x, y }, i) => {
                            const isTurning = Math.abs(x - analysis.vertexX) < 0.01;
                            const isRoot = analysis.roots.some(r => Math.abs(x - r) < 0.01);
                            const isYInt = x === 0;
                            let note = "";
                            let noteColor = "#6b6b80";
                            if (isTurning) { note = a > 0 ? "Minimum (turning point)" : "Maximum (turning point)"; noteColor = "#f472b6"; }
                            else if (isRoot) { note = "x-intercept"; noteColor = "#34d399"; }
                            else if (isYInt) { note = "y-intercept"; noteColor = "#fbbf24"; }
                            return (
                              <tr key={i} style={{ background: isTurning ? "#2a1040" : i % 2 === 0 ? "#13132a" : "#1a1a2e" }}>
                                <td style={{ padding: "7px 12px", textAlign: "center", fontFamily: "monospace", border: "1px solid #2e2e50", color: isTurning ? "#f472b6" : "#e8e8f0" }}>{x}</td>
                                <td style={{ padding: "7px 12px", textAlign: "center", fontFamily: "monospace", border: "1px solid #2e2e50", color: isRoot ? "#34d399" : isYInt ? "#fbbf24" : isTurning ? "#f472b6" : "#e8e8f0", fontWeight: (isRoot || isYInt || isTurning) ? "bold" : "normal" }}>{fmtN(y)}</td>
                                <td style={{ padding: "7px 12px", textAlign: "center", border: "1px solid #2e2e50", fontSize: 11, color: noteColor }}>{note}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ fontSize: 11, color: "#6b6b80", marginTop: 10 }}>
                      💡 Notice how the y-values are symmetric on either side of the turning point — this is the mirror-line property of the parabola.
                    </p>
                  </div>
                )}

                {activeTab === "vocab" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13, color: "#9090b0", marginBottom: 4 }}>Key terms you need to know for your exam:</p>
                    {VOCAB.map(({ term, def }) => (
                      <div key={term} style={{ background: "#1e1e32", border: "1px solid #2e2e50", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontWeight: "bold", color: "#c4b5fd", marginBottom: 4 }}>{term}</div>
                        <div style={{ fontSize: 13, color: "#d0d0e8", lineHeight: 1.6 }}>{def}</div>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StepCard({ num, title, children, expanded, onToggle }) {
  return (
    <div style={{ background: "#1e1e32", border: `1px solid ${expanded ? "#6366f1" : "#2e2e50"}`, borderRadius: 8, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", background: "none", border: "none", padding: "12px 14px",
        display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left"
      }}>
        <span style={{
          background: "#6366f1", color: "#fff", width: 24, height: 24, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: "bold", flexShrink: 0
        }}>{num}</span>
        <span style={{ fontWeight: "bold", color: "#c4b5fd", fontSize: 14, flex: 1 }}>{title}</span>
        <span style={{ color: "#6b6b80", fontSize: 14 }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div style={{ padding: "0 14px 14px 48px", fontSize: 13, color: "#d0d0e8", lineHeight: 1.8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function CalcBox({ children }) {
  return (
    <div style={{
      background: "#0f0f1a", border: "1px solid #2e2e50", borderRadius: 6,
      padding: "10px 14px", fontFamily: "monospace", fontSize: 13,
      color: "#d0d0e8", margin: "8px 0", lineHeight: 1.8
    }}>
      {children}
    </div>
  );
}

function Strong({ children, color = "#a5b4fc" }) {
  return <strong style={{ color }}>{children}</strong>;
}

function Pill({ children, active, color }) {
  return (
    <div style={{
      display: "inline-block", padding: "5px 12px", borderRadius: 20,
      background: active ? `${color}22` : "#1a1a2e",
      border: `1px solid ${active ? color : "#2e2e50"}`,
      color: active ? color : "#6b6b80",
      fontSize: 12, margin: "2px 0"
    }}>
      {children}
    </div>
  );
}

function GreenCoord({ children }) {
  return <span style={{ color: "#34d399", fontFamily: "monospace", fontWeight: "bold" }}>{children}</span>;
}

function PinkCoord({ children }) {
  return <span style={{ color: "#f472b6", fontFamily: "monospace", fontWeight: "bold" }}>{children}</span>;
}

function YellowCoord({ children }) {
  return <span style={{ color: "#fbbf24", fontFamily: "monospace", fontWeight: "bold" }}>{children}</span>;
}
