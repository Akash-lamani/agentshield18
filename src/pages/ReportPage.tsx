import { motion } from "framer-motion";
import { useState } from "react";
import type { SecurityReport } from "../types";
import { format } from "date-fns";

interface ReportPageProps {
  report: SecurityReport;
  onGenerateReport: () => void;
}

const OWASP_LABELS: Record<string, string> = {
  LLM01: "Prompt Injection", LLM02: "Insecure Output Handling",
  LLM03: "Training Data Poisoning", LLM04: "Model DoS",
  LLM05: "Supply Chain Vulnerabilities", LLM06: "Sensitive Info Disclosure",
  LLM07: "Insecure Plugin Design", LLM08: "Excessive Agency",
  LLM09: "Overreliance", LLM10: "Model Theft",
};

export default function ReportPage({ report, onGenerateReport }: ReportPageProps) {
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const scoreColor = report.score.numericScore >= 70 ? "#00ff88"
    : report.score.numericScore >= 50 ? "#ffb400"
    : report.score.numericScore >= 30 ? "#ff6b35" : "#ff2b4e";

  const handleGenerate = () => {
    setGenerating(true);
    onGenerateReport();
    setTimeout(() => { setGenerating(false); setGenerated(true); }, 2000);
  };

  const owaspGroups = report.findings.reduce((acc, f) => {
    const key = f.owaspCategory || "OTHER";
    acc[key] = (acc[key] || []);
    acc[key].push(f);
    return acc;
  }, {} as Record<string, typeof report.findings>);

  return (
    <div className="h-full p-5 flex flex-col gap-4 overflow-y-auto">
      {/* Report controls */}
      <motion.div className="cyber-card p-4 flex items-center justify-between flex-shrink-0"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#c8d8e8" }}>
              SECURITY REPORT
            </div>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              Generated: {format(new Date(report.timestamp), "yyyy-MM-dd HH:mm:ss")} · {report.targetPath}
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded ml-4"
            style={{ background: `${scoreColor}10`, border: `1px solid ${scoreColor}30` }}>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 700, color: scoreColor }}>{report.score.numericScore}</span>
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, color: scoreColor }}>{report.score.grade}</div>
              <div style={{ fontSize: 8, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>GRADE</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            className="cyber-btn flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const el = document.getElementById("report-content");
              if (el) window.print();
            }}
          >
            🖨 PRINT
          </motion.button>
          <motion.button
            className="cyber-btn flex items-center gap-2"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              const data = JSON.stringify(report, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "agentshield-report.json";
              a.click();
            }}
          >
            ↓ JSON
          </motion.button>
          <motion.button
            className={`cyber-btn-primary flex items-center gap-2 ${generating ? "opacity-70" : ""}`}
            whileTap={{ scale: 0.95 }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <>
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: "transparent", borderTopColor: "#00d4ff", animation: "spin 0.8s linear infinite" }} />
                GENERATING...
              </>
            ) : generated ? "✓ REPORT READY" : "⬡ GENERATE HTML"}
          </motion.button>
        </div>
      </motion.div>

      {/* Report content */}
      <motion.div id="report-content" className="cyber-card flex-1 overflow-y-auto p-6"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>

        {/* Report header */}
        <div className="flex items-start justify-between mb-8 pb-6"
          style={{ borderBottom: "1px solid #1a2d4a" }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 700, color: "#00d4ff", letterSpacing: "0.05em", marginBottom: 6 }}>
              AGENTSHIELD SECURITY REPORT
            </div>
            <div style={{ fontSize: 12, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace" }}>
              Target: <span style={{ color: "#c8d8e8" }}>{report.targetPath}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              Scanned: <span style={{ color: "#c8d8e8" }}>{format(new Date(report.timestamp), "MMMM d, yyyy 'at' HH:mm:ss")}</span>
            </div>
            <div style={{ fontSize: 12, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              Files: <span style={{ color: "#c8d8e8" }}>{report.summary.filesScanned} files scanned</span>
            </div>
          </div>
          <div className="text-right">
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 48, fontWeight: 900, color: scoreColor, textShadow: `0 0 30px ${scoreColor}60`, lineHeight: 1 }}>
              {report.score.numericScore}
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: scoreColor, opacity: 0.8 }}>
              GRADE {report.score.grade}
            </div>
            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
              SECURITY SCORE / 100
            </div>
          </div>
        </div>

        {/* Summary boxes */}
        <div className="grid gap-3 mb-8" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
          {[
            { label: "Total", value: report.summary.totalFindings, color: "#c8d8e8" },
            { label: "Critical", value: report.summary.critical, color: "#ff2b4e" },
            { label: "High", value: report.summary.high, color: "#ff6b35" },
            { label: "Medium", value: report.summary.medium, color: "#ffb400" },
            { label: "Low", value: report.summary.low, color: "#4a90d9" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-lg text-center"
              style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Score breakdown */}
        <div className="mb-8">
          <div style={{ fontSize: 11, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 12 }}>
            SCORE BREAKDOWN
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {Object.entries(report.score.breakdown).map(([key, val]) => (
              <div key={key} className="flex items-center gap-3 p-3 rounded"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #1a2d4a" }}>
                <div style={{ width: 80, fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", textTransform: "capitalize" }}>{key}</div>
                <div className="flex-1 rounded-full overflow-hidden" style={{ height: 6, background: "#1a2d4a" }}>
                  <div style={{
                    width: `${val}%`, height: "100%", borderRadius: 9999,
                    background: val >= 70 ? "#00ff88" : val >= 50 ? "#ffb400" : "#ff6b35",
                  }} />
                </div>
                <div style={{ width: 32, fontSize: 11, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", textAlign: "right" }}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Findings grouped by OWASP */}
        <div>
          <div style={{ fontSize: 11, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginBottom: 16 }}>
            FINDINGS BY OWASP CATEGORY
          </div>
          {Object.entries(owaspGroups).map(([cat, findings]) => (
            <div key={cat} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" }}>{cat}</span>
                <span style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace" }}>
                  {OWASP_LABELS[cat] || cat}
                </span>
                <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                  ({findings.length} finding{findings.length > 1 ? "s" : ""})
                </span>
              </div>
              <div className="space-y-2 ml-4">
                {findings.map(f => (
                  <div key={f.id} className="p-3 rounded-lg flex items-start gap-3"
                    style={{ background: "rgba(0,0,0,0.3)", border: "1px solid #1a2d4a" }}>
                    <span className={`badge severity-${f.severity}`}>{f.severity.toUpperCase()}</span>
                    <div className="flex-1">
                      <div style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>{f.title}</div>
                      <div style={{ fontSize: 11, color: "#6b8299" }}>{f.description}</div>
                      <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                        {f.file}{f.line ? `:${f.line}` : ""}
                        {f.fix && <span style={{ color: "#00ff88", marginLeft: 8 }}>✓ Auto-fixable</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 flex items-center justify-between"
          style={{ borderTop: "1px solid #1a2d4a" }}>
          <div style={{ fontSize: 10, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace" }}>
            AgentShield v2.4.1 · OWASP LLM Top 10 Compliant · {format(new Date(), "yyyy")}
          </div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 11, color: "#2a4060" }}>
            AGENT<span style={{ color: "#4a3060" }}>SHIELD</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
