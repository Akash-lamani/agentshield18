// src/frameworks/openai.ts

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
 * Returns true when the file looks like an OpenAI assistant/config JSON.
 * Accepts: assistant.json, openai-config.json, any JSON with
 * tools[] + model starting with "gpt-" or "o1" or "o3".
 */
function isOpenAIFile(file: ConfigFile): boolean {
  const p = file.path.toLowerCase();

  if (p.endsWith("assistant.json") || p.endsWith("openai-config.json")) {
    return true;
  }

  // Any JSON file that references an OpenAI model
  if (p.endsWith(".json")) {
    try {
      const parsed = JSON.parse(file.content) as Record<string, unknown>;
      const model = parsed["model"];
      if (
        typeof model === "string" &&
        (/^gpt-/.test(model) || /^o[13]/.test(model) || model === "gpt-4o")
      ) {
        return true;
      }
    } catch {
      // not valid JSON
    }
  }

  return false;
}

// ─── OAI-001 — Hardcoded api_key in JSON configs ──────────

const OAI_001: Rule = {
  id: "OAI-001",
  name: "OpenAI Hardcoded API Key",
  description:
    "Detects hardcoded api_key values in OpenAI JSON configuration files",
  severity: "critical",
  category: "secrets",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isOpenAIFile(file)) return [];

    const findings: Finding[] = [];

    // Match "api_key": "sk-..." in JSON
    const patterns: ReadonlyArray<RegExp> = [
      /"api_key"\s*:\s*"(sk-[a-zA-Z0-9_-]{20,})"/g,
      /"openai_api_key"\s*:\s*"(sk-[a-zA-Z0-9_-]{20,})"/g,
      /"OPENAI_API_KEY"\s*:\s*"(sk-[a-zA-Z0-9_-]{20,})"/g,
    ];

    for (const pattern of patterns) {
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;
        const rawKey = match[1] ?? "";

        // Skip env var placeholders like "${OPENAI_API_KEY}"
        if (rawKey.startsWith("${") || rawKey.startsWith("$")) continue;

        findings.push({
          id: `OAI-001-${idx}`,
          severity: "critical",
          category: "secrets",
          title: "Hardcoded OpenAI API key in JSON config",
          description: `Found a hardcoded OpenAI API key in ${file.path}. Storing API keys in config files risks credential exposure via source control, container images, or log forwarding.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: maskValue(rawKey),
          fix: {
            description: "Replace with an environment variable reference",
            before: match[0],
            after: '"api_key": "${OPENAI_API_KEY}"',
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── OAI-002 — Function tools missing "required" field ────

const OAI_002: Rule = {
  id: "OAI-002",
  name: "OpenAI Function Tool Missing required Field",
  description:
    'Detects function tool definitions that omit the "required" array in their parameters schema, allowing callers to omit arguments silently',
  severity: "high",
  category: "misconfiguration",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isOpenAIFile(file)) return [];

    const findings: Finding[] = [];

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(file.content) as Record<string, unknown>;
    } catch {
      return [];
    }

    const tools = parsed["tools"];
    if (!Array.isArray(tools)) return [];

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i] as Record<string, unknown>;
      if (tool["type"] !== "function") continue;

      const fn = tool["function"] as Record<string, unknown> | undefined;
      if (!fn) continue;

      const params = fn["parameters"] as Record<string, unknown> | undefined;
      if (!params) {
        // No parameters at all — flag as missing required
        findings.push({
          id: `OAI-002-tool-${i}`,
          severity: "high",
          category: "misconfiguration",
          title: `OpenAI function tool "${String(fn["name"] ?? i)}" has no parameters schema`,
          description: `The function tool "${String(fn["name"] ?? i)}" in ${file.path} has no parameters definition. Without a schema, the model cannot validate inputs and may pass malformed arguments to your function.`,
          file: file.path,
          evidence: `tool[${i}].function.name = "${String(fn["name"] ?? "")}"`,
          fix: {
            description:
              'Add a parameters object with "type", "properties", and "required" array',
            before: '"parameters": (missing)',
            after:
              '"parameters": { "type": "object", "properties": { ... }, "required": ["arg1"] }',
            auto: false,
          },
        });
        continue;
      }

      if (!Array.isArray(params["required"])) {
        findings.push({
          id: `OAI-002-required-${i}`,
          severity: "high",
          category: "misconfiguration",
          title: `OpenAI function tool "${String(fn["name"] ?? i)}" missing "required" array`,
          description: `The function tool "${String(fn["name"] ?? i)}" in ${file.path} has a parameters schema but no "required" array. This allows the model to omit any argument, leading to silent null/undefined errors in your function handler.`,
          file: file.path,
          evidence: `tool[${i}].function.parameters lacks "required"`,
          fix: {
            description: 'Add a "required" array listing mandatory arguments',
            before: '"parameters": { "type": "object", "properties": { ... } }',
            after:
              '"parameters": { "type": "object", "properties": { ... }, "required": ["arg1"] }',
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── OAI-003 — code_interpreter enabled, no file restrictions

const OAI_003: Rule = {
  id: "OAI-003",
  name: "OpenAI code_interpreter Enabled Without File Restrictions",
  description:
    "Detects assistants with code_interpreter enabled when no file type or path restrictions are configured, allowing arbitrary code execution against uploaded files",
  severity: "high",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isOpenAIFile(file)) return [];

    const findings: Finding[] = [];

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(file.content) as Record<string, unknown>;
    } catch {
      return [];
    }

    const tools = parsed["tools"];
    if (!Array.isArray(tools)) return [];

    const hasCodeInterpreter = tools.some(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        (t as Record<string, unknown>)["type"] === "code_interpreter"
    );

    if (!hasCodeInterpreter) return [];

    // Check for any file restriction fields
    const toolResources = parsed["tool_resources"] as
      | Record<string, unknown>
      | undefined;
    const codeInterpreterResources = toolResources?.["code_interpreter"] as
      | Record<string, unknown>
      | undefined;

    // If file_ids is present it still doesn't restrict execution scope
    // Flag unless there's an explicit allowed_file_types or similar restriction
    const hasRestrictions =
      codeInterpreterResources &&
      ("allowed_file_types" in codeInterpreterResources ||
        "max_file_size" in codeInterpreterResources ||
        "sandbox" in codeInterpreterResources);

    if (!hasRestrictions) {
      findings.push({
        id: "OAI-003-0",
        severity: "high",
        category: "permissions",
        title: "code_interpreter enabled without file restrictions",
        description: `The assistant in ${file.path} has code_interpreter enabled with no file-type or sandbox restrictions. The model can execute arbitrary Python against any uploaded file, including operations that read environment variables, exfiltrate data, or consume excessive compute.`,
        file: file.path,
        evidence: '"type": "code_interpreter"',
        fix: {
          description:
            "Add tool_resources.code_interpreter restrictions or use file_search instead if code execution is not required",
          before: '{ "type": "code_interpreter" }',
          after:
            '{ "type": "code_interpreter" } + tool_resources with allowed file types',
          auto: false,
        },
      });
    }

    return findings;
  },
};

// ─── OAI-004 — retrieval tool pointing to sensitive paths ─

const SENSITIVE_PATH_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp;
  readonly description: string;
}> = [
  { pattern: /\/etc\/passwd/gi, description: "/etc/passwd (Unix user database)" },
  { pattern: /\/etc\/shadow/gi, description: "/etc/shadow (Unix password hashes)" },
  { pattern: /\.aws\/credentials/gi, description: "AWS credentials file" },
  { pattern: /\.ssh\/id_/gi, description: "SSH private key" },
  { pattern: /\.env\b/gi, description: ".env secrets file" },
  { pattern: /\/proc\/self/gi, description: "/proc/self (process memory)" },
  { pattern: /\/var\/log/gi, description: "system log directory" },
  { pattern: /\.kube\/config/gi, description: "Kubernetes config" },
  { pattern: /\.docker\/config\.json/gi, description: "Docker registry credentials" },
  { pattern: /\.netrc/gi, description: ".netrc credentials file" },
];

const OAI_004: Rule = {
  id: "OAI-004",
  name: "OpenAI Retrieval Tool Pointing to Sensitive Path",
  description:
    "Detects retrieval/file_search tool configurations that reference sensitive system paths",
  severity: "medium",
  category: "permissions",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isOpenAIFile(file)) return [];

    const findings: Finding[] = [];

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(file.content) as Record<string, unknown>;
    } catch {
      return [];
    }

    const tools = parsed["tools"];
    if (!Array.isArray(tools)) return [];

    const hasRetrieval = tools.some(
      (t) =>
        typeof t === "object" &&
        t !== null &&
        ((t as Record<string, unknown>)["type"] === "retrieval" ||
          (t as Record<string, unknown>)["type"] === "file_search")
    );

    if (!hasRetrieval) return [];

    // Scan the entire file content for sensitive path references
    for (const { pattern, description } of SENSITIVE_PATH_PATTERNS) {
      const matches = findAllMatches(file.content, pattern);
      for (const match of matches) {
        const idx = match.index ?? 0;
        findings.push({
          id: `OAI-004-${idx}`,
          severity: "medium",
          category: "permissions",
          title: `Retrieval tool references sensitive path: ${description}`,
          description: `The retrieval/file_search tool in ${file.path} references "${match[0]}" — ${description}. If this path is indexed or accessible to the retrieval tool, the model may expose sensitive system data in its responses.`,
          file: file.path,
          line: findLineNumber(file.content, idx),
          evidence: match[0],
          fix: {
            description:
              "Remove references to sensitive system paths from retrieval tool configuration",
            before: match[0],
            after: "# Use application-scoped data directories only",
            auto: false,
          },
        });
      }
    }

    return findings;
  },
};

// ─── OAI-005 — max_prompt_tokens not set ──────────────────

const OAI_005: Rule = {
  id: "OAI-005",
  name: "OpenAI max_prompt_tokens Not Set",
  description:
    "Detects OpenAI assistant/run configurations that do not cap prompt token usage, risking runaway costs and context injection via large uploads",
  severity: "medium",
  category: "misconfiguration",
  check(file: ConfigFile): ReadonlyArray<Finding> {
    if (!isOpenAIFile(file)) return [];

    const findings: Finding[] = [];

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(file.content) as Record<string, unknown>;
    } catch {
      return [];
    }

    // Only flag assistant-level configs (has "model" field), not bare tool lists
    if (typeof parsed["model"] !== "string") return [];

    if (
      parsed["max_prompt_tokens"] === undefined ||
      parsed["max_prompt_tokens"] === null
    ) {
      findings.push({
        id: "OAI-005-0",
        severity: "medium",
        category: "misconfiguration",
        title: "OpenAI assistant config missing max_prompt_tokens",
        description: `The assistant config in ${file.path} does not set max_prompt_tokens. Without this limit, an attacker who controls uploaded files or tool outputs can inject massive context to override system instructions or cause excessive API costs.`,
        file: file.path,
        evidence: '"max_prompt_tokens": (not set)',
        fix: {
          description:
            "Add max_prompt_tokens to cap context size per run (e.g. 4096 or 8192)",
          before: "{ ... (no max_prompt_tokens) }",
          after: '{ ..., "max_prompt_tokens": 8192 }',
          auto: false,
        },
      });
    }

    return findings;
  },
};

// ─── Exported rule set ─────────────────────────────────────

export const openaiRules: ReadonlyArray<Rule> = [
  OAI_001,
  OAI_002,
  OAI_003,
  OAI_004,
  OAI_005,
];
