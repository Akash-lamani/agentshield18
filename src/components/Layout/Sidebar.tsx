import { motion } from "framer-motion";
import type { DashboardView } from "../../types";

interface SidebarProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  isScanning: boolean;
  isWatching: boolean;
  criticalCount: number;
}

const NAV_ITEMS: { id: DashboardView; label: string; icon: string }[] = [
  { id: "dashboard", label: "Overview", icon: "⬡" },
  { id: "vulnerabilities", label: "Vulnerabilities", icon: "⚡" },
  { id: "watchmode", label: "Watch Mode", icon: "◉" },
  { id: "attacksim", label: "Attack Simulator", icon: "☢" },
  { id: "mcp", label: "MCP Security", icon: "⬢" },
  { id: "policy", label: "Policy Engine", icon: "⊞" },
  { id: "terminal", label: "Terminal", icon: "›_" },
  { id: "report", label: "Reports", icon: "⊟" },
];

export default function Sidebar({ activeView, onViewChange, isScanning, isWatching, criticalCount }: SidebarProps) {
  return (
    <aside style={{
      width: 220, flexShrink: 0, display: "flex", flexDirection: "column", height: "100%",
      background: "#050c1e",
      borderRight: "1px solid #1a2d4a",
    }}>
      {/* Logo */}
      <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid #1a2d4a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
              background: "linear-gradient(135deg, rgba(0,212,255,0.18), rgba(139,92,246,0.18))",
              border: "1px solid rgba(0,212,255,0.35)",
              boxShadow: "0 0 12px rgba(0,212,255,0.12)",
            }}>🛡</div>
            {criticalCount > 0 && (
              <div className="critical-pulse" style={{
                position: "absolute", top: -5, right: -5, width: 16, height: 16,
                borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: "#ff2b4e", fontSize: 8, fontWeight: 700, color: "#fff",
                border: "1px solid #020510",
              }}>
                {criticalCount > 9 ? "9+" : criticalCount}
              </div>
            )}
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700, color: "#00d4ff", letterSpacing: "0.05em", lineHeight: 1 }}>
              AGENT<span style={{ color: "#8b5cf6" }}>SHIELD</span>
            </div>
            <div style={{ fontSize: 8, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginTop: 2 }}>
              AI SECURITY PLATFORM
            </div>
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div style={{
        padding: "8px 16px", borderBottom: "1px solid #1a2d4a",
        background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: isScanning ? "#ffb400" : "#00ff88",
            boxShadow: isScanning ? "0 0 6px #ffb400" : "0 0 6px #00ff88",
            animation: isScanning ? "pulse 0.8s infinite" : undefined,
          }} />
          <span style={{ fontSize: 9, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace" }}>
            {isScanning ? "SCANNING" : "READY"}
          </span>
        </div>
        {isWatching && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 6px #00d4ff", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 9, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>WATCH</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 10px 6px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ fontSize: 9, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.14em", padding: "4px 8px 6px" }}>
          MODULES
        </div>
        {NAV_ITEMS.map((item) => (
          <motion.button
            key={item.id}
            className={`nav-item ${activeView === item.id ? "active" : ""}`}
            onClick={() => onViewChange(item.id)}
            whileHover={{ x: 2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span style={{ fontSize: 13, width: 18, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
            <span style={{ fontSize: 12, flex: 1 }}>{item.label}</span>
            {item.id === "attacksim" && (
              <span style={{ fontSize: 8, color: "#ff6b35", background: "rgba(255,107,53,0.12)", border: "1px solid rgba(255,107,53,0.28)", borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace" }}>
                DEMO
              </span>
            )}
            {item.id === "watchmode" && isWatching && (
              <span style={{ fontSize: 8, color: "#00d4ff", background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.28)", borderRadius: 3, padding: "1px 5px", fontFamily: "'JetBrains Mono', monospace" }}>
                LIVE
              </span>
            )}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "10px 14px 12px", borderTop: "1px solid #1a2d4a" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.35)", color: "#8b5cf6", fontWeight: 600 }}>
            A
          </div>
          <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace" }}>admin@shield.ai</span>
        </div>
        <div style={{ fontSize: 8, color: "#253a50", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>
          v2.4.1 · OWASP LLM Top 10
        </div>
      </div>
    </aside>
  );
}
