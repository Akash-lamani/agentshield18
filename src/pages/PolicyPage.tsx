import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Policy } from "../types";

interface PolicyPageProps {
  policies: Policy[];
  onTogglePolicy: (id: string) => void;
}

export default function PolicyPage({ policies, onTogglePolicy }: PolicyPageProps) {
  const [selected, setSelected] = useState<Policy | null>(null);

  const totalViolations = policies.reduce((s, p) => s + p.violations, 0);
  const totalBlocked = policies.reduce((s, p) => s + p.blockedActions, 0);
  const activeCount = policies.filter(p => p.enabled).length;
  const complianceScore = Math.round((activeCount / policies.length) * 100);

  const categoryColor: Record<string, string> = {
    network: "#00d4ff", secrets: "#ff2b4e", injection: "#ff6b35",
    permissions: "#ffb400", agents: "#8b5cf6", resource: "#4a90d9",
  };

  return (
    <div className="h-full p-5 flex flex-col gap-4 overflow-y-auto">
      {/* Stats */}
      <motion.div className="grid gap-3" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        {[
          { label: "ACTIVE POLICIES", value: activeCount, total: policies.length, color: "#00ff88" },
          { label: "COMPLIANCE SCORE", value: `${complianceScore}%`, color: complianceScore >= 80 ? "#00ff88" : "#ffb400" },
          { label: "VIOLATIONS", value: totalViolations, color: totalViolations > 0 ? "#ff6b35" : "#00ff88" },
          { label: "BLOCKED ACTIONS", value: totalBlocked, color: "#00d4ff" },
        ].map(s => (
          <div key={s.label} className="cyber-card p-4">
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: s.color, textShadow: `0 0 15px ${s.color}40`, marginBottom: 4 }}>
              {s.value}
              {(s as any).total && <span style={{ fontSize: 14, opacity: 0.5 }}>/{(s as any).total}</span>}
            </div>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
              {s.label}
            </div>
          </div>
        ))}
      </motion.div>

      {/* Compliance bar */}
      <motion.div className="cyber-card p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.08 }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
            ORGANIZATION COMPLIANCE
          </span>
          <span style={{ fontSize: 12, color: complianceScore >= 80 ? "#00ff88" : "#ffb400", fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
            {complianceScore}%
          </span>
        </div>
        <div className="rounded-full overflow-hidden" style={{ height: 8, background: "#1a2d4a" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${complianceScore}%` }}
            transition={{ duration: 1, delay: 0.2 }}
            style={{
              height: "100%", borderRadius: 9999,
              background: complianceScore >= 80 ? "linear-gradient(90deg, #00cc6a, #00ff88)" : "linear-gradient(90deg, #ff8c00, #ffb400)",
              boxShadow: `0 0 8px ${complianceScore >= 80 ? "rgba(0,255,136,0.5)" : "rgba(255,180,0,0.5)"}`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>0%</span>
          <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>100%</span>
        </div>
      </motion.div>

      {/* Policy list */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 space-y-2 overflow-y-auto">
          {policies.map((policy, i) => {
            const catColor = categoryColor[policy.category] || "#4a6080";
            return (
              <motion.div
                key={policy.id}
                className="cyber-card p-4 cursor-pointer transition-all"
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                onClick={() => setSelected(selected?.id === policy.id ? null : policy)}
                style={selected?.id === policy.id ? { border: "1px solid rgba(0,212,255,0.3)", background: "rgba(0,212,255,0.04)" } : {}}
                whileHover={{ x: 2 }}
              >
                <div className="flex items-center gap-3">
                  {/* Toggle */}
                  <div
                    className="relative rounded-full cursor-pointer flex-shrink-0 transition-all"
                    style={{
                      width: 36, height: 20,
                      background: policy.enabled ? "rgba(0,255,136,0.2)" : "rgba(74,96,128,0.2)",
                      border: `1px solid ${policy.enabled ? "rgba(0,255,136,0.5)" : "#2a4060"}`,
                    }}
                    onClick={e => { e.stopPropagation(); onTogglePolicy(policy.id); }}
                  >
                    <motion.div
                      animate={{ left: policy.enabled ? 18 : 2 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full"
                      style={{ background: policy.enabled ? "#00ff88" : "#4a6080", boxShadow: policy.enabled ? "0 0 6px #00ff88" : "none" }}
                    />
                  </div>

                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: catColor, flexShrink: 0, boxShadow: `0 0 4px ${catColor}` }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, color: policy.enabled ? "#c8d8e8" : "#6b8299", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                        {policy.name}
                      </span>
                      <span className="badge" style={{ color: catColor, background: `${catColor}10`, borderColor: `${catColor}30` }}>
                        {policy.category}
                      </span>
                      <span className={`badge severity-${policy.severity}`}>{policy.severity.toUpperCase()}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                      {policy.description}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <div style={{ fontSize: 14, fontWeight: 600, color: policy.violations > 0 ? "#ff6b35" : "#4a6080", fontFamily: "'Orbitron', monospace" }}>
                        {policy.violations}
                      </div>
                      <div style={{ fontSize: 8, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace" }}>VIOLATIONS</div>
                    </div>
                    <div className="text-center">
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#00d4ff", fontFamily: "'Orbitron', monospace" }}>
                        {policy.blockedActions}
                      </div>
                      <div style={{ fontSize: 8, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace" }}>BLOCKED</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div
              className="cyber-card p-5 w-72 flex-shrink-0"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              style={{ border: `1px solid ${categoryColor[selected.category] || "#1a2d4a"}40` }}
            >
              <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 12 }}>
                POLICY DETAIL
              </div>
              <div style={{ fontSize: 14, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, marginBottom: 8 }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b8299", lineHeight: 1.6, marginBottom: 16 }}>
                {selected.description}
              </div>

              <div className="space-y-3">
                {[
                  { label: "STATUS", value: selected.enabled ? "ENABLED" : "DISABLED", color: selected.enabled ? "#00ff88" : "#4a6080" },
                  { label: "CATEGORY", value: selected.category.toUpperCase(), color: categoryColor[selected.category] || "#4a6080" },
                  { label: "SEVERITY", value: selected.severity.toUpperCase(), color: "#c8d8e8" },
                  { label: "VIOLATIONS", value: `${selected.violations} events`, color: selected.violations > 0 ? "#ff6b35" : "#00ff88" },
                  { label: "BLOCKED", value: `${selected.blockedActions} actions`, color: "#00d4ff" },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #0d1a2e" }}>
                    <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>{row.label}</span>
                    <span style={{ fontSize: 11, color: row.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <motion.button
                className={selected.enabled ? "cyber-btn-danger" : "cyber-btn-success"}
                style={{ width: "100%", marginTop: 16 }}
                onClick={() => onTogglePolicy(selected.id)}
                whileTap={{ scale: 0.97 }}
              >
                {selected.enabled ? "DISABLE POLICY" : "ENABLE POLICY"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
