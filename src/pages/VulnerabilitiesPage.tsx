import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Finding, Severity } from "../types";

interface VulnPageProps {
  findings: Finding[];
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export default function VulnerabilitiesPage({ findings }: VulnPageProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"severity" | "category" | "file">("severity");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = Array.from(new Set(findings.map(f => f.category)));

  const filtered = findings
    .filter(f => {
      if (severityFilter !== "all" && f.severity !== severityFilter) return false;
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
      if (search && !f.title.toLowerCase().includes(search.toLowerCase()) && !f.file.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortKey === "severity") return SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (sortKey === "category") return a.category.localeCompare(b.category);
      return a.file.localeCompare(b.file);
    });

  const SevBadge = ({ sev }: { sev: Severity }) => (
    <span className={`badge severity-${sev}`}>{sev.toUpperCase()}</span>
  );

  return (
    <div className="h-full flex flex-col p-5 gap-4">
      {/* Controls */}
      <motion.div className="cyber-card p-4 flex items-center gap-4 flex-shrink-0"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex-1">
          <input
            className="cyber-input w-full"
            placeholder="🔍 Search findings by title or file..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Severity filter */}
        <div className="flex items-center gap-1.5">
          {(["all", "critical", "high", "medium", "low"] as const).map(sev => (
            <button key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`badge ${sev !== "all" ? `severity-${sev}` : ""} cursor-pointer transition-all`}
              style={severityFilter === sev ? { opacity: 1 } : { opacity: 0.4 }}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
        {/* Category filter */}
        <select
          className="cyber-input"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          style={{ minWidth: 120 }}
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {/* Sort */}
        <select className="cyber-input" value={sortKey} onChange={e => setSortKey(e.target.value as any)}>
          <option value="severity">Sort: Severity</option>
          <option value="category">Sort: Category</option>
          <option value="file">Sort: File</option>
        </select>
        <div style={{ fontSize: 11, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {filtered.length}/{findings.length}
        </div>
      </motion.div>

      {/* Table */}
      <motion.div className="cyber-card flex-1 overflow-hidden flex flex-col"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        {/* Header */}
        <div className="px-4 py-3 grid gap-4 flex-shrink-0"
          style={{
            gridTemplateColumns: "90px 1fr 120px 100px 60px",
            borderBottom: "1px solid #1a2d4a",
            background: "rgba(0,0,0,0.3)",
          }}>
          {["SEVERITY", "FINDING", "FILE", "OWASP", "FIX"].map(h => (
            <div key={h} style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence>
            {filtered.map((finding, i) => (
              <motion.div
                key={finding.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                {/* Main row */}
                <div
                  className="px-4 py-3 grid gap-4 cursor-pointer transition-colors hover:bg-white/5"
                  style={{
                    gridTemplateColumns: "90px 1fr 120px 100px 60px",
                    borderBottom: "1px solid #0d1a2e",
                    background: expandedId === finding.id ? "rgba(0,212,255,0.04)" : undefined,
                  }}
                  onClick={() => setExpandedId(expandedId === finding.id ? null : finding.id)}
                >
                  <div>
                    <span className={`badge severity-${finding.severity}`}>{finding.severity.toUpperCase()}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
                      {finding.title}
                    </div>
                    <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                      [{finding.category}] {finding.description.slice(0, 80)}...
                    </div>
                  </div>
                  <div style={{ fontSize: 10, color: "#6b8299", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {finding.file}
                    {finding.line && <span style={{ color: "#4a6080" }}>:{finding.line}</span>}
                  </div>
                  <div>
                    {finding.owaspCategory ? (
                      <span className="badge" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" }}>
                        {finding.owaspCategory}
                      </span>
                    ) : <span style={{ color: "#2a4060", fontSize: 11 }}>—</span>}
                  </div>
                  <div>
                    {finding.fix?.auto ? (
                      <span className="badge" style={{ color: "#00ff88", background: "rgba(0,255,136,0.1)", borderColor: "rgba(0,255,136,0.3)" }}>AUTO</span>
                    ) : finding.fix ? (
                      <span className="badge" style={{ color: "#ffb400", background: "rgba(255,180,0,0.1)", borderColor: "rgba(255,180,0,0.3)" }}>MANUAL</span>
                    ) : <span style={{ color: "#2a4060", fontSize: 11 }}>—</span>}
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence>
                  {expandedId === finding.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mx-4 mb-3 p-4 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid #1a2d4a" }}>
                        <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
                          <div>
                            <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, letterSpacing: "0.08em" }}>DESCRIPTION</div>
                            <div style={{ fontSize: 12, color: "#c8d8e8", lineHeight: 1.6 }}>{finding.description}</div>
                            {finding.evidence && (
                              <div className="mt-3">
                                <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6, letterSpacing: "0.08em" }}>EVIDENCE</div>
                                <div className="px-3 py-2 rounded" style={{ background: "rgba(255,43,78,0.06)", border: "1px solid rgba(255,43,78,0.2)", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#ff8899" }}>
                                  {finding.evidence}
                                </div>
                              </div>
                            )}
                          </div>
                          {finding.fix && (
                            <div>
                              <div style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace", marginBottom: 8, letterSpacing: "0.08em" }}>REMEDIATION</div>
                              <div style={{ fontSize: 12, color: "#c8d8e8", marginBottom: 8 }}>{finding.fix.description}</div>
                              <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
                                <div>
                                  <div style={{ fontSize: 9, color: "#ff2b4e", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>BEFORE</div>
                                  <div className="px-2 py-1.5 rounded text-xs" style={{ background: "rgba(255,43,78,0.06)", border: "1px solid rgba(255,43,78,0.2)", fontFamily: "'JetBrains Mono', monospace", color: "#ff8899", wordBreak: "break-all" }}>
                                    {finding.fix.before}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>AFTER</div>
                                  <div className="px-2 py-1.5 rounded text-xs" style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", fontFamily: "'JetBrains Mono', monospace", color: "#66ffaa", wordBreak: "break-all" }}>
                                    {finding.fix.after}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <span style={{ fontSize: 9, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                            ID: {finding.id} · Detected: {new Date(finding.detectedAt).toLocaleString()}
                          </span>
                          {finding.runtimeConfidence && (
                            <span className="badge" style={{ color: "#8b5cf6", background: "rgba(139,92,246,0.1)", borderColor: "rgba(139,92,246,0.3)" }}>
                              {finding.runtimeConfidence}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <span style={{ fontSize: 13, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
                No findings match the current filters
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
