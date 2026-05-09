import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import type { SecurityReport, ActivityEvent, ScanHistoryItem, ThreatTrendPoint } from "../types";
import { format, formatDistanceToNow } from "date-fns";

interface DashboardPageProps {
  report: SecurityReport;
  activity: ActivityEvent[];
  history: ScanHistoryItem[];
  trend: ThreatTrendPoint[];
}

const FADE_UP = { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 } };

const TOOLTIP_STYLE = {
  background: "#08142a", border: "1px solid #1a2d4a", borderRadius: 6,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#c8d8e8",
  padding: "6px 10px",
};

function SecurityGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    let s = 0;
    const t = setInterval(() => { s += 2; setDisplayed(Math.min(s, score)); if (s >= score) clearInterval(t); }, 18);
    return () => clearInterval(t);
  }, [score]);

  const color = score >= 70 ? "#00ff88" : score >= 50 ? "#ffb400" : score >= 30 ? "#ff6b35" : "#ff2b4e";
  const grade = score >= 90 ? "A" : score >= 70 ? "B" : score >= 50 ? "C" : score >= 30 ? "D" : "F";
  const radius = 62, cx = 80, cy = 76;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const endAngle = -180 + (displayed / 100) * 180;
  const x2 = cx + radius * Math.cos(toRad(endAngle));
  const y2 = cy + radius * Math.sin(toRad(endAngle));
  const largeArc = (displayed / 100) * 180 > 90 ? 1 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <svg width="160" height="95" viewBox="0 0 160 95">
        <path d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none" stroke="#152035" strokeWidth="10" strokeLinecap="round" />
        {displayed > 0 && (
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
          />
        )}
        <line x1={cx} y1={cy} x2={cx + 46 * Math.cos(toRad(endAngle))} y2={cy + 46 * Math.sin(toRad(endAngle))}
          stroke={color} strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        {[0, 25, 50, 75, 100].map(v => {
          const a = toRad(-180 + (v / 100) * 180);
          return <line key={v}
            x1={cx + (radius - 7) * Math.cos(a)} y1={cy + (radius - 7) * Math.sin(a)}
            x2={cx + (radius + 3) * Math.cos(a)} y2={cy + (radius + 3) * Math.sin(a)}
            stroke="#1e3050" strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{ marginTop: -4, textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 34, fontWeight: 700, color, textShadow: `0 0 20px ${color}60`, lineHeight: 1 }}>
          {displayed}
        </div>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 17, fontWeight: 600, color, opacity: 0.75, marginTop: 1 }}>{grade}</div>
        <div style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 3, letterSpacing: "0.1em" }}>
          SECURITY SCORE
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, sub }: { label: string; value: number; color: string; icon: string; sub?: string }) {
  return (
    <motion.div className="cyber-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, position: "relative", overflow: "hidden" }}
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.025 }} transition={{ duration: 0.2 }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(ellipse at 0% 60%, ${color}07 0%, transparent 65%)` }} />
      <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 20, background: `${color}10`, border: `1px solid ${color}28` }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color, textShadow: `0 0 14px ${color}38`, lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", marginTop: 3 }}>{label}</div>
        {sub && <div style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>{sub}</div>}
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 2, borderRadius: "0 2px 2px 0", background: `linear-gradient(to bottom, transparent, ${color}55, transparent)` }} />
    </motion.div>
  );
}

export default function DashboardPage({ report, activity, history, trend }: DashboardPageProps) {
  const owaspData = [
    { category: "LLM01 Prompt Inject", count: 3, color: "#ff2b4e" },
    { category: "LLM06 Info Disclose", count: 2, color: "#ff6b35" },
    { category: "LLM07 Plugin Design", count: 2, color: "#ffb400" },
    { category: "LLM08 Excess Agency", count: 2, color: "#ff6b35" },
    { category: "LLM05 Supply Chain", count: 1, color: "#ffb400" },
    { category: "LLM04 Model DoS", count: 1, color: "#4a90d9" },
  ];

  const breakdownData = [
    { name: "Secrets", value: report.score.breakdown.secrets, color: "#ff2b4e" },
    { name: "Perms", value: report.score.breakdown.permissions, color: "#ff6b35" },
    { name: "Hooks", value: report.score.breakdown.hooks, color: "#ffb400" },
    { name: "MCP", value: report.score.breakdown.mcp, color: "#8b5cf6" },
    { name: "Agents", value: report.score.breakdown.agents, color: "#00d4ff" },
  ];

  const typeColors: Record<string, string> = {
    detection: "#ff2b4e", alert: "#ff6b35", policy: "#ffb400",
    fix: "#00ff88", scan: "#00d4ff", injection: "#ff2b4e",
  };
  const typeIcons: Record<string, string> = {
    detection: "⚠", alert: "!", policy: "⊞", fix: "✓", scan: "⟳", injection: "☢",
  };

  return (
    <div className="dashboard-scroll" style={{ height: "100%", padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Stat Cards ── */}
      <motion.div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }} {...FADE_UP} transition={{ duration: 0.35 }}>
        <StatCard label="TOTAL FINDINGS" value={report.summary.totalFindings} color="#c8d8e8" icon="⚡" sub={`${report.summary.filesScanned} files`} />
        <StatCard label="CRITICAL" value={report.summary.critical} color="#ff2b4e" icon="🔴" sub="Immediate action" />
        <StatCard label="HIGH" value={report.summary.high} color="#ff6b35" icon="🟠" sub="Address soon" />
        <StatCard label="MEDIUM" value={report.summary.medium} color="#ffb400" icon="🟡" sub="Plan remediation" />
        <StatCard label="AUTO-FIXABLE" value={report.summary.autoFixable} color="#00ff88" icon="✓" sub="Quick wins" />
      </motion.div>

      {/* ── Main 3-col grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.1fr", gap: 14, flex: "0 0 auto" }}>

        {/* Security Gauge */}
        <motion.div className="cyber-card" style={{ padding: "16px 20px" }} {...FADE_UP} transition={{ delay: 0.08, duration: 0.35 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>RISK SCORE</span>
            <span style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>
              {format(new Date(report.timestamp), "HH:mm:ss")}
            </span>
          </div>
          <SecurityGauge score={report.score.numericScore} />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
            {breakdownData.map(item => (
              <div key={item.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 52, fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{item.name}</div>
                <div style={{ flex: 1, borderRadius: 9999, overflow: "hidden", height: 4, background: "#152035" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ duration: 1, delay: 0.6 }}
                    style={{ height: "100%", background: item.color, borderRadius: 9999, boxShadow: `0 0 6px ${item.color}50` }} />
                </div>
                <div style={{ width: 24, fontSize: 9, color: item.color, fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Threat Trend Chart */}
        <motion.div className="cyber-card" style={{ padding: "16px 20px" }} {...FADE_UP} transition={{ delay: 0.12, duration: 0.35 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>THREAT TREND</span>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[{ label: "CRIT", color: "#ff2b4e" }, { label: "HIGH", color: "#ff6b35" }, { label: "MED", color: "#ffb400" }].map(l => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: l.color }} />
                  <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={trend} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <defs>
                {[{ id: "crit", color: "#ff2b4e" }, { id: "high", color: "#ff6b35" }, { id: "med", color: "#ffb400" }].map(({ id, color }) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 8, fill: "#3a5068", fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#3a5068", fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="critical" stroke="#ff2b4e" strokeWidth={1.5} fill="url(#crit)" />
              <Area type="monotone" dataKey="high" stroke="#ff6b35" strokeWidth={1.5} fill="url(#high)" />
              <Area type="monotone" dataKey="medium" stroke="#ffb400" strokeWidth={1.5} fill="url(#med)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* OWASP Bar Chart */}
        <motion.div className="cyber-card" style={{ padding: "16px 20px" }} {...FADE_UP} transition={{ delay: 0.16, duration: 0.35 }}>
          <div style={{ marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>OWASP LLM TOP 10</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={owaspData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 4 }}>
              <XAxis type="number" tick={{ fontSize: 8, fill: "#3a5068" }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 8, fill: "#6b8299", fontFamily: "JetBrains Mono" }} tickLine={false} axisLine={false} width={94} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14}>
                {owaspData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} style={{ filter: `drop-shadow(0 0 4px ${entry.color}50)` }} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ── Bottom 2-col row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

        {/* Live Activity Feed */}
        <motion.div className="cyber-card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column" }} {...FADE_UP} transition={{ delay: 0.2, duration: 0.35 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>LIVE ACTIVITY</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 6px #00ff88", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 9, color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
            </div>
          </div>
          <div className="dashboard-scroll" style={{ flex: 1, minHeight: 0, maxHeight: 220, display: "flex", flexDirection: "column", gap: 6 }}>
            {activity.map((event, i) => (
              <motion.div key={event.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "8px 10px", borderRadius: 7,
                  background: "rgba(0,0,0,0.22)", border: "1px solid #152035",
                  flexShrink: 0,
                }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 5, display: "flex", alignItems: "center",
                  justifyContent: "center", flexShrink: 0, fontSize: 11,
                  background: `${typeColors[event.type] || "#4a6080"}12`,
                  color: typeColors[event.type] || "#4a6080",
                  border: `1px solid ${typeColors[event.type] || "#4a6080"}25`,
                }}>
                  {typeIcons[event.type] || "·"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#c8d8e8", lineHeight: 1.4, fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {event.message}
                  </div>
                  <div style={{ fontSize: 9, color: "#3a5068", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    {event.file && <span style={{ color: "#253a50" }}> · {event.file}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Scan History */}
        <motion.div className="cyber-card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column" }} {...FADE_UP} transition={{ delay: 0.24, duration: 0.35 }}>
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>SCAN HISTORY</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {history.slice(0, 5).map((item) => {
              const scoreColor = item.score >= 70 ? "#00ff88" : item.score >= 50 ? "#ffb400" : item.score >= 30 ? "#ff6b35" : "#ff2b4e";
              return (
                <div key={item.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 7,
                  background: "rgba(0,0,0,0.22)", border: "1px solid #152035",
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700,
                    background: `${scoreColor}12`, color: scoreColor, border: `1px solid ${scoreColor}28`,
                  }}>
                    {item.grade}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.target}</span>
                      {item.critical > 0 && <span className="badge severity-critical">{item.critical}×CRIT</span>}
                    </div>
                    <div style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })} · {item.findings} findings · {item.duration}s
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, color: scoreColor, flexShrink: 0 }}>
                    {item.score}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
