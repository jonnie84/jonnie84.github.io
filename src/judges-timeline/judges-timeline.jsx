import { useState, useRef, useEffect } from "react";

const timelineData = [
  {
    id: "era-1",
    type: "era",
    label: "Early Period — Sequential Judges",
    approxDate: "~1380–1190 BC",
    note: "Generally treated as sequential; each judge followed the previous with clear 'rest' periods."
  },
  {
    id: "appendix",
    type: "appendix",
    name: "Judges 17–21 Events",
    ref: "Judges 17–21",
    approxDate: "~1380–1340 BC (early period)",
    summary: "These chapters are a thematic appendix, not placed chronologically in the text. Internal evidence dates them early: Phinehas son of Eleazar (Aaron's grandson) served at the Ark (20:28), and Jonathan son of Gershom, son of Moses, was priest for the Danites (18:30) — placing both episodes within the first generation or two after Joshua.",
    events: [
      { title: "Micah's Idol & the Danite Migration", ref: "Ch. 17–18", detail: "A man named Micah set up a private shrine with a hired Levite priest. The tribe of Dan, migrating north, stole his idol and priest, establishing idolatrous worship at Laish (renamed Dan)." },
      { title: "The Levite's Concubine & War against Benjamin", ref: "Ch. 19–21", detail: "A Levite's concubine was brutally abused and killed at Gibeah in Benjamin. The outraged tribes nearly annihilated Benjamin in civil war, then found ways to provide wives for the survivors." }
    ],
    keyEvent: "Idolatry at Dan; civil war against Benjamin",
    category: "appendix"
  },
  {
    id: 1,
    type: "judge",
    name: "Othniel",
    ref: "Judges 3:7–11",
    tribe: "Judah",
    region: "Southern Israel",
    oppressor: "Cushan-Rishathaim of Mesopotamia",
    oppYears: 8,
    restYears: 40,
    approxDate: "~1374–1334 BC",
    summary: "First judge. Caleb's nephew, filled with the Spirit of the LORD. Defeated Mesopotamian oppression and brought 40 years of peace.",
    keyEvent: "Delivered Israel from Mesopotamian rule",
    category: "major",
    overlap: null
  },
  {
    id: 2,
    type: "judge",
    name: "Ehud",
    ref: "Judges 3:12–30",
    tribe: "Benjamin",
    region: "Central Israel",
    oppressor: "Eglon, King of Moab",
    oppYears: 18,
    restYears: 80,
    approxDate: "~1334–1236 BC",
    summary: "Left-handed warrior who crafted a hidden double-edged sword. Assassinated the very fat King Eglon in his private chamber, then rallied Israel to defeat Moab.",
    keyEvent: "Killed King Eglon; 80 years of rest",
    category: "major",
    overlap: null
  },
  {
    id: 3,
    type: "judge",
    name: "Shamgar",
    ref: "Judges 3:31",
    tribe: "Unknown",
    region: "South-west (Philistine border)",
    oppressor: "Philistines",
    oppYears: null,
    restYears: null,
    approxDate: "~1280–1236 BC",
    summary: "Struck down 600 Philistines with an ox goad. No timeframe given. Likely overlaps with Ehud's rest period or the early Canaanite oppression before Deborah. Mentioned in the Song of Deborah (5:6).",
    keyEvent: "Killed 600 Philistines with an ox goad",
    category: "minor",
    overlap: "Likely during Ehud's rest or early Canaanite oppression"
  },
  {
    id: 4,
    type: "judge",
    name: "Deborah & Barak",
    ref: "Judges 4–5",
    tribe: "Ephraim / Naphtali",
    region: "Northern Israel",
    oppressor: "Jabin & Sisera (Canaanites)",
    oppYears: 20,
    restYears: 40,
    approxDate: "~1236–1176 BC",
    summary: "Deborah, a prophetess, judged Israel under a palm tree. She summoned Barak to lead 10,000 men against Sisera's 900 iron chariots. God routed the enemy; Jael killed Sisera with a tent peg. The Song of Deborah (ch.5) celebrates the victory.",
    keyEvent: "Jael killed Sisera; Song of Deborah",
    category: "major",
    overlap: null
  },
  {
    id: "era-2",
    type: "era",
    label: "Middle Period — Mostly Sequential",
    approxDate: "~1176–1078 BC",
    note: "Gideon through the minor judges. Tola and Jair may have overlapped in different regions (Ephraim vs Gilead)."
  },
  {
    id: 5,
    type: "judge",
    name: "Gideon",
    ref: "Judges 6–8",
    tribe: "Manasseh",
    region: "Central highlands",
    oppressor: "Midianites",
    oppYears: 7,
    restYears: 40,
    approxDate: "~1176–1129 BC",
    summary: "Called while threshing wheat in a winepress out of fear. Tested God with a fleece. God reduced his army from 32,000 to 300 men, who defeated the Midianites with torches, trumpets, and jars. Later made an ephod that became a snare.",
    keyEvent: "300 men defeated Midian; fleece test",
    category: "major",
    overlap: null
  },
  {
    id: 6,
    type: "judge",
    name: "Abimelech",
    ref: "Judges 9",
    tribe: "Manasseh",
    region: "Shechem area",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1129–1126 BC",
    summary: "Gideon's son by a concubine. Murdered 70 brothers on a single stone to seize power at Shechem. Ruled 3 years as a self-appointed king. Killed by a millstone dropped by a woman. Jotham's fable warned against him.",
    keyEvent: "Anti-judge; killed by a millstone",
    category: "negative",
    ruleYears: 3,
    overlap: null
  },
  {
    id: 7,
    type: "judge",
    name: "Tola",
    ref: "Judges 10:1–2",
    tribe: "Issachar",
    region: "Hill country of Ephraim",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1126–1103 BC",
    summary: "Rose to save Israel after Abimelech. Judged for 23 years from Shamir in the hill country of Ephraim. Few details recorded.",
    keyEvent: "Judged 23 years from Ephraim",
    category: "minor",
    ruleYears: 23,
    overlap: "Possibly concurrent with Jair (different region — west vs east)"
  },
  {
    id: 8,
    type: "judge",
    name: "Jair",
    ref: "Judges 10:3–5",
    tribe: "Manasseh",
    region: "Transjordan (Gilead)",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1126–1104 BC",
    summary: "A Gileadite with 30 sons who rode 30 donkeys and controlled 30 towns (Havvoth-jair). Judged 22 years from the Transjordan.",
    keyEvent: "30 sons, 30 donkeys, 30 towns; 22 years",
    category: "minor",
    ruleYears: 22,
    overlap: "Possibly concurrent with Tola (different region — east vs west)"
  },
  {
    id: "era-3",
    type: "era",
    label: "Late Period — Significant Overlaps",
    approxDate: "~1100–1050 BC",
    note: "Jephthah and the eastern minor judges likely overlapped with Samson in the west. Different oppressors in different regions."
  },
  {
    id: 9,
    type: "judge",
    name: "Jephthah",
    ref: "Judges 10:6–12:7",
    tribe: "Manasseh (most likely)",
    region: "Transjordan (east)",
    oppressor: "Ammonites",
    oppYears: 18,
    restYears: null,
    approxDate: "~1100–1094 BC",
    summary: "Outcast son of a prostitute, recalled to lead when Ammon attacked. Negotiated first, then fought. Made a rash vow that cost him his daughter. Also fought Ephraim (the 'Shibboleth' incident). Judged 6 years.",
    keyEvent: "Rash vow; Shibboleth incident",
    category: "major",
    ruleYears: 6,
    overlap: "Eastern judge; concurrent with Samson's Philistine struggles in the west"
  },
  {
    id: 10,
    type: "judge",
    name: "Ibzan",
    ref: "Judges 12:8–10",
    tribe: "Zebulun or Judah (debated)",
    region: "Southern/central",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1094–1087 BC",
    summary: "From Bethlehem. Had 30 sons and 30 daughters, all married outside the clan. Judged 7 years.",
    keyEvent: "30 sons, 30 daughters; 7 years",
    category: "minor",
    ruleYears: 7,
    overlap: "Concurrent with Samson (different region)"
  },
  {
    id: 11,
    type: "judge",
    name: "Elon",
    ref: "Judges 12:11–12",
    tribe: "Zebulun",
    region: "Northern Israel",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1087–1077 BC",
    summary: "A Zebulunite who judged Israel for 10 years. Buried at Aijalon in Zebulun. Minimal details preserved.",
    keyEvent: "Judged 10 years in the north",
    category: "minor",
    ruleYears: 10,
    overlap: "Concurrent with Samson (different region)"
  },
  {
    id: 12,
    type: "judge",
    name: "Abdon",
    ref: "Judges 12:13–15",
    tribe: "Ephraim",
    region: "Hill country of Ephraim",
    oppressor: "—",
    oppYears: null,
    restYears: null,
    approxDate: "~1077–1069 BC",
    summary: "Had 40 sons and 30 grandsons who rode 70 donkeys — a sign of wealth and status. Judged 8 years.",
    keyEvent: "40 sons, 30 grandsons; 8 years",
    category: "minor",
    ruleYears: 8,
    overlap: "Concurrent with Samson (different region)"
  },
  {
    id: 13,
    type: "judge",
    name: "Samson",
    ref: "Judges 13–16",
    tribe: "Dan",
    region: "South-west (Philistine border)",
    oppressor: "Philistines",
    oppYears: 40,
    restYears: null,
    approxDate: "~1118–1058 BC",
    summary: "Nazirite from birth with supernatural strength. The 40-year Philistine oppression began before his birth and continued throughout his life. His exploits were personal vendettas rather than national liberation. Betrayed by Delilah, blinded, and enslaved. In his death, he destroyed the temple of Dagon, killing more Philistines than in his life. Judged 20 years.",
    keyEvent: "Delilah's betrayal; destroyed Dagon's temple",
    category: "major",
    ruleYears: 20,
    overlap: "Western judge; concurrent with Jephthah, Ibzan, Elon, Abdon in east/north"
  }
];

