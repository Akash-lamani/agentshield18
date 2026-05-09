import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Finding } from "../types";
import { ATTACK_PAYLOADS } from "../data/mockData";

interface AttackSimPageProps {
  onInjectAttack: (finding: Finding) => void;
  onApplyFix: () => void;
  onRescan: () => void;
  score: number;
  isScanning: boolean;
  injectedFindings: Finding[];
  isFixed: boolean;
}

const ATTACKS = [
  {
    id: "promptInjection",
    label: "Inject Prompt Injection",
    icon: "🧠",
    color: "#ff2b4e",
    description: "Simulates an attacker injecting malicious instructions via user input to override LLM behavior",
    payload: ATTACK_PAYLOADS.promptInjection,
    owaspRef: "LLM01",
    impact: "Full system compromise, data exfiltration, unauthorized actions",
  },
  {
    id: "dangerousMCP",
    label: "Inject Dangerous MCP",
    icon: "⚙",
    color: "#ff6b35",
    description: "Injects a malicious MCP server configuration that exfiltrates SSH keys and environment secrets",
    payload: ATTACK_PAYLOADS.dangerousMCP,
    owaspRef: "LLM07",
    impact: "SSH key theft, credential exfiltration, persistent backdoor",
  },
  {
    id: "secretLeak",
    label: "Inject Secret Leak",
    icon: "🔑",
    color: "#ffb400",
    description: "Plants hardcoded production secrets including API keys, database passwords, and OAuth tokens",
    payload: ATTACK_PAYLOADS.secretLeak,
    owaspRef: "LLM06",
    impact: "Production system access, financial fraud, data breach",
  },
];

