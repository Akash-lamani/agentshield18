import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { getOWASPMappings } from "./owasp.js";

/**
 * STEP 2B — Write scan-results.json alongside the HTML report.
 * The dashboard/index.html reads this file every 30s to auto-refresh.
 */
export function writeScanResultsJson(
  report: SecurityReport,
  htmlPath: string
): void {
  const outPath = join(dirname(htmlPath), "scan-results.json");
  const payload = {
    timestamp: report.timestamp,
    targetPath: report.targetPath,
    framework: report.target?.framework ?? "unknown",
    score: {
      grade: report.score.grade,
      numericScore: report.score.numericScore,
    },
    summary: report.summary,
    findings: report.findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      category: f.category,
      title: f.title,
      description: f.description,
      file: f.file,
      line: f.line ?? null,
      evidence: f.evidence ?? null,
      fix: f.fix
        ? {
            description: f.fix.description,
            auto: f.fix.auto,
            before: f.fix.before ?? null,
            after: f.fix.after ?? null,
          }
        : null,
    })),
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
}

import type {
  Finding,
  SecurityReport,
  Severity,
  Grade,
  RuntimeConfidence,
  SkillHealth,
} from "../types.js";

/**
 * Render a security report as a self-contained HTML file.
 * All CSS is inline in a <style> tag — no external dependencies.
 * Dark theme inspired by GitHub dark mode.
 */
