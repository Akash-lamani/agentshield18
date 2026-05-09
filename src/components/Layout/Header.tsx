import { motion } from "framer-motion";
import type { SecurityReport } from "../../types";

interface HeaderProps {
  report: SecurityReport;
  isScanning: boolean;
  isWatching: boolean;
  onScan: () => void;
  onWatch: () => void;
  title: string;
}

export default function Header({ report, isScanning, isWatching, onScan, onWatch, title }: HeaderProps) {
  const now = new Date().toLocaleTimeString("en-US", { hour12: false });
  const scoreColor = report.score.numericScore >= 70 ? "#00ff88"
    : report.score.numericScore >= 50 ? "#ffb400"
    : report.score.numericScore >= 30 ? "#ff6b35"
    : "#ff2b4e";

  return (
    <header style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px", height: 56, flexShrink: 0,
      background: "#050c1e", borderBottom: "1px solid #1a2d4a",
      gap: 16, minWidth: 0,
    }}>

      {/* Left — Title + target */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "0 0 auto" }}>
        <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#c8d8e8", letterSpacing: "0.06em", margin: 0, whiteSpace: "nowrap" }}>
          {title.toUpperCase()}
        </h1>
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "3px 10px", borderRadius: 5, whiteSpace: "nowrap",
          background: "rgba(0,0,0,0.3)", border: "1px solid #1a2d4a",
        }}>
          <span style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>TARGET:</span>
          <span style={{ fontSize: 9, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>
            /workspace/my-ai-agent
          </span>
        </div>
      </div>

      {/* Center — Score + stats */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, flex: "0 0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>SCORE</span>
          <motion.div key={report.score.numericScore} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 700, color: scoreColor, textShadow: `0 0 10px ${scoreColor}70` }}>
            {report.score.numericScore}
          </motion.div>
          <div style={{
            padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 700,
            fontFamily: "'Orbitron', monospace", background: `${scoreColor}18`,
            border: `1px solid ${scoreColor}50`, color: scoreColor,
          }}>
            {report.score.grade}
          </div>
        </div>

        <div style={{ width: 1, height: 24, background: "#1a2d4a" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {[
            { label: "CRIT", value: report.summary.critical, color: "#ff2b4e" },
            { label: "HIGH", value: report.summary.high, color: "#ff6b35" },
            { label: "MED", value: report.summary.medium, color: "#ffb400" },
            { label: "LOW", value: report.summary.low, color: "#4a90d9" },
          ].map(item => (
            <div key={item.label} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: "'Orbitron', monospace", lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: 8, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "0 0 auto" }}>
        <span style={{ fontSize: 9, color: "#253a50", fontFamily: "'JetBrains Mono', monospace" }}>{now}</span>

        <motion.button className="cyber-btn" onClick={onWatch} whileTap={{ scale: 0.95 }}
          style={isWatching ? { borderColor: "rgba(0,212,255,0.5)", color: "#00d4ff", background: "rgba(0,212,255,0.07)" } : {}}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isWatching ? "#00d4ff" : "#3a5068",
            boxShadow: isWatching ? "0 0 6px #00d4ff" : "none",
            animation: isWatching ? "pulse 1.5s infinite" : "none",
          }} />
          {isWatching ? "WATCHING" : "WATCH"}
        </motion.button>

        <motion.button className="cyber-btn-primary" onClick={onScan} disabled={isScanning} whileTap={{ scale: 0.95 }}>
          {isScanning ? (
            <>
              <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "#00d4ff", animation: "spin 0.8s linear infinite" }} />
              SCANNING...
            </>
          ) : (
            <>⚡ SCAN</>
          )}
        </motion.button>
      </div>
    </header>
  );
}