export default function AttackSimPage({ onInjectAttack, onApplyFix, onRescan, score, isScanning, injectedFindings, isFixed }: AttackSimPageProps) {
  const [activeAttack, setActiveAttack] = useState<string | null>(null);
  const [showCode, setShowCode] = useState<string | null>(null);
  const [fixApplied, setFixApplied] = useState(false);

  const handleInject = (attackId: string) => {
    setActiveAttack(attackId);
    const attack = ATTACKS.find(a => a.id === attackId);
    if (!attack) return;
    const payloadKey = attackId as keyof typeof ATTACK_PAYLOADS;
    onInjectAttack(ATTACK_PAYLOADS[payloadKey].finding as Finding);
    setTimeout(() => setActiveAttack(null), 1000);
  };

  const handleFix = () => {
    setFixApplied(true);
    onApplyFix();
  };

  const scoreColor = score >= 70 ? "#00ff88" : score >= 50 ? "#ffb400" : score >= 30 ? "#ff6b35" : "#ff2b4e";

  return (
    <div className="h-full p-5 flex flex-col gap-4 overflow-y-auto">
      {/* Demo Mode Banner */}
      <motion.div
        className="animated-border rounded-lg p-4 relative overflow-hidden"
        style={{ background: "rgba(6,13,31,0.9)" }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,107,53,0.08), transparent 60%)" }} />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">☢</div>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 700, color: "#ff6b35", letterSpacing: "0.05em" }}>
                ATTACK SIMULATOR — DEMO MODE
              </div>
              <div style={{ fontSize: 11, color: "#8899aa", marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                Inject real attack vectors, trigger live detection, watch AgentShield respond in real-time
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{ background: "rgba(255,107,53,0.1)", border: "1px solid rgba(255,107,53,0.3)" }}>
            <div className="w-2 h-2 rounded-full" style={{ background: "#ff6b35", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#ff6b35", fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>LIVE DEMO</span>
          </div>
        </div>
      </motion.div>

      {/* Score indicator */}
      <motion.div className="cyber-card p-4 flex items-center gap-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <div>
          <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>CURRENT SECURITY SCORE</div>
          <div className="flex items-center gap-3">
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 36, fontWeight: 700, color: scoreColor, textShadow: `0 0 20px ${scoreColor}60` }}>
              {score}
            </div>
            <div className="w-32 rounded-full overflow-hidden" style={{ height: 6, background: "#1a2d4a" }}>
              <motion.div
                animate={{ width: `${score}%` }}
                transition={{ duration: 0.8 }}
                style={{ height: "100%", background: scoreColor, borderRadius: 9999, boxShadow: `0 0 8px ${scoreColor}60` }}
              />
            </div>
          </div>
        </div>

        <div className="flex-1 flex items-center gap-3 pl-4" style={{ borderLeft: "1px solid #1a2d4a" }}>
          {injectedFindings.length > 0 ? (
            <>
              <div style={{ fontSize: 12, color: "#ff2b4e", fontFamily: "'JetBrains Mono', monospace" }}>
                🚨 {injectedFindings.length} attack{injectedFindings.length > 1 ? "s" : ""} detected
              </div>
              <AnimatePresence>
                {injectedFindings.map(f => (
                  <motion.div key={f.id}
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="badge severity-critical">{f.category.toUpperCase()}</motion.div>
                ))}
              </AnimatePresence>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
              No active attacks detected. Use buttons below to simulate.
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {injectedFindings.length > 0 && !isFixed && (
            <motion.button
              className="cyber-btn-success flex items-center gap-2"
              onClick={handleFix}
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              whileTap={{ scale: 0.95 }}
            >
              🔧 APPLY FIX
            </motion.button>
          )}
          <motion.button
            className={`cyber-btn-primary flex items-center gap-2 ${isScanning ? "opacity-70" : ""}`}
            onClick={onRescan}
            disabled={isScanning}
            whileTap={{ scale: 0.95 }}
          >
            {isScanning ? (
              <>
                <div className="w-3 h-3 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: "#00d4ff", animation: "spin 0.8s linear infinite" }} />
                RESCANNING...
              </>
            ) : <>⟳ RESCAN</>}
          </motion.button>
        </div>
      </motion.div>

      {/* Attack Buttons */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {ATTACKS.map((attack, i) => {
          const isInjected = injectedFindings.some(f => f.category === ATTACK_PAYLOADS[attack.id as keyof typeof ATTACK_PAYLOADS].finding.category);
          return (
            <motion.div
              key={attack.id}
              className="cyber-card p-5 relative overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              style={isInjected ? { border: `1px solid ${attack.color}60`, background: `rgba(${attack.color.slice(1).match(/.{2}/g)?.map(x => parseInt(x, 16)).join(",")},0.06)` } : {}}
            >
              {isInjected && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at 50% 0%, ${attack.color}10, transparent 60%)` }} />
              )}

              <div className="flex items-start gap-3 mb-4">
                <div className="text-3xl">{attack.icon}</div>
                <div className="flex-1">
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: "#c8d8e8", marginBottom: 4 }}>
                    {attack.label}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b8299", lineHeight: 1.5 }}>{attack.description}</div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", width: 50, flexShrink: 0 }}>OWASP</span>
                  <span className="badge" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" }}>{attack.owaspRef}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", width: 50, flexShrink: 0 }}>IMPACT</span>
                  <span style={{ fontSize: 10, color: "#8899aa", fontFamily: "'JetBrains Mono', monospace" }}>{attack.impact}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em", width: 50, flexShrink: 0 }}>FILE</span>
                  <span style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace" }}>{attack.payload.file}</span>
                </div>
              </div>

              {/* Payload preview */}
              <div
                className="mb-4 rounded overflow-hidden cursor-pointer"
                onClick={() => setShowCode(showCode === attack.id ? null : attack.id)}
                style={{ border: "1px solid #1a2d4a" }}
              >
                <div className="px-3 py-1.5 flex items-center justify-between"
                  style={{ background: "rgba(0,0,0,0.4)", borderBottom: "1px solid #1a2d4a" }}>
                  <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
                    PAYLOAD PREVIEW — {attack.payload.file}
                  </span>
                  <span style={{ fontSize: 9, color: "#4a6080" }}>{showCode === attack.id ? "▲" : "▼"}</span>
                </div>
                <AnimatePresence>
                  {showCode === attack.id && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <pre style={{
                        padding: "10px 12px", margin: 0, fontSize: 10, lineHeight: 1.6,
                        fontFamily: "'JetBrains Mono', monospace", color: "#88aacc",
                        background: "rgba(0,0,0,0.6)", overflow: "auto", maxHeight: 140,
                      }}>
                        {attack.payload.content}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                className={isInjected ? "cyber-btn" : "cyber-btn-danger"}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                onClick={() => !isInjected && handleInject(attack.id)}
                disabled={isInjected}
                whileTap={{ scale: 0.97 }}
                animate={activeAttack === attack.id ? { scale: [1, 0.95, 1.02, 1] } : {}}
              >
                {isInjected ? (
                  <><span style={{ color: "#ff2b4e" }}>🚨</span> DETECTED</>
                ) : (
                  <>{attack.icon} {attack.label.toUpperCase()}</>
                )}
              </motion.button>
            </motion.div>
          );
        })}
      </div>

      {/* Fix workflow */}
      <AnimatePresence>
        {isFixed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="cyber-card p-5 relative overflow-hidden"
            style={{ border: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.04)" }}
          >
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(0,255,136,0.06), transparent 60%)" }} />
            <div className="flex items-center gap-4">
              <div className="text-3xl">✅</div>
              <div className="flex-1">
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 600, color: "#00ff88", marginBottom: 4 }}>
                  FIXES APPLIED — SECURITY IMPROVED
                </div>
                <div style={{ fontSize: 12, color: "#66ccaa", fontFamily: "'JetBrains Mono', monospace" }}>
                  Critical vulnerabilities patched. Run rescan to verify improvements and update security score.
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 700, color: "#00ff88", textShadow: "0 0 20px rgba(0,255,136,0.6)" }}>
                  {score}
                </div>
                <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>NEW SCORE</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Demo flow guide */}
      <motion.div className="cyber-card p-5"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 12 }}>
          DEMO FLOW GUIDE
        </div>
        <div className="flex items-center gap-2">
          {[
            { step: "1", label: "Start Watch Mode", icon: "◉", color: "#00d4ff" },
            { step: "→", label: "", icon: "→", color: "#1a2d4a" },
            { step: "2", label: "Inject Attack", icon: "☢", color: "#ff6b35" },
            { step: "→", label: "", icon: "→", color: "#1a2d4a" },
            { step: "3", label: "Live Detection", icon: "⚡", color: "#ff2b4e" },
            { step: "→", label: "", icon: "→", color: "#1a2d4a" },
            { step: "4", label: "Apply Fix", icon: "🔧", color: "#ffb400" },
            { step: "→", label: "", icon: "→", color: "#1a2d4a" },
            { step: "5", label: "Rescan", icon: "⟳", color: "#8b5cf6" },
            { step: "→", label: "", icon: "→", color: "#1a2d4a" },
            { step: "6", label: "Score Improved", icon: "📈", color: "#00ff88" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.step === "→" ? (
                <span style={{ color: "#1a2d4a", fontSize: 16 }}>→</span>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 rounded"
                  style={{ background: `${item.color}10`, border: `1px solid ${item.color}30` }}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ fontSize: 11, color: item.color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, whiteSpace: "nowrap" }}>
                    {item.step}. {item.label}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
