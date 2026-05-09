import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import type { Finding } from "../types";

interface WatchModePageProps {
  isWatching: boolean;
  onToggleWatch: () => void;
  liveFindings: Finding[];
}

const WATCHED_FILES = [
  "src/agent/chat-handler.ts",
  ".claude/mcp.json",
  "settings.json",
  "CLAUDE.md",
  "src/tools/file-reader.ts",
  "src/server/index.ts",
  "src/logger/history.ts",
];

export default function WatchModePage({ isWatching, onToggleWatch, liveFindings }: WatchModePageProps) {
  const [scanCount, setScanCount] = useState(0);
  const [pulseFile, setPulseFile] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isWatching) return;
    const interval = setInterval(() => {
      setScanCount(c => c + 1);
      const randomFile = WATCHED_FILES[Math.floor(Math.random() * WATCHED_FILES.length)];
      setPulseFile(randomFile);
      setTimeout(() => setPulseFile(null), 600);
    }, 2000);
    return () => clearInterval(interval);
  }, [isWatching]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [liveFindings]);

  return (
    <div className="h-full p-5 flex flex-col gap-4">
      {/* Control panel */}
      <motion.div className="cyber-card p-5 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 600, color: "#c8d8e8", letterSpacing: "0.05em" }}>
                WATCH MODE
              </div>
              <div style={{ fontSize: 11, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                Real-time file monitoring & vulnerability detection
              </div>
            </div>
            <div className="flex items-center gap-4 pl-6" style={{ borderLeft: "1px solid #1a2d4a" }}>
              {[
                { label: "FILES WATCHED", value: isWatching ? WATCHED_FILES.length : 0, color: "#00d4ff" },
                { label: "SCANS DONE", value: scanCount, color: "#8b5cf6" },
                { label: "DETECTIONS", value: liveFindings.length, color: liveFindings.length > 0 ? "#ff2b4e" : "#4a6080" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 700, color: s.color }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isWatching && liveFindings.some(f => f.severity === "critical") && (
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-2 rounded"
                style={{ background: "rgba(255,43,78,0.1)", border: "1px solid rgba(255,43,78,0.4)" }}
              >
                <div className="w-2 h-2 rounded-full" style={{ background: "#ff2b4e", boxShadow: "0 0 6px #ff2b4e" }} />
                <span style={{ color: "#ff2b4e", fontSize: 11, fontFamily: "'Orbitron', monospace", fontWeight: 600 }}>
                  CRITICAL THREAT DETECTED
                </span>
              </motion.div>
            )}
            <motion.button
              onClick={onToggleWatch}
              whileTap={{ scale: 0.95 }}
              className={isWatching ? "cyber-btn-danger" : "cyber-btn-success"}
              style={{ minWidth: 140 }}
            >
              {isWatching ? "⏹ STOP WATCH" : "▶ START WATCH"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* File watcher */}
        <motion.div className="cyber-card p-5 w-64 flex-shrink-0 overflow-y-auto"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 12 }}>
            WATCHED FILES
          </div>
          <div className="space-y-1.5">
            {WATCHED_FILES.map((file) => {
              const hasAlert = liveFindings.some(f => f.file === file);
              const isPulsing = pulseFile === file;
              return (
                <motion.div
                  key={file}
                  animate={isPulsing ? { backgroundColor: ["rgba(0,212,255,0)", "rgba(0,212,255,0.1)", "rgba(0,212,255,0)"] } : {}}
                  className="flex items-center gap-2 py-1.5 px-2 rounded"
                  style={{ background: hasAlert ? "rgba(255,43,78,0.06)" : "rgba(0,0,0,0.2)", border: `1px solid ${hasAlert ? "rgba(255,43,78,0.2)" : "#1a2d4a"}`, transition: "all 0.3s" }}
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{
                    background: hasAlert ? "#ff2b4e" : isPulsing ? "#00d4ff" : isWatching ? "#00ff88" : "#4a6080",
                    boxShadow: hasAlert ? "0 0 6px #ff2b4e" : isPulsing ? "0 0 6px #00d4ff" : isWatching ? "0 0 4px #00ff88" : "none",
                  }} />
                  <span style={{ fontSize: 10, color: hasAlert ? "#ff8899" : "#6b8299", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {isWatching && (
            <motion.div className="mt-4 p-3 rounded"
              style={{ background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ fontSize: 9, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>
                WATCH STATUS
              </div>
              <div className="space-y-1">
                {["inotify", "debounce 500ms", "deep scan", "OWASP rules"].map(s => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span style={{ color: "#00ff88", fontSize: 10 }}>✓</span>
                    <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>{s}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Live Feed */}
        <motion.div className="cyber-card flex-1 flex flex-col"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #1a2d4a" }}>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              DETECTION FEED
            </div>
            {isWatching && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff88", boxShadow: "0 0 6px #00ff88", animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 9, color: "#00ff88", fontFamily: "'JetBrains Mono', monospace" }}>LIVE</span>
              </div>
            )}
            {!isWatching && liveFindings.length === 0 && (
              <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                Start watch mode to begin monitoring
              </span>
            )}
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {!isWatching && liveFindings.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div style={{ fontSize: 40 }}>◉</div>
                <div style={{ fontSize: 13, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                  Watch mode inactive
                </div>
                <button className="cyber-btn-primary" onClick={onToggleWatch}>
                  ▶ START WATCH MODE
                </button>
              </div>
            )}

            <AnimatePresence>
              {liveFindings.map((finding) => (
                <motion.div
                  key={finding.id}
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-lg relative overflow-hidden"
                  style={{
                    background: finding.severity === "critical" ? "rgba(255,43,78,0.08)" : "rgba(255,107,53,0.06)",
                    border: `1px solid ${finding.severity === "critical" ? "rgba(255,43,78,0.4)" : "rgba(255,107,53,0.3)"}`,
                  }}
                >
                  {finding.severity === "critical" && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: "radial-gradient(ellipse at 100% 0%, rgba(255,43,78,0.1), transparent 60%)" }} />
                  )}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        background: finding.severity === "critical" ? "rgba(255,43,78,0.15)" : "rgba(255,107,53,0.15)",
                        border: `1px solid ${finding.severity === "critical" ? "rgba(255,43,78,0.4)" : "rgba(255,107,53,0.4)"}`,
                      }}>
                      {finding.severity === "critical" ? "🚨" : "⚠"}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`badge severity-${finding.severity}`}>{finding.severity.toUpperCase()}</span>
                        <span style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>
                          {finding.title}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "#8899aa", lineHeight: 1.5 }}>{finding.description}</div>
                      {finding.evidence && (
                        <div className="mt-2 px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.3)", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "#ff8899" }}>
                          {finding.evidence}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                          📁 {finding.file}{finding.line ? `:${finding.line}` : ""}
                        </span>
                        {finding.owaspCategory && (
                          <span className="badge" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" }}>
                            {finding.owaspCategory}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>
                          {new Date(finding.detectedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
