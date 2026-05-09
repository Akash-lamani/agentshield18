<div align="center">

<img src="public/shield.svg" alt="AgentShield Logo" width="80" height="80" />

# AgentShield

**Security auditor and runtime guard for AI agent configurations**

[![npm version](https://img.shields.io/npm/v/ecc-agentshield?color=blue&label=npm)](https://www.npmjs.com/package/ecc-agentshield)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![CI](https://img.shields.io/github/actions/workflow/status/affaan-m/agentshield/ci.yml?label=CI)](https://github.com/affaan-m/agentshield/actions)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](CONTRIBUTING.md)

AgentShield scans Claude Code setups, MCP server configurations, and AI agent definitions for **secrets, dangerous permissions, prompt injection vectors, misconfigured hooks, and exfiltration risks** — then surfaces everything through a real-time security dashboard and CLI.

[Features](#features) · [Quick Start](#quick-start) · [Dashboard](#dashboard) · [CLI Reference](#cli-reference) · [API](#api-reference) · [MiniClaw](#miniclaw) · [Contributing](#contributing)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
  - [CLI](#cli)
  - [Dashboard](#dashboard)
- [CLI Reference](#cli-reference)
  - [scan](#scan)
  - [init](#init)
  - [watch](#watch)
  - [miniclaw](#miniclaw-cli)
- [Dashboard Pages](#dashboard-pages)
- [API Reference](#api-reference)
  - [Scanner JSON output](#scanner-json-output)
  - [Finding schema](#finding-schema)
  - [MiniClaw HTTP API](#miniclaw-http-api)
- [MiniClaw](#miniclaw)
- [GitHub Action](#github-action)
- [Backend Integration](#backend-integration)
- [Configuration](#configuration)
- [Security Rule Categories](#security-rule-categories)
- [Contributing](#contributing)
- [Changelog](#changelog)
- [License](#license)

---

## Overview

AI agents running with Claude Code or similar runtimes expose a large, often invisible attack surface: environment variable leakage, over-privileged MCP servers, shell hooks that execute arbitrary code, and prompt-injection entry points in config files.

AgentShield is a two-part tool:

| Component | What it does |
|---|---|
| **CLI scanner** (`ecc-agentshield`) | Static + dynamic analysis of Claude/MCP configs; outputs scored security reports |
| **React dashboard** | Real-time UI for scan results, live watch mode, attack simulation, policy engine, and terminal |

Both parts share the same data model and can be wired together via a thin Express proxy (see [Backend Integration](#backend-integration)).

---

## Features

- 🔍 **Deep config scanning** — discovers `CLAUDE.md`, `mcp.json`, `.claude/settings.json`, hook scripts, subagent manifests, and slash-command definitions
- 🔑 **Secret detection** — API keys, tokens, credentials hardcoded in config or docs
- 🛡️ **Permission auditing** — over-broad `allowedTools`, unrestricted shell access, missing `--disallow-write`
- 🪝 **Hook analysis** — shell payloads, transcript access, context injection, remote command execution via child-process wrappers
- 💉 **Prompt injection detection** — hidden instructions inside config comments and markdown
- 🌐 **MCP server risk scoring** — external connections, dangerous tool permissions, exfiltration vectors
- 👁 **Watch mode** — filesystem watcher with SSE-streamed alerts on config changes
- 🤖 **Attack simulator** — inject synthetic attacks to test your detection pipeline
- 📊 **Security scoring** — A–F grade with per-category breakdowns (secrets, permissions, hooks, MCP, agents)
- 🔧 **Auto-fix** — safe one-line fixes for a subset of findings (`--fix`)
- 📄 **Reports** — terminal, JSON, Markdown, and standalone HTML
- 🏃 **MiniClaw** — embedded sandbox server with an HTTP API for runtime prompt routing and sandboxed Claude sessions
- ⚙️ **GitHub Action** — drop-in CI step for continuous security gating

---

## Architecture

```
agentshield/
├── backend/                  # CLI + backend library (ecc-agentshield npm package)
│   ├── src/
│   │   ├── index.ts          # CLI entrypoint (commander)
│   │   ├── scanner/          # File discovery & rule runner
│   │   ├── rules/            # Built-in rule set (secrets, permissions, hooks, mcp, agents…)
│   │   ├── reporter/         # Score calculation + terminal/JSON/HTML/Markdown renderers
│   │   ├── watch/            # Chokidar watcher + diff-based alerts
│   │   ├── runtime/          # Policy evaluator, install helper, status tracker
│   │   ├── sandbox/          # Sandboxed executor + static analyzer
│   │   ├── miniclaw/         # Embedded MCP-compatible HTTP server
│   │   ├── corpus/           # Vulnerable config corpus for testing
│   │   ├── gsk/              # Gemini/Sonnet structured output helpers
│   │   └── grok/             # Prompt rendering utilities
│   └── tests/                # Vitest test suite
│
├── src/                      # React dashboard (Vite + Tailwind)
│   ├── pages/                # DashboardPage, Vulnerabilities, WatchMode, AttackSim…
│   ├── components/           # Layout (Header, Sidebar), AlertToast
│   ├── data/mockData.ts      # Seed data (replace with real API calls)
│   └── types/index.ts        # Shared TypeScript types
│
└── public/                   # Static assets (shield.svg, favicon, icons)
```

---

## Quick Start

### CLI

**Requirements:** Node.js ≥ 18

Install globally:

```bash
npm install -g ecc-agentshield
```

Or run without installing:

```bash
npx ecc-agentshield scan
```

**Basic scan of the current directory:**

```bash
agentshield scan
```

**Scan a specific path and get a JSON report:**

```bash
agentshield scan --path ~/my-agent-project --format json --output report.json
```

**Apply safe auto-fixes:**

```bash
agentshield scan --fix
```

### Dashboard

**Requirements:** Node.js ≥ 18

```bash
# Clone the repository
git clone https://github.com/affaan-m/agentshield.git
cd agentshield

# Install frontend dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:5173

# Production build
npm run build
npm run preview
```

The dashboard ships with realistic mock data out of the box. To connect it to a live backend, see [Backend Integration](#backend-integration).

---

## CLI Reference

### `scan`

```bash
agentshield scan [options]
```

| Option | Type | Default | Description |
|---|---|---|---|
| `--path <path>` | string | `.` | Target directory to scan |
| `--format` | `terminal\|json\|markdown\|html` | `terminal` | Output format |
| `--output <file>` | string | stdout | Write report to file |
| `--fix` | flag | — | Apply safe auto-fixes |
| `--deep` | flag | — | Enable deep recursive discovery |
| `--opus` | flag | — | Use Claude Opus for AI-assisted analysis |
| `--stream` | flag | — | Stream findings as they are discovered |
| `--injection` | flag | — | Enable prompt-injection analysis |
| `--sandbox` | flag | — | Run sandbox analysis |
| `--taint` | flag | — | Enable taint-tracking analysis |
| `--corpus` | flag | — | Scan against the built-in vulnerable config corpus |
| `--min-severity` | `critical\|high\|medium\|low\|info` | `info` | Only report findings at or above this severity |
| `--log <path>` | string | — | Write structured scan logs to file |
| `--log-format` | `ndjson\|json` | `ndjson` | Log file format |

**Exit codes:**

| Code | Meaning |
|---|---|
| `0` | Scan completed, no critical findings |
| `1` | CLI usage error or runtime failure |
| `2` | Scan completed, at least one critical finding reported |

**Examples:**

```bash
# Full scan with HTML report
agentshield scan --path ./my-project --format html --output security-report.html

# Fail CI on critical findings
agentshield scan --min-severity critical || exit 1

# Deep scan with AI-assisted analysis
agentshield scan --deep --opus --injection

# Structured NDJSON logging
agentshield scan --log scan.log --log-format ndjson
```

### `init`

Scaffold a baseline AgentShield policy file in the current project:

```bash
agentshield init
```

### `watch`

Start filesystem watch mode. Emits alerts to stdout whenever a monitored config file changes:

```bash
agentshield watch [--path <dir>]
```

### MiniClaw CLI

```bash
# Start the MiniClaw HTTP server (default port 3000)
agentshield miniclaw start

# Start on a custom port
agentshield miniclaw start --port 8080
```

---

## Dashboard Pages

| Page | Description |
|---|---|
| **Overview** | Security score (A–F), finding totals, threat trend chart, recent activity feed |
| **Vulnerabilities** | Full finding list with severity filters, expandable evidence, one-click fix application |
| **Watch Mode** | Real-time filesystem monitoring with live alert stream |
| **Attack Simulator** | Inject synthetic attack scenarios to validate detection coverage |
| **MCP Security** | Per-server risk scoring, permission breakdown, external connection flags |
| **Policy Engine** | Enable/disable built-in policies, track violations and blocked actions |
| **Terminal** | In-browser terminal interface for running scan commands |
| **Reports** | Download JSON or HTML reports; view scan history |

---

## API Reference

### Scanner JSON output

The stable machine-readable contract is produced by:

```bash
agentshield scan --format json
```

Top-level shape:

```ts
interface SecurityReport {
  timestamp: string;          // ISO 8601
  targetPath: string;
  findings: Finding[];
  score: SecurityScore;
  summary: ReportSummary;
}

interface SecurityScore {
  grade: "A" | "B" | "C" | "D" | "F";
  numericScore: number;       // 0–100
  breakdown: {
    secrets: number;
    permissions: number;
    hooks: number;
    mcp: number;
    agents: number;
  };
}

interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  filesScanned: number;
  autoFixable: number;
}
```

### Finding schema

```ts
interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category:
    | "secrets" | "permissions" | "hooks" | "mcp"
    | "agents" | "injection" | "exposure"
    | "exfiltration" | "misconfiguration";
  title: string;
  description: string;
  file: string;
  line?: number;
  evidence?: string;

  // Source-aware confidence level (v1.4+)
  runtimeConfidence?:
    | "active-runtime"
    | "project-local-optional"
    | "template-example"
    | "docs-example"
    | "plugin-manifest"
    | "hook-code";

  fix?: {
    description: string;
    before: string;
    after: string;
    auto: boolean;          // true = safe to apply with --fix
  };
}
```

**`runtimeConfidence` values**

| Value | Meaning |
|---|---|
| `active-runtime` | Active config (`mcp.json`, `.claude/settings.json`, `.claude.json`) |
| `project-local-optional` | Project-local settings (`settings.local.json`) |
| `template-example` | Template or catalog files (`mcp-configs/`, `config/mcp/`) |
| `docs-example` | Docs/tutorial config (`docs/guide/settings.json`, `commands/*.md`) |
| `plugin-manifest` | Declarative hook manifests (`hooks/hooks.json`) |
| `hook-code` | Manifest-resolved non-shell hook implementations |

Non-secret findings from lower-confidence sources are scored at a discount (0.25×–0.75×) to avoid template-catalog inflation. Committed secrets always count at full weight regardless of source.

### Structured scan log entries

```ts
interface ScanLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  phase: string;
  message: string;
  data?: Record<string, unknown>;
}
```

---

## MiniClaw

MiniClaw is the embedded HTTP server that provides sandboxed Claude sessions with runtime prompt routing and tool policy enforcement.

### Package import

```ts
import {
  startMiniClaw,
  createMiniClawSession,
  routePrompt,
  createSafeWhitelist,
  createGuardedWhitelist,
  createCustomWhitelist,
  createMiniClawServer,
} from "ecc-agentshield/miniclaw";
```

### Quick start

```ts
import { startMiniClaw } from "ecc-agentshield/miniclaw";

const server = await startMiniClaw({ port: 3000 });
console.log("MiniClaw listening on :3000");
```

### Tool whitelists

```ts
import {
  createSafeWhitelist,
  createGuardedWhitelist,
  createCustomWhitelist,
} from "ecc-agentshield/miniclaw";

// Read-only: read, search, list
const safe = createSafeWhitelist();

// Adds write and execute under human-approval gate
const guarded = createGuardedWhitelist();

// Fully custom
const custom = createCustomWhitelist(["read", "search"]);
```

### MiniClaw HTTP API

All endpoints are relative to the server base URL (default `http://localhost:3000`).

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/session` | Create a new sandboxed session |
| `GET` | `/api/session` | List active sessions |
| `DELETE` | `/api/session/:id` | Destroy a session |
| `POST` | `/api/prompt` | Submit a prompt to a session |
| `GET` | `/api/events/:sessionId` | Stream security events for a session |
| `GET` | `/api/health` | Health check |

**Create session — response:**

```json
{
  "sessionId": "uuid",
  "createdAt": "2026-03-13T19:42:00.000Z",
  "allowedTools": ["read", "search", "list"],
  "maxDuration": 300000
}
```

**Submit prompt — request:**

```json
{
  "sessionId": "uuid",
  "prompt": "Read src/index.ts",
  "context": { "traceId": "optional" }
}
```

**Submit prompt — response:**

```json
{
  "sessionId": "uuid",
  "response": "File contents: ...",
  "toolCalls": [
    { "tool": "read", "args": { "path": "src/index.ts" }, "result": "...", "duration": 14 }
  ],
  "duration": 1234,
  "tokenUsage": { "input": 100, "output": 200 }
}
```

---

## GitHub Action

Add AgentShield as a CI security gate in `.github/workflows/security.yml`:

```yaml
name: AgentShield Security Scan

on:
  push:
    branches: [main]
  pull_request:

jobs:
  agentshield:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run AgentShield scan
        uses: affaan-m/agentshield@v1
        with:
          path: "."
          min-severity: high     # fail on high or critical findings
          format: json
          output: agentshield-report.json

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: agentshield-report
          path: agentshield-report.json
```

> **Note:** The `dist/` bundle must be committed before tagging a release. The release workflow verifies that the pushed tag matches `package.json`, rebuilds `dist/`, and refuses to publish if the action artifacts are out of sync.

---

## Backend Integration

The dashboard ships with mock data. To connect it to the live CLI:

### Option 1 — Express API wrapper

```ts
// api-server.ts
import express from "express";
import { AgentShieldScanner } from "./src/scanner/index.js";

const app = express();
app.use(express.json());
app.use((_, res, next) => { res.header("Access-Control-Allow-Origin", "*"); next(); });

app.post("/api/scan", async (req, res) => {
  const scanner = new AgentShieldScanner({ targetPath: req.body.path, deep: true });
  res.json(await scanner.scan());
});

app.get("/api/watch", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  // stream watch events as Server-Sent Events
});

app.listen(3000, () => console.log("AgentShield API on :3000"));
```

### Option 2 — Replace mock data

In `src/data/mockData.ts`, replace `buildInitialReport()` with a real fetch:

```ts
export async function fetchReport(path: string) {
  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}
```

### Vite proxy

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
```

---

## Configuration

AgentShield reads `.agentshieldrc` (JSON or YAML) from the project root when present:

```json
{
  "minSeverity": "medium",
  "ignoreFiles": ["docs/examples/**", "tests/fixtures/**"],
  "rules": {
    "disabled": ["hook-transcript-access"]
  },
  "report": {
    "format": "json",
    "output": "agentshield-report.json"
  }
}
```

Run `agentshield init` to generate a starter config.

---

## Security Rule Categories

| Category | What is checked |
|---|---|
| `secrets` | API keys, tokens, and credentials hardcoded in any config or docs file |
| `permissions` | Over-broad `allowedTools`, missing `--disallow-write`, unrestricted shell access |
| `hooks` | Shell payloads in hooks, transcript/context access, remote execution via child-process |
| `mcp` | Dangerous server permissions, external connections, exfiltration vectors |
| `agents` | Subagent manifests with excessive capabilities, slash-command injection |
| `injection` | Prompt injection hidden in config comments, markdown, or YAML values |
| `exposure` | Sensitive file paths or tokens exposed in environment variables |
| `exfiltration` | Data egress risks in hook scripts or MCP tool definitions |
| `misconfiguration` | Structural issues — missing required fields, invalid values, conflicting settings |

To add a custom rule, see [Contributing](#contributing).

---

## Contributing

We welcome rules, bug fixes, and documentation improvements.

### Setup

```bash
git clone https://github.com/affaan-m/agentshield.git
cd agentshield/backend
npm install
npm run typecheck
npm run scan:demo     # verify the scanner works end-to-end
```

Requires Node ≥ 20 for development.

### Development commands

```bash
npm run dev scan --path examples/vulnerable   # run scanner in dev mode
npm run build                                  # build with tsup
npm run typecheck                              # TypeScript strict check
npm test                                       # full test suite (Vitest)
npm run test:coverage                          # tests + coverage report
```

### Adding a rule

Rules live in `backend/src/rules/`. Each implements the `Rule` interface:

```ts
import type { ConfigFile, Finding, Rule } from "../types.js";

export const myRules: ReadonlyArray<Rule> = [
  {
    id: "category-short-name",
    name: "Human-Readable Name",
    description: "What this rule checks",
    severity: "high",           // critical | high | medium | low | info
    category: "permissions",    // see categories above
    check(file: ConfigFile): ReadonlyArray<Finding> {
      const findings: Finding[] = [];
      // file.content — raw file text
      // file.type — config type identifier
      return findings;
    },
  },
];
```

Register it in `src/rules/index.ts`, add a vulnerable fixture in `examples/vulnerable/`, and write a test in `tests/rules/`.

### Code style

- `readonly` on all interface fields and `ReadonlyArray` for collections
- Pure functions — rules are `(ConfigFile) => Finding[]`
- No mutation, no `any`, TypeScript strict mode throughout

### Pull request checklist

- [ ] `npm run typecheck` passes
- [ ] `npm test` passes
- [ ] `npm run scan:demo` produces expected output
- [ ] Vulnerable fixture added that triggers your new rule
- [ ] Test added in `tests/rules/`

See [CONTRIBUTING.md](backend/CONTRIBUTING.md) for the full guide.

---

## Changelog

See [CHANGELOG.md](backend/CHANGELOG.md) for the full release history.

**Latest: v1.4.0** — Source-aware scoring, `runtimeConfidence` on findings, extended example classification, improved hook and subagent analysis. See the [release notes](backend/release-draft.md).

---

## License

[MIT](LICENSE) © [Affaan Mustafa](https://github.com/affaan-m)

---

<div align="center">

If AgentShield saved you from a security incident, please ⭐ the repo — it helps others find it.

**[Report a bug](https://github.com/affaan-m/agentshield/issues/new?template=bug_report.md)** · **[Request a feature](https://github.com/affaan-m/agentshield/issues/new?template=feature_request.md)** · **[Security disclosure](SECURITY.md)**

</div>
