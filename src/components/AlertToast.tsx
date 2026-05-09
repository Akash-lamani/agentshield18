import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Finding } from "../types";

interface AlertToastProps {
  alerts: Finding[];
  onDismiss: (id: string) => void;
}

const SEVERITY_CONFIG = {
  critical: { border: "#ff2b4e", bg: "rgba(255,43,78,0.10)", glow: "rgba(255,43,78,0.18)", label: "CRITICAL", icon: "🚨", pulse: true },
  high: { border: "#ff6b35", bg: "rgba(255,107,53,0.09)", glow: "rgba(255,107,53,0.14)", label: "HIGH", icon: "⚠️", pulse: false },
  medium: { border: "#ffb400", bg: "rgba(255,180,0,0.08)", glow: "rgba(255,180,0,0.10)", label: "MEDIUM", icon: "⚡", pulse: false },
  low: { border: "#4a90d9", bg: "rgba(74,144,217,0.08)", glow: "rgba(74,144,217,0.10)", label: "LOW", icon: "ℹ️", pulse: false },
  info: { border: "#4a6080", bg: "rgba(74,96,128,0.08)", glow: "rgba(74,96,128,0.08)", label: "INFO", icon: "·", pulse: false },
};

const AUTO_DISMISS_MS = 7000;
const MAX_VISIBLE = 3;

export default function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  const timerMap = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    alerts.forEach((alert) => {
      if (!timerMap.current.has(alert.id)) {
        const timer = setTimeout(() => {
          onDismiss(alert.id);
          timerMap.current.delete(alert.id);
        }, AUTO_DISMISS_MS);
        timerMap.current.set(alert.id, timer);
      }
    });
    timerMap.current.forEach((timer, id) => {
      if (!alerts.find((a) => a.id === id)) {
        clearTimeout(timer);
        timerMap.current.delete(id);
      }
    });
  }, [alerts, onDismiss]);

  useEffect(() => () => { timerMap.current.forEach((t) => clearTimeout(t)); }, []);

  const visible = alerts.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, alerts.length - MAX_VISIBLE);

  return (
    <div style={{
      position: "fixed", top: 68, right: 16, zIndex: 9999,
      width: 356, maxWidth: "calc(100vw - 32px)",
      display: "flex", flexDirection: "column", gap: 8,
      pointerEvents: "none",
    }}>
      <AnimatePresence initial={false} mode="sync">
        {visible.map((alert) => {
          const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] ?? SEVERITY_CONFIG.info;
          return (
            <motion.div key={alert.id} layout
              initial={{ opacity: 0, x: 80, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              style={{ pointerEvents: "auto", willChange: "transform" }}
            >
              <div style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}55`,
                borderRadius: 10, overflow: "hidden",
                boxShadow: `0 8px 28px rgba(0,0,0,0.55), 0 0 18px ${cfg.glow}`,
                backdropFilter: "blur(8px)", position: "relative",
              }}>
                <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${cfg.border}cc, transparent)` }} />
                {cfg.pulse && (
                  <div className="critical-pulse" style={{
                    position: "absolute", inset: 0, borderRadius: 10,
                    border: `1px solid ${cfg.border}35`, pointerEvents: "none",
                  }} />
                )}
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 8, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                      fontSize: 16, background: `${cfg.border}14`, border: `1px solid ${cfg.border}35`,
                    }}>{cfg.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", padding: "1px 7px",
                          borderRadius: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 600, color: cfg.border, background: `${cfg.border}16`,
                          border: `1px solid ${cfg.border}40`, letterSpacing: "0.07em",
                        }}>{cfg.label}</span>
                        {cfg.pulse && (
                          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.9, repeat: Infinity }}
                            style={{ fontSize: 9, color: cfg.border, fontFamily: "'Orbitron', monospace", fontWeight: 600, letterSpacing: "0.06em" }}>
                            LIVE
                          </motion.span>
                        )}
                      </div>
                      <div style={{
                        fontSize: 11, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500, lineHeight: 1.45, marginBottom: 2,
                        overflow: "hidden", display: "-webkit-box",
                        WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                      }}>{alert.title}</div>
                      {alert.file && (
                        <div style={{
                          fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>📁 {alert.file}</div>
                      )}
                    </div>
                    <button onClick={() => onDismiss(alert.id)} style={{
                      flexShrink: 0, width: 22, height: 22, borderRadius: 5,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#4a6080", fontSize: 12, background: "rgba(255,255,255,0.04)",
                      border: "1px solid #1a2d4a", cursor: "pointer", transition: "all 0.15s", lineHeight: 1,
                    }}>✕</button>
                  </div>
                  <div style={{ marginTop: 8, height: 2, background: "#1a2d4a", borderRadius: 9999, overflow: "hidden" }}>
                    <motion.div initial={{ width: "100%" }} animate={{ width: "0%" }}
                      transition={{ duration: AUTO_DISMISS_MS / 1000, ease: "linear" }}
                      style={{ height: "100%", background: `linear-gradient(90deg, ${cfg.border}80, ${cfg.border})`, borderRadius: 9999 }} />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
        {overflow > 0 && (
          <motion.div key="overflow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => alerts.slice(MAX_VISIBLE).forEach((a) => onDismiss(a.id))}
            style={{
              pointerEvents: "auto", textAlign: "center", padding: "5px 12px", borderRadius: 8,
              background: "rgba(10,22,40,0.92)", border: "1px solid #1a2d4a",
              fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace",
              backdropFilter: "blur(8px)", cursor: "pointer",
            }}>
            +{overflow} more — click to dismiss all
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
