// tests/gsk/render.test.ts

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

// ─── Helpers ──────────────────────────────────────────────

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

// ─── Key helpers ──────────────────────────────────────────

const FAKE_KEY = "gsk-test-key-fake";
function setFakeKey(): void  { process.env["GSK_API_KEY"] = FAKE_KEY; }
function clearKey(): void    { delete process.env["GSK_API_KEY"]; }

// ─── Mock fetch ───────────────────────────────────────────

function emptyStreamResponse(): Response {
  const stream = new ReadableStream<Uint8Array>({ start(c) { c.close(); } });
  return new Response(stream, { status: 200 });
}

function mockFetch() {
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (): Promise<Response> => emptyStreamResponse());
}

// ─── Setup ────────────────────────────────────────────────

beforeEach(() => {
  setFakeKey();
  mockFetch();
});

afterEach(() => {
  clearKey();
  vi.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────

describe("runGSKPipeline", () => {

  // 1. Runs without crashing ────────────────────────────────
  describe("runs without crashing", () => {
    it("resolves for a single finding", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await expect(runGSKPipeline(makeReport([makeFinding()]))).resolves.toBeUndefined();
      expect(cap.flush().length).toBeGreaterThan(0);
    });

    it("throws when GSK_API_KEY is missing", async () => {
      clearKey();
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await expect(runGSKPipeline(makeReport())).rejects.toThrow(/GSK_API_KEY/);
    });

    it("calls fetch exactly 3 times (one per agent)", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
    });

    it("sends requests to Gemini endpoint", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      for (const call of vi.mocked(globalThis.fetch).mock.calls) {
        expect(call[0]).toBe(
          "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        );
      }
    });

    it("sends gemini-2.5-pro as the model", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      for (const call of vi.mocked(globalThis.fetch).mock.calls) {
        const body = JSON.parse((call[1] as RequestInit).body as string) as { model: string };
        expect(body.model).toBe("gemini-2.5-pro");
      }
    });
  });

  // 2. Handles empty findings ───────────────────────────────
  describe("empty findings", () => {
    it("resolves without error for zero findings", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await expect(runGSKPipeline(makeReport([]))).resolves.toBeUndefined();
    });

    it("still prints header with empty findings", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([]));
      expect(cap.flush()).toContain("AgentShield Deep Analysis");
    });

    it("calls fetch 3 times with empty findings", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([]));
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
    });

    it("includes zero counts in user prompt", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([]));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      const user = body.messages.find((m) => m.role === "user")?.content ?? "";
      expect(user).toContain("0");
    });
  });

  // 3. Handles multiple findings ────────────────────────────
  describe("multiple findings", () => {
    const manyFindings: ReadonlyArray<Finding> = [
      makeFinding({ id: "f1", severity: "critical", title: "Hardcoded API key",        category: "secrets" }),
      makeFinding({ id: "f2", severity: "high",     title: "Dangerous tool: shell",    category: "permissions" }),
      makeFinding({ id: "f3", severity: "high",     title: "allow_dangerous_requests", category: "permissions" }),
      makeFinding({ id: "f4", severity: "medium",   title: "verbose=True exposure",    category: "exposure" }),
      makeFinding({ id: "f5", severity: "low",      title: "Missing args_schema",      category: "misconfiguration" }),
    ];

    it("resolves for multiple findings", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await expect(runGSKPipeline(makeReport(manyFindings))).resolves.toBeUndefined();
    });

    it("includes finding titles in the attacker prompt", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport(manyFindings));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      const user = body.messages.find((m) => m.role === "user")?.content ?? "";
      expect(user).toContain("Hardcoded API key");
    });

    it("calls fetch 3 times for many findings", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport(manyFindings));
      expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
    });

    it("includes finding count in the summary", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport(manyFindings));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      const user = body.messages.find((m) => m.role === "user")?.content ?? "";
      expect(user).toContain("5");
    });
  });

  // 4. Output contains ATTACKER/DEFENDER/AUDITOR labels ─────
  describe("section labels", () => {
    it("prints ATTACKER label", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).toContain("ATTACKER");
    });

    it("prints DEFENDER label", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).toContain("DEFENDER");
    });

    it("prints AUDITOR label", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).toContain("AUDITOR");
    });

    it("prints the GSK pipeline header", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      const out = cap.flush();
      expect(out).toContain("AgentShield Deep Analysis");
      expect(out).toContain("GSK Pipeline");
    });

    it("prints a progress bar", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).toMatch(/\d+%/);
    });

    it("prints the GSK summary box", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).toContain("AgentShield GSK Analysis Summary");
    });

    it("uses attacker system prompt for first API call", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const { ATTACKER_SYSTEM_PROMPT } = await import("../../src/gsk/prompts.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[0]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      expect(body.messages.find((m) => m.role === "system")?.content).toBe(ATTACKER_SYSTEM_PROMPT);
    });

    it("uses defender system prompt for second API call", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const { DEFENDER_SYSTEM_PROMPT } = await import("../../src/gsk/prompts.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[1]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      expect(body.messages.find((m) => m.role === "system")?.content).toBe(DEFENDER_SYSTEM_PROMPT);
    });

    it("uses auditor system prompt for third API call", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const { AUDITOR_SYSTEM_PROMPT } = await import("../../src/gsk/prompts.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      const spy = vi.mocked(globalThis.fetch);
      const body = JSON.parse((spy.mock.calls[2]?.[1] as RequestInit).body as string) as {
        messages: ReadonlyArray<{ role: string; content: string }>;
      };
      expect(body.messages.find((m) => m.role === "system")?.content).toBe(AUDITOR_SYSTEM_PROMPT);
    });
  });

  // 5. No secrets appear in output ─────────────────────────
  describe("secret safety", () => {
    it("does not print GSK_API_KEY value to stdout", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      expect(cap.flush()).not.toContain(FAKE_KEY);
    });

    it("does not include GSK_API_KEY in request bodies", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      for (const call of vi.mocked(globalThis.fetch).mock.calls) {
        expect((call[1] as RequestInit).body as string).not.toContain(FAKE_KEY);
      }
    });

    it("puts GSK_API_KEY only in Authorization header", async () => {
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      captureStdout();
      await runGSKPipeline(makeReport([makeFinding()]));
      for (const call of vi.mocked(globalThis.fetch).mock.calls) {
        const headers = (call[1] as RequestInit).headers as Record<string, string>;
        expect(headers["Authorization"]).toBe(`Bearer ${FAKE_KEY}`);
        expect((call[1] as RequestInit).body as string).not.toContain(FAKE_KEY);
      }
    });

    it("does not echo raw evidence values to stdout", async () => {
      const rawEvidence = "VERY_SECRET_EVIDENCE_12345";
      const { runGSKPipeline } = await import("../../src/gsk/render.js");
      const cap = captureStdout();
      await runGSKPipeline(makeReport([makeFinding({ evidence: rawEvidence })]));
      expect(cap.flush()).not.toContain(rawEvidence);
    });
  });
});

// ─── Backward-compat: runGrokPipeline alias ───────────────

describe("backward-compat runGrokPipeline alias", () => {
  it("runGrokPipeline is exported from gsk/render for compat", async () => {
    const mod = await import("../../src/gsk/render.js");
    expect(typeof mod.runGrokPipeline).toBe("function");
  });

  it("runGrokPipeline === runGSKPipeline (same function)", async () => {
    const { runGrokPipeline, runGSKPipeline } = await import("../../src/gsk/render.js");
    expect(runGrokPipeline).toBe(runGSKPipeline);
  });
});
