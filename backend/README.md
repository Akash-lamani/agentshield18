# 🛡️ AgentShield

**Security auditor for AI agent configurations.** Scans Claude Code setups for vulnerabilities, misconfigurations, prompt injection risks, secret leakage, and dangerous hook patterns — with professional HTML, JSON, and terminal reports.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js ≥18](https://img.shields.io/badge/Node.js-%E2%89%A518-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org)

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [CLI Reference](#cli-reference)
- [Report Formats](#report-formats)
- [Demo Guide](#demo-guide)
- [Policy Engine](#policy-engine)
- [Watch Mode](#watch-mode)
- [Runtime Monitoring](#runtime-monitoring)
- [MiniClaw Sandbox](#miniclaw-sandbox)
- [Troubleshooting](#troubleshooting)
- [Architecture](#architecture)

---

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Static Scan** | Rule-based analysis of `CLAUDE.md`, `settings.json`, `mcp.json`, agent configs |
| 📊 **Reports** | Terminal (colored tables), HTML (OWASP-mapped, professional CSS), JSON (machine-readable) |
| 👁️ **Watch Mode** | Live file-system monitoring with debounced rescanning and drift detection |
| 📋 **Policy Engine** | Organization-wide enforcement — `init`, `list`, `validate`, `apply` |
| 🔐 **Runtime Monitor** | `PreToolUse` hook enforcement — blocks dangerous commands in real time |
| 🏖️ **MiniClaw Sandbox** | Isolated agent runtime with allowlisted commands and restricted FS |
| 🧬 **Supply Chain** | MCP package verification against known-bad list and typosquatting |
| 🩺 **Corpus Validation** | Built-in attack corpus to verify detection coverage |
| 🤖 **Deep Analysis** | Optional Opus/GSK multi-agent AI analysis (`--opus`, `--gsk`) |
| 🔧 **Auto-Fix** | Automatically apply safe remediations (`--fix`) |
| 📏 **Baseline** | Diff scans against saved baselines; gate CI pipelines (`--gate`) |

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/affaan-m/agentshield.git
cd agentshield
npm install

# Terminal scan of current directory
npm run scan

# HTML report of the vulnerable demo
npx tsx src/index.ts scan --path examples/vulnerable --report html --output report.html

# Run the full interactive demo
npm run demo
```

---

## CLI Reference

### `scan`

Scan a Claude Code configuration directory for security issues.

```bash
npx tsx src/index.ts scan [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-p, --path <path>` | `~/.claude` | Directory to scan |
| `--report <format>` | `terminal` | `terminal` \| `json` \| `markdown` \| `html` |
| `-f, --format <format>` | `terminal` | Alias for `--report` |
| `-o, --output <file>` | stdout | Write report to file instead of stdout |
| `--min-severity <sev>` | `info` | Minimum severity: `critical`, `high`, `medium`, `low`, `info` |
| `--fix` | false | Auto-apply safe fixes |
| `--policy <path>` | — | Validate against an org policy file |
| `--framework <fw>` | `auto` | Force framework: `langchain`, `openai`, `crewai`, `claude`, `auto` |
| `--baseline <path>` | — | Compare against a saved baseline |
| `--save-baseline <path>` | — | Save current results as baseline |
| `--gate` | false | Exit non-zero if score drops (CI mode) |
| `--supply-chain` | false | Verify MCP packages against known-bad list |
| `--corpus` | false | Run detection corpus validation |
| `--injection` | false | Active prompt injection testing |
| `--sandbox` | false | Execute hooks in sandbox and observe behavior |
| `--taint` | false | Taint / data-flow analysis |
| `--deep` | false | Enable all analysis modes |
| `--opus` | false | Opus 4.6 multi-agent deep analysis |
| `--log <path>` | — | Write structured NDJSON scan log |
| `-v, --verbose` | false | Detailed output |

**Examples:**

```bash
# Basic terminal scan
npx tsx src/index.ts scan --path .

# HTML report saved to file (opens in browser)
npx tsx src/index.ts scan --path . --report html --output security-report.html

# JSON report for CI/CD pipeline
npx tsx src/index.ts scan --path . --report json --output report.json

# Only show critical + high severity
npx tsx src/index.ts scan --path . --min-severity high

# Full deep analysis (injection + sandbox + taint + opus)
npx tsx src/index.ts scan --path . --deep

# Enforce org policy and fail CI if non-compliant
npx tsx src/index.ts scan --path . --policy .agentshield/policy.json --gate
```

---

### `watch`

Continuously monitor config directories for security regressions.

```bash
npx tsx src/index.ts watch [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `-p, --path <path>` | `~/.claude` | Directory to watch |
| `--debounce <ms>` | `500` | Debounce interval in ms (min: 100) |
| `--alert <mode>` | `terminal` | `terminal` \| `webhook` \| `both` |
| `--webhook <url>` | — | Webhook URL for alerts |
| `--min-severity <sev>` | `info` | Minimum severity to track |
| `--block` | false | Exit non-zero on critical findings (CI mode) |

**Examples:**

```bash
# Watch current directory
npx tsx src/index.ts watch --path .

# Watch with Slack webhook alerts
npx tsx src/index.ts watch --path . --alert webhook --webhook https://hooks.slack.com/...

# CI mode — exit 2 if critical findings appear
npx tsx src/index.ts watch --path . --block --min-severity high
```

---

### `policy`

Organization-wide security policy management.

#### `policy init`
Generate an example policy file:
```bash
npx tsx src/index.ts policy init --output .agentshield/policy.json
```

#### `policy list`
List all available policy fields and their defaults:
```bash
npx tsx src/index.ts policy list
```

#### `policy validate`
Validate a policy file's syntax and schema:
```bash
npx tsx src/index.ts policy validate .agentshield/policy.json
```

#### `policy apply`
Scan + enforce policy compliance (exits non-zero if violations found):
```bash
npx tsx src/index.ts policy apply .agentshield/policy.json --path . --report html --output report.html
```

**Example policy file:**

```json
{
  "version": 1,
  "name": "My Org Security Policy",
  "description": "Organization-wide Claude Code security requirements",
  "min_score": 75,
  "max_severity": "high",
  "required_deny_list": [
    "Bash(rm -rf",
    "Bash(curl.*|.*sh"
  ],
  "banned_mcp_servers": ["shell-runner", "unsandboxed-browser"],
  "banned_tools": [],
  "required_hooks": [
    {
      "event": "PreToolUse",
      "pattern": "agentshield",
      "description": "AgentShield runtime monitor must be installed"
    }
  ]
}
```

---

### `runtime`

PreToolUse hook enforcement for real-time policy blocking.

```bash
# Install runtime hook
npx tsx src/index.ts runtime install --path .

# Check status
npx tsx src/index.ts runtime status --path .

# Uninstall
npx tsx src/index.ts runtime uninstall --path .

# Repair corrupted install
npx tsx src/index.ts runtime repair --path .
```

---

### `miniclaw`

MiniClaw — minimal secure sandboxed AI agent runtime.

```bash
# Start server (default port 3847)
npx tsx src/index.ts miniclaw start

# Custom config
npx tsx src/index.ts miniclaw start --port 4000 --network none --max-duration 60000

# Create session / check status
npx tsx src/index.ts miniclaw session
npx tsx src/index.ts miniclaw status
```

---

## Report Formats

### Terminal

Colorized output with severity summary table, score breakdown bars, and per-finding detail panels:

```
  AgentShield Security Report
  Grade: F (0/100)

  ┌─────────────┬─────────┐
  │ Severity    │ Count   │
  ├─────────────┼─────────┤
  │ Critical    │ 39      │
  │ High        │ 68      │
  │ Medium      │ 56      │
  │ Low         │ 15      │
  │ Info        │ 9       │
  ├─────────────┼─────────┤
  │ Total       │ 187     │
  └─────────────┴─────────┘
```

### HTML

Professional dark-theme report with:
- **Grade badge** + numeric score + target metadata + timestamp
- **Score breakdown** progress bars (Secrets, Permissions, Hooks, MCP, Agents)
- **Severity summary** stat cards
- **Affected files** table — sorted by severity, with per-file badge counts
- **OWASP LLM Top 10** mapping grid — links to owasp.org for each applicable risk
- **Full findings** — grouped by severity with evidence, fix diffs, and runtime confidence badges
- **Remediation roadmap** — phased action plan (immediate, auto-fix, short-term, long-term)

```bash
npx tsx src/index.ts scan --path . --report html --output report.html
open report.html   # macOS
xdg-open report.html  # Linux
```

### JSON

Machine-readable structured output for CI/CD pipelines, dashboards, or SIEM integration:

```bash
npx tsx src/index.ts scan --path . --report json --output report.json
```

```json
{
  "timestamp": "2026-05-07T08:51:18.178Z",
  "targetPath": "/path/to/config",
  "score": { "grade": "F", "numericScore": 0 },
  "summary": {
    "totalFindings": 187,
    "critical": 39, "high": 68, "medium": 56, "low": 15, "info": 9,
    "filesScanned": 7, "autoFixable": 9
  },
  "findings": [...]
}
```

---

## Demo Guide

```bash
npm run demo
```

The demo walks through:
1. **Terminal scan** of `examples/vulnerable` (187 findings, grade F)
2. **HTML report** → `demo-reports/report.html` — open in browser to see OWASP mappings and remediation roadmap
3. **JSON report** → `demo-reports/report.json`
4. **Policy validation** — creates and applies a demo policy showing 6 violations
5. **Watch mode** — 5-second live monitoring demo

Individual shortcuts:

```bash
npm run scan:demo      # Terminal scan of examples/vulnerable
npm run report         # Terminal report
npm run report:html    # HTML → demo-reports/report.html
npm run report:json    # JSON → demo-reports/report.json
```

---

## Policy Engine

```bash
# Full policy workflow
npx tsx src/index.ts policy init            # Create template policy
npx tsx src/index.ts policy list            # See all available fields
npx tsx src/index.ts policy validate <f>   # Validate policy schema
npx tsx src/index.ts policy apply <f>      # Scan + enforce + report violations
```

Policy evaluation checks:
- **`min_score`** — fails if security score is below threshold
- **`max_severity`** — fails if any finding exceeds allowed severity
- **`required_deny_list`** — fails if required patterns missing from `permissions.deny`
- **`banned_mcp_servers`** — fails if banned MCP servers are configured
- **`banned_tools`** — fails if banned tools appear in the allow list
- **`required_hooks`** — fails if required PreToolUse hooks are absent

---

## Watch Mode

AgentShield's watch mode detects security drift in real time:

1. **Baseline** — initial scan establishes the security baseline
2. **FS watcher** — monitors `settings.json`, `CLAUDE.md`, `mcp.json`, and agent configs
3. **Debounce** — waits for changes to settle before rescanning (default 500ms)
4. **Drift detection** — compares against baseline: reports new, resolved, changed findings
5. **Alerts** — terminal colors / webhook POST

```bash
npx tsx src/index.ts watch --path ~/.claude --debounce 500 --min-severity high
```

---

## Runtime Monitoring

Install a `PreToolUse` hook that evaluates every Claude tool call against your policy:

```bash
npx tsx src/index.ts runtime install --path .
npx tsx src/index.ts runtime status --path .
```

The hook reads `.agentshield/runtime-policy.json` and:
- **Blocks** (exit 2) any tool call matching a `deny` pattern
- **Allows** (exit 0) everything else
- **Logs** every decision to `.agentshield/runtime.log`

---

## MiniClaw Sandbox

Run AI agents inside a restricted sandbox:

```bash
npx tsx src/index.ts miniclaw start --port 3847 --network none
```

Security features:
- **Restricted filesystem** — agents isolated to their sandbox directory
- **Command allowlist** — only pre-approved tool calls permitted
- **Network policy** — `none` (no outbound), `localhost`, or `allowlist`
- **Execution timeout** — configurable max session duration
- **Rate limiting** — per-IP request limits

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Error: Path does not exist` | Use `--path /absolute/path` |
| `Policy file not found` | Run `npx tsx src/index.ts policy init` first |
| `Debounce must be at least 100ms` | Use `--debounce 500` |
| HTML OWASP section empty | Requires findings; scan a non-empty config |
| `punycode` deprecation warning | Node.js 22 warning — safe to ignore |
| Tests failing on `skills` batch | Run `npm run test:batch:core` for stable subset |

---

## Architecture

```
src/
├── index.ts              # CLI (Commander.js) — scan, watch, policy, runtime, miniclaw
├── scanner/              # File discovery + rule orchestration
├── rules/                # Security rules — secrets, hooks, MCP, agents, permissions
├── reporter/
│   ├── html.ts           # HTML renderer — OWASP, affected files, remediation roadmap
│   ├── terminal.ts       # Colorized terminal output with severity tables
│   ├── json.ts           # JSON + Markdown output
│   ├── score.ts          # Security score computation (A–F grading)
│   └── owasp.ts          # OWASP LLM Top 10 2025 category mappings
├── policy/               # Org policy engine — load, evaluate, render violations
├── watch/                # FS watcher + baseline diff + alerts
├── runtime/              # PreToolUse hook install + policy enforcement + logging
├── miniclaw/             # Sandboxed AI agent runtime — server, tools, sandbox, router
├── fixer/                # Auto-fix transforms for safe remediations
├── baseline/             # Baseline save/compare/gate for CI
├── supply-chain/         # MCP package verification (typosquatting, known-bad)
├── corpus/               # Built-in attack corpus for detection coverage testing
└── types.ts              # Shared TypeScript interfaces

tests/                    # Vitest test suites (200+ tests)
examples/
└── vulnerable/           # Intentionally vulnerable config for demos + corpus
scripts/
└── demo.sh               # Interactive demo script
```

---

## npm Scripts

```bash
npm run build         # Compile TypeScript → dist/
npm run dev           # Run CLI in dev mode (tsx)
npm run scan          # Scan current directory
npm run scan:demo     # Scan examples/vulnerable
npm run watch         # Start watch mode on current directory
npm run demo          # Full interactive demo
npm run report        # Terminal report of examples/vulnerable
npm run report:html   # HTML report → demo-reports/report.html
npm run report:json   # JSON report → demo-reports/report.json
npm test              # Run all test suites
npm run test:reporter # Reporter tests only
npm run test:policy   # Policy tests only
npm run test:watch    # Watch tests only
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

---

## License

MIT — see [LICENSE](LICENSE)

---

*AgentShield — Built for the AI security era. Scan early, deploy safely.*