const cyclePhases = [
  { label: "Israel serves the LORD", icon: "✦", color: "#6EE7B7" },
  { label: "Israel turns to idols", icon: "↓", color: "#FBBF24" },
  { label: "God allows oppression", icon: "⚔", color: "#F87171" },
  { label: "Israel cries out", icon: "◉", color: "#93C5FD" },
  { label: "God raises a deliverer", icon: "★", color: "#C4B5FD" },
  { label: "Rest / Peace", icon: "☮", color: "#6EE7B7" },
];

const categoryColors = {
  major: { bg: "#2d1b4e", border: "#8B5CF6", accent: "#A78BFA", label: "Major Judge" },
  minor: { bg: "#1b2e3d", border: "#3B82F6", accent: "#60A5FA", label: "Minor Judge" },
  negative: { bg: "#3d1b1b", border: "#EF4444", accent: "#F87171", label: "Anti-Judge" },
  appendix: { bg: "#2e2a1b", border: "#D97706", accent: "#FBBF24", label: "Appendix Event" },
};

export default function JudgesTimeline() {
  const [selected, setSelected] = useState(null);
  const [showCycle, setShowCycle] = useState(false);
  const detailRef = useRef(null);

  useEffect(() => {
    if (selected !== null && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selected]);

  const badgeStyle = (bg, color, border) => ({
    fontSize: "0.6rem",
    padding: "0.15rem 0.5rem",
    borderRadius: "10px",
    background: bg,
    color: color,
    border: `1px solid ${border}`,
    fontFamily: "'Trebuchet MS', sans-serif",
    whiteSpace: "nowrap"
  });

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0c0c1d 0%, #141428 50%, #0c0c1d 100%)",
      color: "#e8e8f0",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      padding: "0",
      overflowX: "hidden"
    }}>
      {/* Header */}
      <div style={{
        textAlign: "center",
        padding: "2.5rem 1rem 1.5rem",
        borderBottom: "1px solid rgba(139,92,246,0.2)"
      }}>
        <div style={{
          fontSize: "0.7rem",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "#A78BFA",
          marginBottom: "0.5rem",
          fontFamily: "'Trebuchet MS', sans-serif"
        }}>The Book of Judges</div>
        <h1 style={{
          fontSize: "1.75rem",
          fontWeight: "700",
          margin: "0 0 0.5rem",
          background: "linear-gradient(135deg, #C4B5FD 0%, #6EE7B7 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          lineHeight: 1.2
        }}>Timeline of the Judges</h1>
        <p style={{
          fontSize: "0.8rem",
          color: "#8888a8",
          margin: "0",
          maxWidth: "380px",
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.5,
          fontFamily: "'Trebuchet MS', sans-serif"
        }}>
          Approximate chronology with regional overlaps (~1380–1050 BC)
        </p>
      </div>

      {/* Cycle Toggle */}
      <div style={{ padding: "1rem 1rem 0.5rem", textAlign: "center" }}>
        <button
          onClick={() => setShowCycle(!showCycle)}
          style={{
            background: showCycle ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${showCycle ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: showCycle ? "#C4B5FD" : "#8888a8",
            padding: "0.5rem 1rem",
            borderRadius: "20px",
            cursor: "pointer",
            fontSize: "0.75rem",
            fontFamily: "'Trebuchet MS', sans-serif",
            letterSpacing: "0.05em",
            transition: "all 0.2s"
          }}
        >
          {showCycle ? "▾ Hide" : "▸ Show"} the Judges Cycle
        </button>
      </div>

      {showCycle && (
        <div style={{
          margin: "0.5rem 1rem 1rem",
          padding: "1rem",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)"
        }}>
          <div style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#8888a8",
            textAlign: "center",
            marginBottom: "0.75rem",
            fontFamily: "'Trebuchet MS', sans-serif"
          }}>The Recurring Cycle</div>
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.5rem"
          }}>
            {cyclePhases.map((phase, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.3rem 0.6rem",
                borderRadius: "16px",
                background: `${phase.color}10`,
                border: `1px solid ${phase.color}30`,
                fontSize: "0.7rem",
                color: phase.color,
                fontFamily: "'Trebuchet MS', sans-serif"
              }}>
                <span style={{ fontSize: "0.8rem" }}>{phase.icon}</span>
                {phase.label}
                {i < cyclePhases.length - 1 && (
                  <span style={{ color: "#555", marginLeft: "0.15rem" }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "0.5rem 1rem 1rem",
        flexWrap: "wrap"
      }}>
        {Object.entries(categoryColors).map(([key, val]) => (
          <div key={key} style={{
            display: "flex",
            alignItems: "center",
            gap: "0.35rem",
            fontSize: "0.6rem",
            color: "#8888a8",
            fontFamily: "'Trebuchet MS', sans-serif"
          }}>
            <div style={{
              width: 9,
              height: 9,
              borderRadius: key === "appendix" ? "2px" : "50%",
              background: val.border,
              opacity: 0.8
            }} />
            {val.label}
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: "relative", padding: "0 1rem 2rem" }}>
        {/* Vertical line */}
        <div style={{
          position: "absolute",
          left: "2rem",
          top: 0,
          bottom: 0,
          width: "2px",
          background: "linear-gradient(180deg, rgba(139,92,246,0.3) 0%, rgba(110,231,183,0.3) 50%, rgba(139,92,246,0.1) 100%)"
        }} />

        {timelineData.map((item, i) => {
          // Era dividers
          if (item.type === "era") {
            return (
              <div key={item.id} style={{
                position: "relative",
                margin: i === 0 ? "0 0 0.75rem" : "1.25rem 0 0.75rem",
              }}>
                <div style={{
                  position: "absolute",
                  left: "calc(2rem - 4px)",
                  top: "0.55rem",
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  background: "rgba(139,92,246,0.4)",
                  transform: "rotate(45deg)",
                  zIndex: 2
                }} />
                <div style={{
                  marginLeft: "3.5rem",
                  padding: "0.5rem 0.75rem",
                  borderLeft: "3px solid rgba(139,92,246,0.3)",
                  fontFamily: "'Trebuchet MS', sans-serif"
                }}>
                  <div style={{
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    color: "#C4B5FD",
                    marginBottom: "0.15rem"
                  }}>{item.label}</div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: "#6EE7B7",
                    marginBottom: "0.2rem"
                  }}>{item.approxDate}</div>
                  <div style={{
                    fontSize: "0.65rem",
                    color: "#6b6b80",
                    lineHeight: 1.4
                  }}>{item.note}</div>
                </div>
              </div>
            );
          }

          // Appendix events
          if (item.type === "appendix") {
            const cat = categoryColors.appendix;
            const isSelected = selected === item.id;
            return (
              <div key={item.id} style={{ position: "relative", marginBottom: "0.75rem" }}>
                <div style={{
                  position: "absolute",
                  left: "calc(2rem - 7px)",
                  top: "1rem",
                  width: 16,
                  height: 16,
                  borderRadius: "3px",
                  background: isSelected ? cat.border : cat.bg,
                  border: `2px solid ${cat.border}`,
                  zIndex: 2,
                  transition: "all 0.2s",
                  boxShadow: isSelected ? `0 0 12px ${cat.border}60` : "none"
                }} />
                <div
                  onClick={() => setSelected(isSelected ? null : item.id)}
                  style={{
                    marginLeft: "3.5rem",
                    padding: "0.85rem 1rem",
                    background: isSelected ? cat.bg : "rgba(217,119,6,0.04)",
                    border: `1px solid ${isSelected ? cat.border + "60" : "rgba(217,119,6,0.15)"}`,
                    borderRadius: "10px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    borderStyle: "dashed"
                  }}
                >
                  <div style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "0.5rem",
                    marginBottom: "0.25rem"
                  }}>
                    <span style={{
                      fontSize: "1.05rem",
                      fontWeight: "700",
                      color: cat.accent
                    }}>{item.name}</span>
                    <span style={{
                      fontSize: "0.65rem",
                      color: "#6b6b80",
                      fontFamily: "'Trebuchet MS', sans-serif"
                    }}>{item.ref}</span>
                  </div>
                  <div style={{
                    fontSize: "0.7rem",
                    color: "#D97706",
                    marginBottom: "0.3rem",
                    fontFamily: "'Trebuchet MS', sans-serif"
                  }}>
                    <span style={{ color: "#6b6b80" }}>Likely date:</span> {item.approxDate}
                  </div>
                  <div style={{
                    fontSize: "0.75rem",
                    color: "#a0a0b8",
                    fontFamily: "'Trebuchet MS', sans-serif",
                    lineHeight: 1.4
                  }}>{item.keyEvent}</div>
                  <div style={{ marginTop: "0.4rem" }}>
                    <span style={badgeStyle("rgba(217,119,6,0.1)", "#FBBF24", "rgba(217,119,6,0.2)")}>
                      Thematic appendix — placed early chronologically
                    </span>
                  </div>

                  {isSelected && (
                    <div ref={detailRef} style={{
                      marginTop: "0.75rem",
                      paddingTop: "0.75rem",
                      borderTop: `1px solid ${cat.border}30`
                    }}>
                      <p style={{
                        fontSize: "0.8rem",
                        lineHeight: 1.65,
                        color: "#c8c8d8",
                        margin: "0 0 0.75rem",
                        fontFamily: "'Trebuchet MS', sans-serif"
                      }}>{item.summary}</p>
                      {item.events.map((ev, ei) => (
                        <div key={ei} style={{
                          padding: "0.6rem 0.75rem",
                          background: "rgba(217,119,6,0.06)",
                          borderRadius: "8px",
                          marginBottom: "0.5rem",
                          border: "1px solid rgba(217,119,6,0.1)"
                        }}>
                          <div style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            color: "#FBBF24",
                            marginBottom: "0.2rem"
                          }}>{ev.title} <span style={{ fontWeight: "400", color: "#6b6b80", fontSize: "0.65rem" }}>({ev.ref})</span></div>
                          <div style={{
                            fontSize: "0.75rem",
                            color: "#b0b0c0",
                            lineHeight: 1.5,
                            fontFamily: "'Trebuchet MS', sans-serif"
                          }}>{ev.detail}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Judge cards
          const cat = categoryColors[item.category];
          const isSelected = selected === item.id;
          const judgeIndex = timelineData.filter(d => d.type === "judge").indexOf(item) + 1;

          return (
            <div key={item.id} style={{ position: "relative", marginBottom: "0.75rem" }}>
              <div style={{
                position: "absolute",
                left: "calc(2rem - 7px)",
                top: "1rem",
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: isSelected ? cat.border : cat.bg,
                border: `2px solid ${cat.border}`,
                zIndex: 2,
                transition: "all 0.2s",
                boxShadow: isSelected ? `0 0 12px ${cat.border}60` : "none"
              }} />

              <div
                onClick={() => setSelected(isSelected ? null : item.id)}
                style={{
                  marginLeft: "3.5rem",
                  padding: "0.85rem 1rem",
                  background: isSelected ? cat.bg : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isSelected ? cat.border + "60" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: "10px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  position: "relative"
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "0.6rem",
                  right: "0.7rem",
                  fontSize: "0.6rem",
                  color: cat.accent,
                  opacity: 0.5,
                  fontFamily: "'Trebuchet MS', sans-serif"
                }}>#{judgeIndex}</div>

                <div style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.5rem",
                  marginBottom: "0.15rem"
                }}>
                  <span style={{
                    fontSize: "1.05rem",
                    fontWeight: "700",
                    color: cat.accent
                  }}>{item.name}</span>
                  <span style={{
                    fontSize: "0.65rem",
                    color: "#6b6b80",
                    fontFamily: "'Trebuchet MS', sans-serif"
                  }}>{item.ref}</span>
                </div>

                {/* Date */}
                <div style={{
                  fontSize: "0.65rem",
                  color: "#6EE7B7",
                  marginBottom: "0.25rem",
                  fontFamily: "'Trebuchet MS', sans-serif"
                }}>{item.approxDate}</div>

                <div style={{
                  fontSize: "0.75rem",
                  color: "#a0a0b8",
                  fontFamily: "'Trebuchet MS', sans-serif",
                  lineHeight: 1.4
                }}>{item.keyEvent}</div>

                {/* Duration badges */}
                <div style={{
                  display: "flex",
                  gap: "0.4rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap"
                }}>
                  {item.oppYears && (
                    <span style={badgeStyle("rgba(248,113,113,0.1)", "#F87171", "rgba(248,113,113,0.2)")}>
                      {item.oppYears}yr oppression
                    </span>
                  )}
                  {item.restYears && (
                    <span style={badgeStyle("rgba(110,231,183,0.1)", "#6EE7B7", "rgba(110,231,183,0.2)")}>
                      {item.restYears}yr rest
                    </span>
                  )}
                  {item.ruleYears && (
                    <span style={badgeStyle("rgba(147,197,253,0.1)", "#93C5FD", "rgba(147,197,253,0.2)")}>
                      {item.ruleYears}yr rule
                    </span>
                  )}
                  {item.region && (
                    <span style={badgeStyle("rgba(255,255,255,0.04)", "#8888a8", "rgba(255,255,255,0.08)")}>
                      {item.region}
                    </span>
                  )}
                </div>

                {/* Overlap indicator */}
                {item.overlap && (
                  <div style={{
                    marginTop: "0.4rem",
                    fontSize: "0.6rem",
                    color: "#D97706",
                    fontFamily: "'Trebuchet MS', sans-serif",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem"
                  }}>
                    <span style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#D97706",
                      opacity: 0.7
                    }} />
                    Overlap: {item.overlap}
                  </div>
                )}

                {/* Expanded detail */}
                {isSelected && (
                  <div ref={detailRef} style={{
                    marginTop: "0.75rem",
                    paddingTop: "0.75rem",
                    borderTop: `1px solid ${cat.border}30`
                  }}>
                    {item.oppressor && item.oppressor !== "—" && (
                      <div style={{
                        fontSize: "0.7rem",
                        color: "#F87171",
                        marginBottom: "0.3rem",
                        fontFamily: "'Trebuchet MS', sans-serif"
                      }}>
                        <span style={{ color: "#6b6b80" }}>Oppressor:</span> {item.oppressor}
                      </div>
                    )}
                    {item.tribe && (
                      <div style={{
                        fontSize: "0.7rem",
                        color: "#60A5FA",
                        marginBottom: "0.4rem",
                        fontFamily: "'Trebuchet MS', sans-serif"
                      }}>
                        <span style={{ color: "#6b6b80" }}>Tribe:</span> {item.tribe}
                      </div>
                    )}
                    <p style={{
                      fontSize: "0.8rem",
                      lineHeight: 1.65,
                      color: "#c8c8d8",
                      margin: 0,
                      fontFamily: "'Trebuchet MS', sans-serif"
                    }}>{item.summary}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Continuation */}
        <div style={{ position: "relative", marginTop: "0.5rem" }}>
          <div style={{
            position: "absolute",
            left: "calc(2rem - 5px)",
            top: "0.5rem",
            width: 12,
            height: 12,
            borderRadius: "50%",
            border: "2px dashed rgba(139,92,246,0.3)",
            zIndex: 2
          }} />
          <div style={{
            marginLeft: "3.5rem",
            padding: "0.75rem 1rem",
            background: "rgba(255,255,255,0.02)",
            border: "1px dashed rgba(255,255,255,0.08)",
            borderRadius: "10px",
            fontSize: "0.75rem",
            color: "#6b6b80",
            fontFamily: "'Trebuchet MS', sans-serif",
            lineHeight: 1.5
          }}>
            <span style={{ color: "#A78BFA" }}>Continued in 1 Samuel →</span> Eli (priest-judge, ~40 years) and Samuel (last judge, anointed Saul & David). The Philistine oppression that began in Samson's era continues until Samuel's victory at Mizpah.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        padding: "1rem 1.5rem 2rem",
        fontSize: "0.65rem",
        color: "#555570",
        fontFamily: "'Trebuchet MS', sans-serif",
        lineHeight: 1.6,
        borderTop: "1px solid rgba(255,255,255,0.04)"
      }}>
        "In those days there was no king in Israel. Everyone did what was right in his own eyes." — Judges 21:25
        <br />
        <span style={{ color: "#444460" }}>
          Tap any entry to expand. Dates follow a conservative 480-year framework (1 Kings 6:1) with regional overlaps. All dates are approximate.
        </span>
      </div>
    </div>
  );
}
