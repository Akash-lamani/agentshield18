// src/frameworks/langchain.ts

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

/**
 * Returns true when the file path looks like a LangChain project file.
 * Accepts: .env, agents/*.py, chains/*.py, tools/*.py, any *.py containing
 * LangChain-specific imports, and agent_executor configs.
 */
function isLangChainFile(file: ConfigFile): boolean {
  const p = file.path.toLowerCase();

  // .env files in any directory
  if (p === ".env" || p.endsWith("/.env")) return true;

  // Python source files under typical LangChain layout folders
  if (
    p.endsWith(".py") &&
    (/\/agents\//.test(p) ||
      /\/chains\//.test(p) ||
      /\/tools\//.test(p) ||
      file.content.includes("from langchain") ||
      file.content.includes("import langchain") ||
      file.content.includes("AgentExecutor") ||
      file.content.includes("LLMChain") ||
      file.content.includes("ChatOpenAI") ||
      file.content.includes("ChatAnthropic"))
  ) {
    return true;
  }

  // Flat Python files at root that import langchain
  if (
    p.endsWith(".py") &&
    (file.content.includes("from langchain") ||
      file.content.includes("import langchain"))
  ) {
    return true;
  }

  return false;
}

function maskValue(value: string): string {
  if (value.length <= 12) return value;
  return value.substring(0, 6) + "..." + value.substring(value.length - 4);
}

// ─── LC-001 — Hardcoded OpenAI / Anthropic API key ────────

