// tests/grok/render.test.ts
//
// Tests for the grok/render.ts backward-compatibility shim.
// The shim re-exports from src/gsk/render.ts, so we verify:
//   1. The shim exports runGrokPipeline (alias for runGSKPipeline)
//   2. It still works end-to-end (provider is now Gemini / GSK_API_KEY)
//
// For the full GSK test suite see tests/gsk/render.test.ts.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Finding, SecurityReport } from "../../src/types.js";

// ─── Factories ────────────────────────────────────────────

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: "LC-001-0",
    severity: "critical",
    category: "secrets",
    title: "Hardcoded OpenAI API key",
    description: "Found a hardcoded API key in agent source",
    file: "agents/agent.py",
    evidence: "sk-proj-abc...1234",
    ...overrides,
  };
}

function makeReport(
  findings: ReadonlyArray<Finding> = [],
  overrides: Partial<SecurityReport> = {}
): SecurityReport {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    targetPath: "/tmp/test-agent",
    score: {
      grade: "C",
      numericScore: 55,
      breakdown: { secrets: 40, permissions: 60, hooks: 70, mcp: 80, agents: 50 },
    },
    summary: {
      totalFindings: findings.length,
      critical:  findings.filter((f) => f.severity === "critical").length,
      high:      findings.filter((f) => f.severity === "high").length,
      medium:    findings.filter((f) => f.severity === "medium").length,
      low:       findings.filter((f) => f.severity === "low").length,
      info:      findings.filter((f) => f.severity === "info").length,
      filesScanned: 3,
      autoFixable: findings.filter((f) => f.fix?.auto).length,
    },
    findings,
    ...overrides,
  };
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, "");
}

function captureStdout(): { flush: () => string } {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation(
    (chunk: string | Uint8Array): boolean => {
      chunks.push(typeof chunk === "string" ? chunk : chunk.toString("utf-8"));
      return true;
    }
  );
  return { flush: () => stripAnsi(chunks.join("")) };
}

function emptyStreamResponse(): Response {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.close(); } });
  return new Response(stream, { status: 200 });
}

beforeEach(() => {
  // New env var: GSK_API_KEY (replaces XAI_API_KEY)
  process.env["GSK_API_KEY"] = "gsk-test-key-fake";
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async (): Promise<Response> => emptyStreamResponse()
  );
});

afterEach(() => {
  delete process.env["GSK_API_KEY"];
  vi.restoreAllMocks();
});

// ─── Shim export shape ────────────────────────────────────

describe("grok/render.ts backward-compat shim", () => {
  it("exports runGrokPipeline (alias for runGSKPipeline)", async () => {
    const mod = await import("../../src/grok/render.js");
    expect(typeof mod.runGrokPipeline).toBe("function");
  });

  it("runGrokPipeline resolves without error", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await expect(runGrokPipeline(makeReport([makeFinding()]))).resolves.toBeUndefined();
  });

  it("throws when GSK_API_KEY is missing (not XAI_API_KEY)", async () => {
    delete process.env["GSK_API_KEY"];
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await expect(runGrokPipeline(makeReport())).rejects.toThrow(/GSK_API_KEY/);
  });

  it("calls fetch 3 times via the shim", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
  });

  it("uses Gemini endpoint (not api.x.ai)", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    for (const call of vi.mocked(globalThis.fetch).mock.calls) {
      expect(call[0]).toContain("generativelanguage.googleapis.com");
      expect(call[0]).not.toContain("x.ai");
    }
  });

  it("uses gemini-2.5-pro model (not grok-3)", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    for (const call of vi.mocked(globalThis.fetch).mock.calls) {
      const body = JSON.parse((call[1] as RequestInit).body as string) as { model: string };
      expect(body.model).toBe("gemini-2.5-pro");
      expect(body.model).not.toContain("grok");
    }
  });

  it("still prints ATTACKER/DEFENDER/AUDITOR labels", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    const cap = captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    const out = cap.flush();
    expect(out).toContain("ATTACKER");
    expect(out).toContain("DEFENDER");
    expect(out).toContain("AUDITOR");
  });

  it("handles empty findings via the shim", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await expect(runGrokPipeline(makeReport([]))).resolves.toBeUndefined();
  });

  it("handles multiple findings via the shim", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    const findings: ReadonlyArray<Finding> = [
      makeFinding({ id: "f1", severity: "critical", title: "Key leak" }),
      makeFinding({ id: "f2", severity: "high",     title: "Shell tool" }),
      makeFinding({ id: "f3", severity: "medium",   title: "verbose=True" }),
    ];
    await expect(runGrokPipeline(makeReport(findings))).resolves.toBeUndefined();
  });

  it("does not expose GSK_API_KEY in stdout", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    const cap = captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    expect(cap.flush()).not.toContain("gsk-test-key-fake");
  });

  it("does not expose GSK_API_KEY in request bodies", async () => {
    const { runGrokPipeline } = await import("../../src/grok/render.js");
    captureStdout();
    await runGrokPipeline(makeReport([makeFinding()]));
    for (const call of vi.mocked(globalThis.fetch).mock.calls) {
      expect((call[1] as RequestInit).body as string).not.toContain("gsk-test-key-fake");
    }
  });
});

// ─── grok/prompts.ts shim ────────────────────────────────

describe("grok/prompts.ts backward-compat shim", () => {
  it("re-exports GROK_AGENTS from gsk/prompts", async () => {
    const { GROK_AGENTS } = await import("../../src/grok/prompts.js");
    expect(GROK_AGENTS).toHaveLength(3);
    expect(GROK_AGENTS[0]?.id).toBe("attacker");
    expect(GROK_AGENTS[1]?.id).toBe("defender");
    expect(GROK_AGENTS[2]?.id).toBe("auditor");
  });

  it("GROK_AGENTS === GSK_AGENTS (same reference)", async () => {
    const { GROK_AGENTS } = await import("../../src/grok/prompts.js");
    const { GSK_AGENTS } = await import("../../src/gsk/prompts.js");
    expect(GROK_AGENTS).toBe(GSK_AGENTS);
  });

  it("re-exports ATTACKER/DEFENDER/AUDITOR system prompts", async () => {
    const { ATTACKER_SYSTEM_PROMPT, DEFENDER_SYSTEM_PROMPT, AUDITOR_SYSTEM_PROMPT } =
      await import("../../src/grok/prompts.js");
    expect(typeof ATTACKER_SYSTEM_PROMPT).toBe("string");
    expect(typeof DEFENDER_SYSTEM_PROMPT).toBe("string");
    expect(typeof AUDITOR_SYSTEM_PROMPT).toBe("string");
  });
});
