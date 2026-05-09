import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { MCPServer } from "../types";

interface MCPPageProps {
  servers: MCPServer[];
}

const RISK_COLOR = (level: number) =>
  level >= 80 ? "#ff2b4e" : level >= 60 ? "#ff6b35" : level >= 40 ? "#ffb400" : "#00ff88";

const STATUS_CONFIG = {
  safe: { color: "#00ff88", icon: "✓", label: "SAFE" },
  risky: { color: "#ffb400", icon: "⚠", label: "RISKY" },
  critical: { color: "#ff2b4e", icon: "✗", label: "CRITICAL" },
  unknown: { color: "#4a6080", icon: "?", label: "UNKNOWN" },
};

export default function MCPPage({ servers }: MCPPageProps) {
  const [selected, setSelected] = useState<MCPServer | null>(null);

  return (
    <div className="h-full p-5 flex flex-col gap-4 overflow-y-auto">
      {/* Header stats */}
      <motion.div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {[
          { label: "TOTAL SERVERS", value: servers.length, color: "#00d4ff" },
          { label: "CRITICAL RISK", value: servers.filter(s => s.status === "critical").length, color: "#ff2b4e" },
          { label: "RISKY", value: servers.filter(s => s.status === "risky").length, color: "#ffb400" },
          { label: "SAFE", value: servers.filter(s => s.status === "safe").length, color: "#00ff88" },
        ].map(s => (
          <div key={s.label} className="cyber-card p-4 flex items-center gap-3">
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 700, color: s.color, textShadow: `0 0 15px ${s.color}40` }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Main layout */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Node visualization */}
        <motion.div className="cyber-card p-5 flex-1"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
            MCP SECURITY MAP
          </div>
          <div className="relative" style={{ height: 340 }}>
            {/* Central agent node */}
            <motion.div
              className="absolute rounded-xl flex flex-col items-center justify-center"
              style={{
                left: "50%", top: "50%", transform: "translate(-50%,-50%)",
                width: 80, height: 80, zIndex: 10,
                background: "linear-gradient(135deg, rgba(0,212,255,0.2), rgba(139,92,246,0.2))",
                border: "2px solid rgba(0,212,255,0.5)",
                boxShadow: "0 0 30px rgba(0,212,255,0.3)",
              }}
              animate={{ boxShadow: ["0 0 20px rgba(0,212,255,0.3)", "0 0 40px rgba(0,212,255,0.5)", "0 0 20px rgba(0,212,255,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div style={{ fontSize: 24 }}>🛡</div>
              <div style={{ fontSize: 8, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>AGENT</div>
            </motion.div>

            {/* Server nodes arranged in a circle */}
            {servers.map((server, i) => {
              const angle = (i / servers.length) * 2 * Math.PI - Math.PI / 2;
              const r = 130;
              const x = 50 + (r / 3.5) * Math.cos(angle) * 100 / 160;
              const y = 50 + (r / 2.3) * Math.sin(angle) * 100 / 130;
              const cfg = STATUS_CONFIG[server.status];

              return (
                <motion.div
                  key={server.id}
                  className="absolute cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", zIndex: 5 }}
                  whileHover={{ scale: 1.1, zIndex: 20 }}
                  onClick={() => setSelected(selected?.id === server.id ? null : server)}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  {/* Connection line to center */}
                  <svg
                    className="absolute pointer-events-none"
                    style={{ left: "50%", top: "50%", overflow: "visible", zIndex: -1 }}
                  >
                    <line
                      x1="0" y1="0"
                      x2={`${-(x - 50) * 3.2}`} y2={`${-(y - 50) * 2.6}`}
                      stroke={cfg.color} strokeWidth="1" strokeDasharray="4 3" opacity="0.3"
                    />
                  </svg>

                  <div
                    className="rounded-xl flex flex-col items-center justify-center p-3 relative"
                    style={{
                      width: 80, height: 72,
                      background: `${cfg.color}10`,
                      border: `1.5px solid ${selected?.id === server.id ? cfg.color : cfg.color + "50"}`,
                      boxShadow: selected?.id === server.id ? `0 0 20px ${cfg.color}40` : "none",
                    }}
                  >
                    {server.findings > 0 && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "#ff2b4e", fontSize: 9, fontWeight: 700, color: "#fff", boxShadow: "0 0 6px rgba(255,43,78,0.6)" }}>
                        {server.findings}
                      </div>
                    )}
                    <div style={{ fontSize: 18, marginBottom: 2 }}>⬢</div>
                    <div style={{ fontSize: 9, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", textAlign: "center", lineHeight: 1.3, maxWidth: 70, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {server.name}
                    </div>
                    <div style={{ fontSize: 8, color: cfg.color, fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                      {cfg.label}
                    </div>
                    {server.externalConnections && (
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-xs">🌐</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>{cfg.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-2">
              <span style={{ fontSize: 11 }}>🌐</span>
              <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>EXTERNAL</span>
            </div>
          </div>
        </motion.div>

        {/* Server list + detail */}
        <div className="flex flex-col gap-4" style={{ width: 280 }}>
          {/* Server list */}
          <motion.div className="cyber-card p-4 flex-1 overflow-y-auto"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 10 }}>
              SERVER LIST
            </div>
            <div className="space-y-2">
              {servers.map(server => {
                const cfg = STATUS_CONFIG[server.status];
                return (
                  <motion.div
                    key={server.id}
                    className="p-3 rounded-lg cursor-pointer transition-all"
                    onClick={() => setSelected(selected?.id === server.id ? null : server)}
                    style={{
                      background: selected?.id === server.id ? `${cfg.color}08` : "rgba(0,0,0,0.3)",
                      border: `1px solid ${selected?.id === server.id ? cfg.color + "50" : "#1a2d4a"}`,
                    }}
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: cfg.color, boxShadow: `0 0 4px ${cfg.color}` }} />
                      <span style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, flex: 1 }}>
                        {server.name}
                      </span>
                      {server.findings > 0 && (
                        <span className="badge severity-critical">{server.findings}</span>
                      )}
                    </div>
                    {/* Risk bar */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: "#1a2d4a" }}>
                        <div style={{ width: `${server.riskLevel}%`, height: "100%", background: RISK_COLOR(server.riskLevel), borderRadius: 9999 }} />
                      </div>
                      <span style={{ fontSize: 9, color: RISK_COLOR(server.riskLevel), fontFamily: "'JetBrains Mono', monospace", width: 28, textAlign: "right" }}>
                        {server.riskLevel}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Detail panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                className="cyber-card p-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                style={{ border: `1px solid ${STATUS_CONFIG[selected.status].color}40` }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full" style={{ background: STATUS_CONFIG[selected.status].color, boxShadow: `0 0 6px ${STATUS_CONFIG[selected.status].color}` }} />
                  <span style={{ fontSize: 13, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                    {selected.name}
                  </span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "STATUS", value: STATUS_CONFIG[selected.status].label, color: STATUS_CONFIG[selected.status].color },
                    { label: "RISK", value: `${selected.riskLevel}/100`, color: RISK_COLOR(selected.riskLevel) },
                    { label: "EXTERNAL", value: selected.externalConnections ? "YES" : "NO", color: selected.externalConnections ? "#ff6b35" : "#00ff88" },
                    { label: "FINDINGS", value: String(selected.findings), color: selected.findings > 0 ? "#ff2b4e" : "#00ff88" },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>{row.label}</span>
                      <span style={{ fontSize: 11, color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", marginBottom: 4 }}>PERMISSIONS</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.permissions.map(p => (
                        <span key={p} className="badge"
                          style={{ color: ["network", "execute", "write"].includes(p) ? "#ff6b35" : "#4a90d9", background: "rgba(74,144,217,0.1)", borderColor: "rgba(74,144,217,0.3)" }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                    CMD: <span style={{ color: "#6b8299" }}>{selected.command}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
