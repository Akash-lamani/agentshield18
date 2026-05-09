// tests/frameworks/openai.test.ts

import { describe, it, expect } from "vitest";
import { openaiRules } from "../../src/frameworks/openai.js";
import type { ConfigFile, Finding } from "../../src/types.js";

// ─── Factories ─────────────────────────────────────────────

function makeJson(
  obj: Record<string, unknown>,
  path = "assistant.json"
): ConfigFile {
  return { path, type: "unknown", content: JSON.stringify(obj, null, 2) };
}

function makeRaw(content: string, path = "assistant.json"): ConfigFile {
  return { path, type: "unknown", content };
}

function runRule(ruleId: string, file: ConfigFile): ReadonlyArray<Finding> {
  const rule = openaiRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} not found`);
  return rule.check(file);
}

function runAll(file: ConfigFile): ReadonlyArray<Finding> {
  return openaiRules.flatMap((r) => r.check(file));
}

// ─── Minimal valid assistant config ───────────────────────

function baseAssistant(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    model: "gpt-4o",
    name: "My Assistant",
    instructions: "You are a helpful assistant.",
    max_prompt_tokens: 8192,
    tools: [],
    ...overrides,
  };
}

// ─── OAI-001 ───────────────────────────────────────────────

describe("OAI-001: Hardcoded API Key", () => {
  it("detects hardcoded sk- key in api_key field", () => {
    const file = makeRaw(
      JSON.stringify({ model: "gpt-4o", api_key: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890" }),
      "assistant.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].category).toBe("secrets");
  });

  it("detects key in openai_api_key field", () => {
    const file = makeRaw(
      '{"model":"gpt-4o","openai_api_key":"sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"}',
      "openai-config.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("masks evidence", () => {
    const file = makeRaw(
      '{"model":"gpt-4o","api_key":"sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"}',
      "assistant.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings[0].evidence).toContain("...");
    expect(findings[0].evidence).not.toContain("abcdefghijklm");
  });

  it("skips env var placeholder", () => {
    const file = makeRaw(
      '{"model":"gpt-4o","api_key":"${OPENAI_API_KEY}"}',
      "assistant.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings).toHaveLength(0);
  });

  it("does not fire on non-OpenAI files", () => {
    const file = makeRaw(
      '{"api_key":"sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"}',
      "random-config.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings).toHaveLength(0);
  });

  it("provides a fix suggestion", () => {
    const file = makeRaw(
      '{"model":"gpt-4o","api_key":"sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"}',
      "assistant.json"
    );
    const findings = runRule("OAI-001", file);
    expect(findings[0].fix).toBeDefined();
    expect(findings[0].fix?.after).toContain("OPENAI_API_KEY");
  });
});

// ─── OAI-002 ───────────────────────────────────────────────

describe("OAI-002: Function Tool Missing required", () => {
  it("flags function tool with no parameters at all", () => {
    const file = makeJson(
      baseAssistant({
        tools: [{ type: "function", function: { name: "get_weather", description: "Get weather" } }],
      })
    );
    const findings = runRule("OAI-002", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
  });

  it("flags function tool with parameters but no required array", () => {
    const file = makeJson(
      baseAssistant({
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather",
              parameters: {
                type: "object",
                properties: { location: { type: "string" } },
              },
            },
          },
        ],
      })
    );
    const findings = runRule("OAI-002", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].title).toContain("required");
  });

  it("does not flag function tool with required array", () => {
    const file = makeJson(
      baseAssistant({
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              parameters: {
                type: "object",
                properties: { location: { type: "string" } },
                required: ["location"],
              },
            },
          },
        ],
      })
    );
    const findings = runRule("OAI-002", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag non-function tools (code_interpreter)", () => {
    const file = makeJson(
      baseAssistant({ tools: [{ type: "code_interpreter" }] })
    );
    const findings = runRule("OAI-002", file);
    expect(findings).toHaveLength(0);
  });

  it("does not fire when tools array is absent", () => {
    const file = makeJson({ model: "gpt-4o", max_prompt_tokens: 8192 });
    const findings = runRule("OAI-002", file);
    expect(findings).toHaveLength(0);
  });

  it("category is misconfiguration", () => {
    const file = makeJson(
      baseAssistant({
        tools: [{ type: "function", function: { name: "fn" } }],
      })
    );
    const findings = runRule("OAI-002", file);
    expect(findings[0].category).toBe("misconfiguration");
  });
});

// ─── OAI-003 ───────────────────────────────────────────────

describe("OAI-003: code_interpreter Without File Restrictions", () => {
  it("flags code_interpreter with no restrictions", () => {
    const file = makeJson(
      baseAssistant({ tools: [{ type: "code_interpreter" }] })
    );
    const findings = runRule("OAI-003", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].category).toBe("permissions");
  });

  it("does not flag when no code_interpreter tool", () => {
    const file = makeJson(
      baseAssistant({ tools: [{ type: "file_search" }] })
    );
    const findings = runRule("OAI-003", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag when tool_resources.code_interpreter has restrictions", () => {
    const file = makeJson(
      baseAssistant({
        tools: [{ type: "code_interpreter" }],
        tool_resources: {
          code_interpreter: { allowed_file_types: ["csv", "txt"] },
        },
      })
    );
    const findings = runRule("OAI-003", file);
    expect(findings).toHaveLength(0);
  });

  it("does not fire on non-OpenAI files", () => {
    const file = makeRaw(
      '{"tools":[{"type":"code_interpreter"}]}',
      "random.json"
    );
    const findings = runRule("OAI-003", file);
    expect(findings).toHaveLength(0);
  });

  it("provides a fix suggestion", () => {
    const file = makeJson(
      baseAssistant({ tools: [{ type: "code_interpreter" }] })
    );
    const findings = runRule("OAI-003", file);
    expect(findings[0].fix).toBeDefined();
  });
});

// ─── OAI-004 ───────────────────────────────────────────────

describe("OAI-004: Retrieval Tool Sensitive Path", () => {
  it("flags retrieval tool config referencing .env", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
        tool_resources: { file_search: { paths: [".env"] } },
      }),
      "assistant.json"
    );
    const findings = runRule("OAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
  });

  it("flags .aws/credentials reference", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "retrieval" }],
        index_path: ".aws/credentials",
      }),
      "assistant.json"
    );
    const findings = runRule("OAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("flags /etc/passwd reference", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
        note: "reads /etc/passwd",
      }),
      "assistant.json"
    );
    const findings = runRule("OAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag when no retrieval tool", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "code_interpreter" }],
        note: ".env reference here",
      }),
      "assistant.json"
    );
    const findings = runRule("OAI-004", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag safe paths", () => {
    const file = makeJson(
      baseAssistant({
        tools: [{ type: "file_search" }],
        tool_resources: { file_search: { paths: ["data/documents"] } },
      })
    );
    const findings = runRule("OAI-004", file);
    expect(findings).toHaveLength(0);
  });

  it("category is permissions", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        tools: [{ type: "file_search" }],
        note: ".aws/credentials",
      }),
      "assistant.json"
    );
    const findings = runRule("OAI-004", file);
    expect(findings[0].category).toBe("permissions");
  });
});

// ─── OAI-005 ───────────────────────────────────────────────

describe("OAI-005: max_prompt_tokens Not Set", () => {
  it("flags assistant config without max_prompt_tokens", () => {
    const file = makeJson({ model: "gpt-4o", tools: [] });
    const findings = runRule("OAI-005", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
    expect(findings[0].category).toBe("misconfiguration");
  });

  it("does not flag when max_prompt_tokens is set", () => {
    const file = makeJson(baseAssistant({ max_prompt_tokens: 4096 }));
    const findings = runRule("OAI-005", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag non-assistant JSON (no model field)", () => {
    const file = makeJson({ tools: [{ type: "function" }] });
    const findings = runRule("OAI-005", file);
    expect(findings).toHaveLength(0);
  });

  it("provides a fix suggestion", () => {
    const file = makeJson({ model: "gpt-4o" });
    const findings = runRule("OAI-005", file);
    expect(findings[0].fix).toBeDefined();
    expect(findings[0].fix?.after).toContain("max_prompt_tokens");
  });

  it("does not fire on non-OpenAI files", () => {
    // No model field, not a known filename — not an OpenAI file
    const file = makeRaw('{"instructions":"hello"}', "some-other.json");
    const findings = runRule("OAI-005", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── Integration ───────────────────────────────────────────

describe("openaiRules integration", () => {
  it("exports exactly 5 rules", () => {
    expect(openaiRules).toHaveLength(5);
  });

  it("all rules have required fields", () => {
    for (const rule of openaiRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(typeof rule.check).toBe("function");
    }
  });

  it("returns no findings for a clean assistant config", () => {
    const file = makeJson(
      baseAssistant({
        tools: [
          {
            type: "function",
            function: {
              name: "search",
              parameters: {
                type: "object",
                properties: { query: { type: "string" } },
                required: ["query"],
              },
            },
          },
        ],
      })
    );
    const findings = runAll(file);
    expect(findings).toHaveLength(0);
  });

  it("detects multiple issues in one vulnerable config", () => {
    const file = makeRaw(
      JSON.stringify({
        model: "gpt-4o",
        api_key: "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
        tools: [
          { type: "code_interpreter" },
          { type: "file_search" },
          { type: "function", function: { name: "exec", description: "runs code" } },
        ],
        tool_resources: { file_search: { paths: [".env"] } },
      }),
      "assistant.json"
    );
    const findings = runAll(file);
    const ids = new Set(findings.map((f) => f.id.split("-").slice(0, 2).join("-")));
    expect(ids.has("OAI-001")).toBe(true);
    expect(ids.has("OAI-002")).toBe(true);
    expect(ids.has("OAI-003")).toBe(true);
    expect(ids.has("OAI-004")).toBe(true);
    expect(ids.has("OAI-005")).toBe(true);
  });
});