const LC_001: Rule = {
  id: "LC-001",
  name: "LangChain Hardcoded API Key",
  description:
    "Detects hardcoded openai_api_key or anthropic_api_key values in .env files or Python source files",
  severity: "critical",
  category: "secrets",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isLangChainFile(file)) return [];

    const findings: Finding[] = [];

    const patterns: ReadonlyArray<{
      readonly pattern: RegExp;
      readonly label: string;
    }> = [
      // .env style: OPENAI_API_KEY=sk-... or ANTHROPIC_API_KEY=sk-ant-...
      {
        pattern:
          /(?:OPENAI_API_KEY|openai_api_key)\s*=\s*["']?(sk-[a-zA-Z0-9_-]{20,})["']?/g,
        label: "OpenAI API key",
      },
      {
        pattern:
          /(?:ANTHROPIC_API_KEY|anthropic_api_key)\s*=\s*["']?(sk-ant-[a-zA-Z0-9_-]{20,})["']?/g,
        label: "Anthropic API key",
      },
      // Python kwarg style: openai_api_key="sk-..."
      {
        pattern: /openai_api_key\s*=\s*["'](sk-[a-zA-Z0-9_-]{20,})["']/g,
        label: "OpenAI API key (kwarg)",
      },
      {
        pattern: /anthropic_api_key\s*=\s*["'](sk-ant-[a-zA-Z0-9_-]{20,})["']/g,
        label: "Anthropic API key (kwarg)",
      },
    ];

    for (const { pattern, label } of patterns) {
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;
        // Skip env var references
        const surrounding = file.content.substring(
          Math.max(0, idx - 20),
          idx + match[0].length + 10
        );
        if (
          surrounding.includes("${") ||
          surrounding.includes("os.environ") ||
          surrounding.includes("os.getenv")
        ) {
          continue;
        }

        const rawKey = match[1] ?? match[0];
        findings.push({
          id: `LC-001-${idx}`,
          severity: "critical",
          category: "secrets",
          title: `Hardcoded ${label} in LangChain config`,
          description: `Found a hardcoded ${label} in ${file.path}. Committing API keys to source control exposes them to anyone with repository access and may trigger automated secret scanning alerts.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: maskValue(rawKey),
          fix: {
            description: "Replace with an environment variable reference",
            before: match[0],
            after:
              label.includes("OpenAI")
                ? 'openai_api_key=os.getenv("OPENAI_API_KEY")'
                : 'anthropic_api_key=os.getenv("ANTHROPIC_API_KEY")',
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── LC-002 — Dangerous tool names ────────────────────────

const DANGEROUS_TOOL_NAMES: ReadonlyArray<string> = [
  "shell",
  "terminal",
  "exec",
  "bash",
  "system",
];

const LC_002: Rule = {
  id: "LC-002",
  name: "LangChain Dangerous Tool Name",
  description:
    "Detects tool names that grant shell/OS execution access (shell, terminal, exec, bash, system)",
  severity: "high",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isLangChainFile(file)) return [];

    const findings: Finding[] = [];

    // Match tool name strings in Python: Tool(name="shell",...) or {"name": "bash"}
    // or direct string literals like "shell_tool", tool_name = "exec"
    for (const toolName of DANGEROUS_TOOL_NAMES) {
      const pattern = new RegExp(
        `(?:name\\s*=\\s*["']|"name"\\s*:\\s*["'])([^"']*\\b${toolName}\\b[^"']*)["']`,
        "gi"
      );
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;
        findings.push({
          id: `LC-002-${toolName}-${idx}`,
          severity: "high",
          category: "permissions",
          title: `Dangerous LangChain tool name: "${match[1]}"`,
          description: `Tool named "${match[1]}" in ${file.path} suggests shell or OS execution access. Agents with unrestricted command execution can be weaponized to run arbitrary code on the host system.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: match[0],
          fix: {
            description:
              "Remove or restrict the tool to a well-defined, sandboxed interface",
            before: match[0],
            after: '# Use a purpose-built tool instead of raw shell access',
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── LC-003 — allow_dangerous_requests=True ───────────────

const LC_003: Rule = {
  id: "LC-003",
  name: "LangChain allow_dangerous_requests Enabled",
  description:
    "Detects allow_dangerous_requests=True which disables built-in LangChain safety guardrails",
  severity: "high",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isLangChainFile(file)) return [];

    const findings: Finding[] = [];

    // Python kwarg: allow_dangerous_requests=True (case-insensitive for value)
    const pattern = /allow_dangerous_requests\s*=\s*True/g;
    const matches = findAllMatches(file.content, pattern);

    for (const match of matches) {
      const idx = match.index ?? 0;
      findings.push({
        id: `LC-003-${idx}`,
        severity: "high",
        category: "permissions",
        title: "LangChain allow_dangerous_requests=True detected",
        description: `Found \`allow_dangerous_requests=True\` in ${file.path}. This flag disables LangChain's built-in guardrails for dangerous operations such as arbitrary URL fetching and file access. Remove it or restrict the agent's tool scope.`,
        file: file.path,
        line: findLineNumber(file.content, idx),
        evidence: match[0],
        fix: {
          description: "Remove allow_dangerous_requests or set it to False",
          before: "allow_dangerous_requests=True",
          after: "allow_dangerous_requests=False",
          auto: true,
        },
      });
    }

    return findings;
  },
};

// ─── LC-004 — verbose=True with sensitive data exposure ───

const LC_004: Rule = {
  id: "LC-004",
  name: "LangChain verbose=True Sensitive Data Exposure",
  description:
    "Detects verbose=True on agents or chains that also handle secrets, which risks leaking sensitive data to logs",
  severity: "medium",
  category: "exposure",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isLangChainFile(file)) return [];

    const findings: Finding[] = [];

    const verbosePattern = /verbose\s*=\s*True/g;
    const verboseMatches = findAllMatches(file.content, verbosePattern);

    if (verboseMatches.length === 0) return [];

    // Only flag when the same file also references sensitive data patterns
    const sensitiveIndicators = [
      /api_key/i,
      /secret/i,
      /password/i,
      /token/i,
      /credential/i,
      /os\.environ/,
      /os\.getenv/,
    ];

    const hasSensitiveData = sensitiveIndicators.some((indicator) =>
      indicator.test(file.content)
    );

    if (!hasSensitiveData) return [];

    for (const match of verboseMatches) {
      const idx = match.index ?? 0;

      // Check that verbose=True is inside a LangChain object instantiation
      const surroundingWindow = file.content.substring(
        Math.max(0, idx - 300),
        idx + 100
      );
      const isInsideLangChainObject =
        /AgentExecutor|LLMChain|ChatOpenAI|ChatAnthropic|Tool\s*\(|initialize_agent/.test(
          surroundingWindow
        );

      if (!isInsideLangChainObject) continue;

      findings.push({
        id: `LC-004-${idx}`,
        severity: "medium",
        category: "exposure",
        title: "LangChain verbose=True may expose sensitive data in logs",
        description: `Found \`verbose=True\` in a LangChain object in ${file.path}. Verbose mode logs full prompt content, intermediate steps, and tool inputs/outputs. If API keys or PII flow through the chain, they will appear in plaintext in application logs.`,
        file: file.path,
        line: findLineNumber(file.content, idx),
        evidence: match[0],
        fix: {
          description:
            "Set verbose=False in production, or use a log filter to redact sensitive fields",
          before: "verbose=True",
          after: "verbose=False  # or use structured logging with redaction",
          auto: true,
        },
      });
    }

    return findings;
  },
};

// ─── LC-005 — Missing input validation on tool arguments ──

const LC_005: Rule = {
  id: "LC-005",
  name: "LangChain Tool Missing Input Validation",
  description:
    "Detects Tool definitions that lack args_schema or input validation, leaving them open to prompt injection via malformed inputs",
  severity: "medium",
  category: "misconfiguration",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isLangChainFile(file)) return [];

    const findings: Finding[] = [];

    // Match Tool(...) or StructuredTool(...) instantiations
    // Pattern: Tool( or StructuredTool( followed by content, looking for missing args_schema
    const toolBlockPattern =
      /(?:StructuredTool|Tool)\s*\(\s*(?:[^()]*|\([^()]*\))*\)/gs;
    const toolMatches = findAllMatches(file.content, toolBlockPattern);

    for (const match of toolMatches) {
      const idx = match.index ?? 0;
      const block = match[0];

      // Skip if the block already contains args_schema or input_type
      if (/args_schema|input_type/.test(block)) continue;

      // Skip if it's a StructuredTool.from_function which has implicit schema
      if (/from_function/.test(block)) continue;

      // Only flag if the tool block includes a func= parameter (i.e., it's a real tool def)
      if (!/\bfunc\s*=/.test(block)) continue;

      findings.push({
        id: `LC-005-${idx}`,
        severity: "medium",
        category: "misconfiguration",
        title: "LangChain Tool defined without args_schema validation",
        description: `A \`Tool\` in ${file.path} does not define \`args_schema\`. Without a Pydantic schema, tool arguments are passed as raw strings with no type checking or sanitization. An attacker who controls agent input can supply unexpected argument types or injection payloads.`,
        file: file.path,
        line: findLineNumber(file.content, idx),
        evidence: block.substring(0, 80).replace(/\s+/g, " ").trim() + "...",
        fix: {
          description:
            "Add an args_schema=YourInputModel argument using a Pydantic BaseModel",
          before: "Tool(name=..., func=..., description=...)",
          after:
            "Tool(name=..., func=..., description=..., args_schema=MyInputSchema)",
          auto: false,
        },
      });
    }

    return findings;
  },
};

// ─── Exported rule set ─────────────────────────────────────

export const langchainRules: ReadonlyArray<Rule> = [
  LC_001,
  LC_002,
  LC_003,
  LC_004,
  LC_005,
];
