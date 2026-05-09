// src/frameworks/crewai.ts

import type { ConfigFile, Finding, Rule } from "../types.js";

// ─── Helpers ───────────────────────────────────────────────

function findLineNumber(content: string, matchIndex: number): number {
  return content.substring(0, matchIndex).split("\n").length;
}

function findAllMatches(
  content: string,
  pattern: RegExp
): Array<RegExpMatchArray> {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : pattern.flags + "g";
  return [...content.matchAll(new RegExp(pattern.source, flags))];
}

function maskValue(value: string): string {
  if (value.length <= 12) return value;
  return value.substring(0, 6) + "..." + value.substring(value.length - 4);
}

/**
 * Returns true when the file is a CrewAI Python source file.
 * Detects crew.py, main.py, or any .py file importing from crewai.
 */
function isCrewAIFile(file: ConfigFile): boolean {
  const p = file.path.toLowerCase();

  if (!p.endsWith(".py")) return false;

  const basename = p.split("/").pop() ?? "";
  if (basename === "crew.py" || basename === "main.py") {
    return true;
  }

  return (
    file.content.includes("from crewai") ||
    file.content.includes("import crewai")
  );
}

// ─── CAI-001 — allow_delegation=True on any agent ─────────

const CAI_001: Rule = {
  id: "CAI-001",
  name: "CrewAI allow_delegation=True",
  description:
    "Detects agents configured with allow_delegation=True, which permits arbitrary task delegation to other agents and expands the attack surface",
  severity: "high",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isCrewAIFile(file)) return [];

    const findings: Finding[] = [];

    const pattern = /allow_delegation\s*=\s*True/g;
    const matches = findAllMatches(file.content, pattern);

    for (const match of matches) {
      const idx = match.index ?? 0;

      // Try to extract the agent name from surrounding context
      const window = file.content.substring(Math.max(0, idx - 400), idx);
      const agentNameMatch = window.match(/Agent\s*\([^)]*?role\s*=\s*["']([^"']+)["']/s);
      const agentLabel = agentNameMatch
        ? `"${agentNameMatch[1]}"`
        : `at line ${findLineNumber(file.content, idx)}`;

      findings.push({
        id: `CAI-001-${idx}`,
        severity: "high",
        category: "permissions",
        title: `CrewAI agent ${agentLabel} has allow_delegation=True`,
        description: `The agent ${agentLabel} in ${file.path} has allow_delegation=True. This allows the agent to spawn or delegate tasks to any other agent in the crew, including passing attacker-controlled inputs. A prompt injection in one agent can pivot to any delegated agent.`,
        file: file.path,
        line: findLineNumber(file.content, idx),
        evidence: match[0],
        fix: {
          description:
            "Set allow_delegation=False unless cross-agent delegation is explicitly required",
          before: "allow_delegation=True",
          after: "allow_delegation=False",
          auto: true,
        },
      });
    }

    return findings;
  },
};

// ─── CAI-002 — Tools imported from os/subprocess/shell ────