export function renderHtmlReport(report: SecurityReport): string {
  const gradeMeta = gradeMetadata(report.score.grade);
  const findings = [...report.findings];
  const s = report.summary;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AgentShield Security Report — Grade ${report.score.grade}</title>
  <style>${inlineStyles()}</style>
</head>
<body>
  <div class="container">

    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <div class="grade-badge" style="background-color: ${gradeMeta.color};">
          <span class="grade-letter">${report.score.grade}</span>
        </div>
        <div class="header-info">
          <h1 class="title">AgentShield Security Report</h1>
          <p class="subtitle">Score: <strong>${report.score.numericScore}</strong>/100</p>
          <p class="meta">Target: ${escapeHtml(report.targetPath)}</p>
          <p class="meta">Scanned: ${formatTimestamp(report.timestamp)}</p>
        </div>
      </div>
    </header>

    <!-- Summary Stats -->
    <section class="section">
      <h2 class="section-title">Summary</h2>
      <div class="stats-grid">
        ${renderStatCard("Files Scanned", String(s.filesScanned), "files")}
        ${renderStatCard("Total Findings", String(s.totalFindings), "findings")}
        ${renderStatCard("Auto-Fixable", String(s.autoFixable), "fixable")}
        ${renderStatCard("Critical", String(s.critical), "critical")}
        ${renderStatCard("High", String(s.high), "high")}
        ${renderStatCard("Medium", String(s.medium), "medium")}
        ${renderStatCard("Low", String(s.low), "low")}
        ${renderStatCard("Info", String(s.info), "info")}
      </div>
    </section>

    <!-- Score Breakdown -->
    <section class="section">
      <h2 class="section-title">Score Breakdown</h2>
      <div class="breakdown">
        ${renderScoreBar("Secrets", report.score.breakdown.secrets)}
        ${renderScoreBar("Permissions", report.score.breakdown.permissions)}
        ${renderScoreBar("Hooks", report.score.breakdown.hooks)}
        ${renderScoreBar("MCP Servers", report.score.breakdown.mcp)}
        ${renderScoreBar("Agents", report.score.breakdown.agents)}
      </div>
    </section>

    ${report.skillHealth && report.skillHealth.totalSkills > 0
      ? `<section class="section">
      <h2 class="section-title">Skill Health</h2>
      <div class="stats-grid">
        ${renderStatCard("Skills", String(report.skillHealth.totalSkills), "files")}
        ${renderStatCard("Instrumented", String(report.skillHealth.instrumentedSkills), "fixable")}
        ${renderStatCard("Versioned", String(report.skillHealth.versionedSkills), "medium")}
        ${renderStatCard("Rollback-ready", String(report.skillHealth.rollbackReadySkills), "high")}
        ${renderStatCard("With history", String(report.skillHealth.observedSkills), "info")}
        ${typeof report.skillHealth.averageScore === "number"
          ? renderStatCard("Avg health", `${report.skillHealth.averageScore}/100`, "findings")
          : ""}
      </div>
      <div>
        ${report.skillHealth.skills.map((skill) => renderSkillHealthCard(skill)).join("")}
      </div>
    </section>`
      : ""}

    <!-- Severity Distribution -->
    <section class="section">
      <h2 class="section-title">Severity Distribution</h2>
      <div class="distribution">
        ${renderDistributionChart(s)}
      </div>
    </section>

    <!-- Affected Files -->
    <section class="section">
      <h2 class="section-title">Affected Files</h2>
      ${renderAffectedFiles(findings)}
    </section>

    <!-- OWASP Mapping -->
    <section class="section">
      <h2 class="section-title">OWASP LLM Top 10 Mapping</h2>
      ${renderOWASPSection(findings)}
    </section>

    <!-- Findings -->
    <section class="section">
      <h2 class="section-title">Findings</h2>
      ${findings.length === 0
        ? '<div class="no-findings"><p>No security issues found. Your configuration looks good!</p></div>'
        : renderFindingsGrouped(findings)}
    </section>

    <!-- Remediation Steps -->
    <section class="section">
      <h2 class="section-title">Remediation Roadmap</h2>
      ${renderRemediationRoadmap(findings)}
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>Generated by <strong>AgentShield</strong> &mdash; Security auditor for AI agent configurations</p>
      <p class="footer-timestamp">${formatTimestamp(report.timestamp)}</p>
    </footer>

  </div>
</body>
</html>`;
}

// ─── Grade Metadata ──────────────────────────────────────────

interface GradeMeta {
  readonly color: string;
  readonly label: string;
}

function gradeMetadata(grade: Grade): GradeMeta {
  const map: Record<Grade, GradeMeta> = {
    A: { color: "#2ea043", label: "Excellent" },
    B: { color: "#388bfd", label: "Good" },
    C: { color: "#d29922", label: "Fair" },
    D: { color: "#db6d28", label: "Poor" },
    F: { color: "#f85149", label: "Critical" },
  };
  return map[grade];
}

// ─── Severity Colors ─────────────────────────────────────────

function severityColor(severity: Severity): string {
  const colors: Record<Severity, string> = {
    critical: "#f85149",
    high: "#d29922",
    medium: "#388bfd",
    low: "#8b949e",
    info: "#6e7681",
  };
  return colors[severity];
}

// ─── Score Bar ───────────────────────────────────────────────

function scoreBarColor(score: number): string {
  if (score >= 80) return "#2ea043";
  if (score >= 60) return "#d29922";
  return "#f85149";
}

function renderScoreBar(label: string, score: number): string {
  const color = scoreBarColor(score);
  const pct = Math.max(0, Math.min(100, score));

  return `
    <div class="bar-row">
      <span class="bar-label">${escapeHtml(label)}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${pct}%; background-color: ${color};"></div>
      </div>
      <span class="bar-value" style="color: ${color};">${score}/100</span>
    </div>`;
}

// ─── Stat Card ───────────────────────────────────────────────

function renderStatCard(label: string, value: string, kind: string): string {
  const kindColorMap: Record<string, string> = {
    files: "#8b949e",
    findings: "#e6edf3",
    fixable: "#2ea043",
    critical: "#f85149",
    high: "#d29922",
    medium: "#388bfd",
    low: "#8b949e",
    info: "#6e7681",
  };
  const color = kindColorMap[kind] ?? "#e6edf3";

  return `
    <div class="stat-card">
      <div class="stat-value" style="color: ${color};">${escapeHtml(value)}</div>
      <div class="stat-label">${escapeHtml(label)}</div>
    </div>`;
}

// ─── Distribution Chart (SVG) ────────────────────────────────

function renderDistributionChart(summary: {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
  readonly info: number;
}): string {
  const segments: ReadonlyArray<{
    readonly label: string;
    readonly count: number;
    readonly color: string;
  }> = [
    { label: "Critical", count: summary.critical, color: "#f85149" },
    { label: "High", count: summary.high, color: "#d29922" },
    { label: "Medium", count: summary.medium, color: "#388bfd" },
    { label: "Low", count: summary.low, color: "#8b949e" },
    { label: "Info", count: summary.info, color: "#6e7681" },
  ];

  const total = segments.reduce((acc, seg) => acc + seg.count, 0);

  if (total === 0) {
    return '<p class="no-findings-text">No findings to display.</p>';
  }

  const barWidth = 600;
  const barHeight = 32;
  let xOffset = 0;

  const rects = segments.map((seg) => {
    const width = total > 0 ? (seg.count / total) * barWidth : 0;
    const rect =
      width > 0
        ? `<rect x="${xOffset}" y="0" width="${width}" height="${barHeight}" fill="${seg.color}" rx="0" />`
        : "";
    xOffset += width;
    return rect;
  });

  const legend = segments
    .filter((seg) => seg.count > 0)
    .map(
      (seg) =>
        `<span class="legend-item"><span class="legend-dot" style="background-color: ${seg.color};"></span>${escapeHtml(seg.label)}: ${seg.count}</span>`
    )
    .join("");

  return `
    <svg class="dist-bar" viewBox="0 0 ${barWidth} ${barHeight}" preserveAspectRatio="none">
      <rect x="0" y="0" width="${barWidth}" height="${barHeight}" fill="#21262d" rx="6" />
      <clipPath id="bar-clip"><rect x="0" y="0" width="${barWidth}" height="${barHeight}" rx="6" /></clipPath>
      <g clip-path="url(#bar-clip)">${rects.join("")}</g>
    </svg>
    <div class="legend">${legend}</div>`;
}

// ─── Findings (grouped by severity) ─────────────────────────

function renderFindingsGrouped(findings: ReadonlyArray<Finding>): string {
  const severities: ReadonlyArray<Severity> = ["critical", "high", "medium", "low", "info"];
  const grouped = severities.map(
    (sev) =>
      [sev, findings.filter((f) => f.severity === sev)] as const
  );

  return grouped
    .filter(([, items]) => items.length > 0)
    .map(([sev, items]) => {
      const color = severityColor(sev);
      const cards = items.map((f) => renderFindingCard(f)).join("");

      return `
        <div class="findings-group">
          <h3 class="group-header" style="color: ${color};">
            <span class="severity-dot" style="background-color: ${color};"></span>
            ${sev.toUpperCase()} (${items.length})
          </h3>
          ${cards}
        </div>`;
    })
    .join("");
}

function renderFindingCard(finding: Finding): string {
  const color = severityColor(finding.severity);
  const location = finding.line
    ? `${escapeHtml(finding.file)}:${finding.line}`
    : escapeHtml(finding.file);
  const runtimeConfidenceBadge = finding.runtimeConfidence
    ? `<span class="runtime-confidence-badge">${escapeHtml(formatRuntimeConfidence(finding.runtimeConfidence))}</span>`
    : "";

  const evidenceBlock = finding.evidence
    ? `<div class="finding-evidence"><strong>Evidence:</strong><pre><code>${escapeHtml(finding.evidence)}</code></pre></div>`
    : "";

  const fixBlock = finding.fix
    ? `<div class="finding-fix">
        <strong>Fix:</strong> ${escapeHtml(finding.fix.description)}
        ${finding.fix.auto ? '<span class="auto-fix-badge">auto-fixable</span>' : ""}
        ${finding.fix.before ? `<div class="fix-diff"><div class="diff-before"><strong>Before:</strong><pre><code>${escapeHtml(finding.fix.before)}</code></pre></div><div class="diff-after"><strong>After:</strong><pre><code>${escapeHtml(finding.fix.after)}</code></pre></div></div>` : ""}
      </div>`
    : "";

  return `
    <div class="finding-card">
      <div class="finding-header">
        <span class="severity-badge" style="background-color: ${color};">${finding.severity.toUpperCase()}</span>
        ${runtimeConfidenceBadge}
        <span class="finding-title">${escapeHtml(finding.title)}</span>
      </div>
      <div class="finding-meta">
        <span class="finding-category">${escapeHtml(finding.category)}</span>
        <span class="finding-location">${location}</span>
      </div>
      <p class="finding-description">${escapeHtml(finding.description)}</p>
      ${evidenceBlock}
      ${fixBlock}
    </div>`;
}

function renderSkillHealthCard(skill: SkillHealth): string {
  const score = typeof skill.score === "number" ? `${skill.score}/100` : "unobserved";
  const detail = typeof skill.successRate === "number"
    ? `Runs ${skill.observedRuns} • Success ${Math.round(skill.successRate * 100)}%${
        typeof skill.averageFeedback === "number"
          ? ` • Feedback ${skill.averageFeedback.toFixed(1)}/5`
          : ""
      }`
    : "No execution history found";

  return `
    <div class="finding-card">
      <div class="finding-header">
        <span class="runtime-confidence-badge">${escapeHtml(skill.status)}</span>
        <span class="finding-title">${escapeHtml(skill.skillName)}</span>
      </div>
      <div class="finding-meta">
        <span class="finding-category">skill health</span>
        <span class="finding-location">${escapeHtml(skill.file)}</span>
      </div>
      <p class="finding-description">${escapeHtml(`${score} — ${detail}`)}</p>
    </div>`;
}

// ─── Affected Files ───────────────────────────────────────────

function renderAffectedFiles(findings: ReadonlyArray<Finding>): string {
  const fileMap = new Map<string, { critical: number; high: number; medium: number; low: number; info: number; total: number }>();
  for (const f of findings) {
    const key = f.file;
    if (!fileMap.has(key)) {
      fileMap.set(key, { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 });
    }
    const entry = fileMap.get(key)!;
    entry[f.severity]++;
    entry.total++;
  }

  if (fileMap.size === 0) {
    return '<p class="no-findings-text">No affected files.</p>';
  }

  const rows = [...fileMap.entries()]
    .sort((a, b) => {
      // Sort by severity: critical first, then high, then total
      const aScore = a[1].critical * 1000 + a[1].high * 100 + a[1].medium * 10 + a[1].low;
      const bScore = b[1].critical * 1000 + b[1].high * 100 + b[1].medium * 10 + b[1].low;
      return bScore - aScore;
    })
    .map(([file, counts]) => {
      const badges = (["critical", "high", "medium", "low", "info"] as const)
        .filter((sev) => counts[sev] > 0)
        .map((sev) => `<span class="severity-badge" style="background-color:${severityColor(sev)};font-size:11px;">${counts[sev]} ${sev}</span>`)
        .join(" ");
      return `<tr>
        <td style="font-family:monospace;color:#79c0ff;">${escapeHtml(file)}</td>
        <td>${badges}</td>
        <td style="text-align:right;color:#8b949e;">${counts.total}</td>
      </tr>`;
    })
    .join("");

  return `<table class="findings-table">
    <thead>
      <tr><th>File</th><th>Severities</th><th style="text-align:right;">Findings</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ─── OWASP Section ────────────────────────────────────────────

function renderOWASPSection(findings: ReadonlyArray<Finding>): string {
  const owaspCounts = new Map<string, { mapping: import("./owasp.js").OWASPMapping; count: number; severities: Set<string> }>();

  for (const f of findings) {
    const mappings = getOWASPMappings(f.category, f.title);
    for (const m of mappings) {
      if (!owaspCounts.has(m.id)) {
        owaspCounts.set(m.id, { mapping: m, count: 0, severities: new Set() });
      }
      const entry = owaspCounts.get(m.id)!;
      entry.count++;
      entry.severities.add(f.severity);
    }
  }

  if (owaspCounts.size === 0) {
    return '<p class="no-findings-text">No OWASP mappings found.</p>';
  }

  const hasCriticalOrHigh = (severities: Set<string>) =>
    severities.has("critical") || severities.has("high");

  const cards = [...owaspCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([, { mapping, count, severities }]) => {
      const riskColor = hasCriticalOrHigh(severities) ? "#f85149" : severities.has("medium") ? "#d29922" : "#388bfd";
      return `<div class="owasp-card">
        <div class="owasp-id" style="color:${riskColor};">${escapeHtml(mapping.id)}</div>
        <div class="owasp-name">${escapeHtml(mapping.name)}</div>
        <div class="owasp-count">${count} finding${count !== 1 ? "s" : ""}</div>
        <a href="${escapeHtml(mapping.url)}" target="_blank" rel="noopener" class="owasp-link">Learn more →</a>
      </div>`;
    })
    .join("");

  return `<div class="owasp-grid">${cards}</div>`;
}

// ─── Remediation Roadmap ─────────────────────────────────────

function renderRemediationRoadmap(findings: ReadonlyArray<Finding>): string {
  const criticalAndHigh = findings.filter((f) => f.severity === "critical" || f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  const low = findings.filter((f) => f.severity === "low" || f.severity === "info");
  const autoFixable = findings.filter((f) => f.fix?.auto);

  const steps: Array<{ phase: string; color: string; items: string[] }> = [];

  if (criticalAndHigh.length > 0) {
    steps.push({
      phase: "Phase 1 — Immediate (Critical & High)",
      color: "#f85149",
      items: [
        ...criticalAndHigh.slice(0, 8).map((f) =>
          `<strong>${escapeHtml(f.title)}</strong> in <code>${escapeHtml(f.file)}</code>${f.fix ? `: ${escapeHtml(f.fix.description)}` : ""}`
        ),
        ...(criticalAndHigh.length > 8
          ? [`<em>…and ${criticalAndHigh.length - 8} more critical/high findings</em>`]
          : []),
      ],
    });
  }

  if (autoFixable.length > 0) {
    steps.push({
      phase: "Phase 2 — Auto-Fix Available",
      color: "#2ea043",
      items: [
        `Run <code>agentshield scan --fix --path &lt;your-path&gt;</code> to automatically fix ${autoFixable.length} issue${autoFixable.length !== 1 ? "s" : ""}`,
        ...autoFixable.slice(0, 5).map((f) => `<strong>${escapeHtml(f.title)}</strong>: ${escapeHtml(f.fix!.description)}`),
      ],
    });
  }

  if (medium.length > 0) {
    steps.push({
      phase: "Phase 3 — Short-term (Medium)",
      color: "#388bfd",
      items: medium.slice(0, 6).map((f) =>
        `<strong>${escapeHtml(f.title)}</strong> in <code>${escapeHtml(f.file)}</code>`
      ),
    });
  }

  if (low.length > 0) {
    steps.push({
      phase: "Phase 4 — Long-term (Low & Info)",
      color: "#8b949e",
      items: [
        `Review ${low.length} low/info finding${low.length !== 1 ? "s" : ""} for security hardening opportunities`,
        "Consider running <code>agentshield watch</code> for continuous monitoring",
        "Set up a policy file with <code>agentshield policy init</code>",
      ],
    });
  }

  if (steps.length === 0) {
    return '<div class="no-findings"><p>No remediation steps needed — configuration is clean!</p></div>';
  }

  return steps.map(({ phase, color, items }) => `
    <div class="remediation-step">
      <h3 class="remediation-phase" style="color:${color};">${escapeHtml(phase)}</h3>
      <ul class="remediation-list">
        ${items.map((item) => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `).join("");
}

function formatRuntimeConfidence(value: RuntimeConfidence): string {
  switch (value) {
    case "active-runtime":
      return "active runtime";
    case "project-local-optional":
      return "project-local optional";
    case "template-example":
      return "template/example";
    case "docs-example":
      return "docs/example";
    case "plugin-manifest":
      return "plugin manifest";
    case "hook-code":
      return "hook-code implementation";
  }
}

// ─── Timestamp Formatting ────────────────────────────────────

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    return date.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

// ─── Escape HTML ─────────────────────────────────────────────

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Inline Styles ───────────────────────────────────────────

function inlineStyles(): string {
  return `
    /* Reset & Base */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      background-color: #0d1117;
      color: #e6edf3;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    /* Header */
    .header {
      background: linear-gradient(135deg, #161b22 0%, #0d1117 100%);
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .grade-badge {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 0 40px rgba(0, 0, 0, 0.4);
    }

    .grade-letter {
      font-size: 64px;
      font-weight: 800;
      color: #ffffff;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .header-info {
      flex: 1;
      min-width: 200px;
    }

    .title {
      font-size: 28px;
      font-weight: 700;
      color: #e6edf3;
      margin-bottom: 4px;
    }

    .subtitle {
      font-size: 20px;
      color: #8b949e;
      margin-bottom: 8px;
    }

    .subtitle strong {
      color: #e6edf3;
      font-size: 24px;
    }

    .meta {
      font-size: 14px;
      color: #6e7681;
      margin-bottom: 2px;
    }

    /* Section */
    .section {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #e6edf3;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #21262d;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
    }

    .stat-card {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 4px;
    }

    /* Score Breakdown Bars */
    .breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-label {
      width: 120px;
      font-size: 14px;
      color: #8b949e;
      text-align: right;
      flex-shrink: 0;
    }

    .bar-track {
      flex: 1;
      height: 20px;
      background: #21262d;
      border-radius: 10px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 10px;
      transition: width 0.3s ease;
    }

    .bar-value {
      width: 70px;
      font-size: 14px;
      font-weight: 600;
      text-align: right;
      flex-shrink: 0;
    }

    /* Distribution */
    .distribution {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .dist-bar {
      width: 100%;
      height: 32px;
      border-radius: 6px;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #8b949e;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .no-findings-text {
      color: #8b949e;
      font-style: italic;
    }

    /* Findings */
    .findings-group {
      margin-bottom: 20px;
    }

    .group-header {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .severity-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    .finding-card {
      background: #0d1117;
      border: 1px solid #21262d;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }

    .finding-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .severity-badge {
      font-size: 11px;
      font-weight: 700;
      color: #ffffff;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }

    .runtime-confidence-badge {
      font-size: 11px;
      font-weight: 600;
      color: #c9d1d9;
      background: #161b22;
      border: 1px solid #30363d;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      flex-shrink: 0;
    }

    .finding-title {
      font-size: 16px;
      font-weight: 600;
      color: #e6edf3;
    }

    .finding-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 8px;
      flex-wrap: wrap;
    }

    .finding-category {
      font-size: 12px;
      color: #8b949e;
      background: #21262d;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .finding-location {
      font-size: 12px;
      color: #6e7681;
      font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    }

    .finding-description {
      font-size: 14px;
      color: #8b949e;
      margin-bottom: 8px;
    }

    .finding-evidence {
      margin-top: 8px;
    }

    .finding-evidence strong,
    .finding-fix strong {
      font-size: 12px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .finding-evidence pre,
    .fix-diff pre {
      background: #161b22;
      border: 1px solid #21262d;
      border-radius: 6px;
      padding: 12px;
      margin-top: 4px;
      overflow-x: auto;
    }

    .finding-evidence code,
    .fix-diff code {
      font-family: 'SF Mono', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 13px;
      color: #e6edf3;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .finding-fix {
      margin-top: 12px;
      font-size: 14px;
      color: #8b949e;
    }

    .auto-fix-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 600;
      color: #2ea043;
      background: rgba(46, 160, 67, 0.15);
      border: 1px solid rgba(46, 160, 67, 0.4);
      padding: 1px 6px;
      border-radius: 4px;
      margin-left: 8px;
    }

    .fix-diff {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-top: 8px;
    }

    .diff-before strong {
      color: #f85149;
    }

    .diff-after strong {
      color: #2ea043;
    }

    .no-findings {
      background: rgba(46, 160, 67, 0.1);
      border: 1px solid rgba(46, 160, 67, 0.3);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      color: #2ea043;
      font-size: 16px;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px;
      color: #6e7681;
      font-size: 13px;
      border-top: 1px solid #21262d;
      margin-top: 12px;
    }

    .footer strong {
      color: #8b949e;
    }

    .footer-timestamp {
      margin-top: 4px;
      font-size: 12px;
    }

    /* Affected Files Table */
    .findings-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .findings-table th {
      text-align: left;
      padding: 10px 12px;
      color: #8b949e;
      font-weight: 600;
      border-bottom: 1px solid #30363d;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .findings-table td {
      padding: 10px 12px;
      border-bottom: 1px solid #21262d;
      vertical-align: middle;
    }

    .findings-table tr:last-child td {
      border-bottom: none;
    }

    .findings-table tr:hover td {
      background: #1c2128;
    }

    /* OWASP Grid */
    .owasp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .owasp-card {
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .owasp-id {
      font-size: 13px;
      font-weight: 700;
      font-family: monospace;
    }

    .owasp-name {
      font-size: 14px;
      font-weight: 600;
      color: #e6edf3;
    }

    .owasp-count {
      font-size: 12px;
      color: #8b949e;
    }

    .owasp-link {
      font-size: 12px;
      color: #388bfd;
      text-decoration: none;
      margin-top: 4px;
    }

    .owasp-link:hover {
      text-decoration: underline;
    }

    /* Remediation */
    .remediation-step {
      margin-bottom: 24px;
    }

    .remediation-step:last-child {
      margin-bottom: 0;
    }

    .remediation-phase {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .remediation-list {
      list-style: none;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .remediation-list li {
      padding: 10px 16px;
      background: #0d1117;
      border: 1px solid #30363d;
      border-radius: 6px;
      font-size: 14px;
      line-height: 1.5;
    }

    .remediation-list li code {
      background: #21262d;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #79c0ff;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .header-content {
        flex-direction: column;
        text-align: center;
      }

      .bar-label {
        width: 80px;
        font-size: 12px;
      }

      .bar-value {
        width: 60px;
        font-size: 12px;
      }

      .fix-diff {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .owasp-grid {
        grid-template-columns: 1fr 1fr;
      }
    }
  `;
}