const DANGEROUS_IMPORT_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly description: string;
}> = [
  {
    pattern: /^import\s+os\b/gm,
    description: "os module (file system and process execution)",
  },
  {
    pattern: /^import\s+subprocess\b/gm,
    description: "subprocess module (spawns child processes)",
  },
  {
    pattern: /^from\s+os\s+import\b/gm,
    description: "os module (selective import)",
  },
  {
    pattern: /^from\s+subprocess\s+import\b/gm,
    description: "subprocess module (selective import)",
  },
  {
    pattern: /\bos\.system\s*\(/g,
    description: "os.system() call (shell command execution)",
  },
  {
    pattern: /\bos\.popen\s*\(/g,
    description: "os.popen() call (shell pipe execution)",
  },
  {
    pattern: /\bsubprocess\.(run|Popen|call|check_output)\s*\(/g,
    description: "subprocess execution call",
  },
  {
    pattern: /\b__import__\s*\(\s*["'](?:os|subprocess|shell)["']\s*\)/g,
    description: "dynamic import of shell/os module",
  },
  {
    pattern: /\beval\s*\(/g,
    description: "eval() (executes arbitrary Python expressions)",
  },
  {
    pattern: /\bexec\s*\(/g,
    description: "exec() (executes arbitrary Python code)",
  },
];

const CAI_002: Rule = {
  id: "CAI-002",
  name: "CrewAI Tool Uses OS/Subprocess/Shell Import",
  description:
    "Detects CrewAI tool files that import os, subprocess, or use shell execution primitives, granting agents arbitrary command execution capability",
  severity: "high",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isCrewAIFile(file)) return [];

    const findings: Finding[] = [];

    for (const { pattern, description } of DANGEROUS_IMPORT_PATTERNS) {
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;
        findings.push({
          id: `CAI-002-${description.replace(/\s+/g, "-").substring(0, 20)}-${idx}`,
          severity: "high",
          category: "permissions",
          title: `CrewAI tool uses dangerous import: ${description}`,
          description: `Found ${description} in the CrewAI file ${file.path}. Tools that expose shell execution to agents allow prompt injection attacks to run arbitrary operating system commands. Replace with purpose-built, sandboxed tool implementations.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: match[0].trim().substring(0, 60),
          fix: {
            description:
              "Replace OS/subprocess calls with a well-defined API client or sandboxed tool",
            before: match[0].trim(),
            after: "# Use a purpose-built SDK or API client instead",
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── CAI-003 — No max_iter set on agents ──────────────────

const CAI_003: Rule = {
  id: "CAI-003",
  name: "CrewAI Agent Missing max_iter",
  description:
    "Detects Agent() instantiations that do not set max_iter, risking infinite loops and runaway API costs",
  severity: "medium",
  category: "misconfiguration",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isCrewAIFile(file)) return [];

    const findings: Finding[] = [];

    // Match Agent( ... ) blocks — may span multiple lines
    const agentBlockPattern = /Agent\s*\((?:[^()]*|\([^()]*\))*\)/gs;
    const matches = findAllMatches(file.content, agentBlockPattern);

    for (const match of matches) {
      const idx = match.index ?? 0;
      const block = match[0];

      if (/max_iter\s*=/.test(block)) continue;

      // Extract role for context
      const roleMatch = block.match(/role\s*=\s*["']([^"']+)["']/);
      const roleLabel = roleMatch ? `"${roleMatch[1]}"` : `at line ${findLineNumber(file.content, idx)}`;

      findings.push({
        id: `CAI-003-${idx}`,
        severity: "medium",
        category: "misconfiguration",
        title: `CrewAI agent ${roleLabel} missing max_iter`,
        description: `The agent ${roleLabel} in ${file.path} does not set max_iter. Without an iteration cap, the agent can loop indefinitely when it fails to complete a task, generating unbounded API costs and potentially hanging your crew indefinitely.`,
        file: file.path,
        line: findLineNumber(file.content, idx),
        evidence: block.substring(0, 80).replace(/\s+/g, " ").trim() + "...",
        fix: {
          description: "Add max_iter=10 (or appropriate limit) to the Agent",
          before: "Agent(role=..., goal=..., backstory=...)",
          after: "Agent(role=..., goal=..., backstory=..., max_iter=10)",
          auto: false,
        },
      });
    }

    return findings;
  },
};

// ─── CAI-004 — Hardcoded API keys in Python source ────────

const API_KEY_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly label: string;
}> = [
  {
    pattern:
      /(?:OPENAI_API_KEY|openai_api_key|api_key)\s*=\s*["'](sk-[a-zA-Z0-9_-]{20,})["']/g,
    label: "OpenAI API key",
  },
  {
    pattern:
      /(?:ANTHROPIC_API_KEY|anthropic_api_key)\s*=\s*["'](sk-ant-[a-zA-Z0-9_-]{20,})["']/g,
    label: "Anthropic API key",
  },
  {
    pattern:
      /(?:SERPER_API_KEY|SERPAPI_API_KEY|serper_api_key)\s*=\s*["']([a-zA-Z0-9_-]{20,})["']/g,
    label: "Serper/SerpAPI key",
  },
  {
    pattern:
      /(?:GROQ_API_KEY|groq_api_key)\s*=\s*["']([a-zA-Z0-9_-]{20,})["']/g,
    label: "Groq API key",
  },
];

const CAI_004: Rule = {
  id: "CAI-004",
  name: "CrewAI Hardcoded API Key in Python Source",
  description:
    "Detects hardcoded API keys directly in CrewAI Python source files",
  severity: "critical",
  category: "secrets",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isCrewAIFile(file)) return [];

    const findings: Finding[] = [];

    for (const { pattern, label } of API_KEY_PATTERNS) {
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;

        // Skip env var references
        const surrounding = file.content.substring(
          Math.max(0, idx - 30),
          idx + match[0].length + 10
        );
        if (
          surrounding.includes("os.environ") ||
          surrounding.includes("os.getenv") ||
          surrounding.includes("${")
        ) {
          continue;
        }

        const rawKey = match[1] ?? match[0];

        findings.push({
          id: `CAI-004-${idx}`,
          severity: "critical",
          category: "secrets",
          title: `Hardcoded ${label} in CrewAI source`,
          description: `Found a hardcoded ${label} in ${file.path}. Hardcoding secrets in source files exposes them via version control history, container images, and log aggregators even after removal.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: maskValue(rawKey),
          fix: {
            description: "Replace with os.environ or python-dotenv",
            before: match[0],
            after: `os.getenv("${label.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")}")`,
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── CAI-005 — verbose=True exposing agent reasoning ──────

const CAI_005: Rule = {
  id: "CAI-005",
  name: "CrewAI verbose=True Exposes Agent Reasoning",
  description:
    "Detects verbose=True on Agent or Crew objects, which logs full chain-of-thought reasoning to stdout, potentially leaking sensitive data and proprietary logic",
  severity: "low",
  category: "exposure",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isCrewAIFile(file)) return [];

    const findings: Finding[] = [];

    // Match verbose=True inside Agent(...) or Crew(...) blocks
    const pattern = /(?:Agent|Crew)\s*\([^)]*verbose\s*=\s*True[^)]*\)/gs;
    const matches = findAllMatches(file.content, pattern);

    for (const match of matches) {
      const idx = match.index ?? 0;

      // Find verbose=True position within match for accurate line number
      const verboseOffset = match[0].indexOf("verbose");
      const verboseIdx = idx + verboseOffset;

      const objectName = match[0].startsWith("Crew") ? "Crew" : "Agent";

      findings.push({
        id: `CAI-005-${idx}`,
        severity: "low",
        category: "exposure",
        title: `CrewAI ${objectName} has verbose=True`,
        description: `Found verbose=True in a ${objectName} object in ${file.path}. Verbose mode logs full agent reasoning chains, tool inputs/outputs, and intermediate steps to stdout. In production this can expose sensitive business logic, PII from tool results, and API keys that appear in tool call arguments.`,
        file: file.path,
        line: findLineNumber(file.content, verboseIdx),
        evidence: "verbose=True",
        fix: {
          description: "Set verbose=False in production environments",
          before: "verbose=True",
          after: "verbose=False",
          auto: true,
        },
      });
    }

    return findings;
  },
};

// ─── Exported rule set ─────────────────────────────────────

export const crewaiRules: ReadonlyArray<Rule> = [
  CAI_001,
  CAI_002,
  CAI_003,
  CAI_004,
  CAI_005,
];
