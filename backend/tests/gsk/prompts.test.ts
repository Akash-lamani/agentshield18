// tests/gsk/prompts.test.ts

import { describe, it, expect } from "vitest";
import {
  ATTACKER_SYSTEM_PROMPT,
  DEFENDER_SYSTEM_PROMPT,
  AUDITOR_SYSTEM_PROMPT,
  GSK_AGENTS,
} from "../../src/gsk/prompts.js";

describe("ATTACKER_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof ATTACKER_SYSTEM_PROMPT).toBe("string");
    expect(ATTACKER_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("mentions red team perspective", () => {
    expect(ATTACKER_SYSTEM_PROMPT.toLowerCase()).toMatch(/red.?team|attacker|adversar/);
  });

  it("mentions severity ratings", () => {
    expect(ATTACKER_SYSTEM_PROMPT).toContain("CRITICAL");
    expect(ATTACKER_SYSTEM_PROMPT).toContain("HIGH");
    expect(ATTACKER_SYSTEM_PROMPT).toContain("MEDIUM");
    expect(ATTACKER_SYSTEM_PROMPT).toContain("LOW");
  });

  it("mentions config line reference", () => {
    expect(ATTACKER_SYSTEM_PROMPT.toLowerCase()).toMatch(/config|exact|line|field/);
  });

  it("covers secrets as an attack vector", () => {
    expect(ATTACKER_SYSTEM_PROMPT.toLowerCase()).toMatch(/secret|api.?key|hardcoded/);
  });

  it("covers prompt injection", () => {
    expect(ATTACKER_SYSTEM_PROMPT.toLowerCase()).toContain("prompt injection");
  });
});

describe("DEFENDER_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof DEFENDER_SYSTEM_PROMPT).toBe("string");
    expect(DEFENDER_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("mentions blue team perspective", () => {
    expect(DEFENDER_SYSTEM_PROMPT.toLowerCase()).toMatch(/blue.?team|defender|mitigation/);
  });

  it("asks for concrete mitigations", () => {
    expect(DEFENDER_SYSTEM_PROMPT.toLowerCase()).toMatch(/concrete|exact|actionable/);
  });

  it("prioritizes by ease-of-fix vs impact", () => {
    expect(DEFENDER_SYSTEM_PROMPT.toLowerCase()).toMatch(/prioriti|ease.of.fix|impact/);
  });

  it("mentions immediate fixes section", () => {
    expect(DEFENDER_SYSTEM_PROMPT).toMatch(/IMMEDIATE FIXES/);
  });

  it("mentions remediation priority", () => {
    expect(DEFENDER_SYSTEM_PROMPT).toMatch(/REMEDIATION PRIORITY/);
  });
});

describe("AUDITOR_SYSTEM_PROMPT", () => {
  it("is a non-empty string", () => {
    expect(typeof AUDITOR_SYSTEM_PROMPT).toBe("string");
    expect(AUDITOR_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it("mentions independent/auditor role", () => {
    expect(AUDITOR_SYSTEM_PROMPT.toLowerCase()).toMatch(/audit|independent|impartial/);
  });

  it("defines risk rating scale", () => {
    expect(AUDITOR_SYSTEM_PROMPT).toContain("RISK RATING SCALE");
    expect(AUDITOR_SYSTEM_PROMPT).toContain("CRITICAL");
    expect(AUDITOR_SYSTEM_PROMPT).toContain("MINIMAL");
  });

  it("asks for final risk rating output", () => {
    expect(AUDITOR_SYSTEM_PROMPT).toContain("FINAL RISK RATING");
  });

  it("asks for top 3 findings", () => {
    expect(AUDITOR_SYSTEM_PROMPT).toMatch(/TOP 3 FINDINGS/);
  });

  it("includes deployment recommendation", () => {
    expect(AUDITOR_SYSTEM_PROMPT).toContain("DEPLOYMENT RECOMMENDATION");
    expect(AUDITOR_SYSTEM_PROMPT).toContain("BLOCK");
    expect(AUDITOR_SYSTEM_PROMPT).toContain("APPROVE");
  });

  it("asks auditor to flag insufficient mitigations", () => {
    expect(AUDITOR_SYSTEM_PROMPT).toMatch(/INSUFFICIENT|inadequate|missed/i);
  });
});

describe("GSK_AGENTS", () => {
  it("has exactly 3 agents", () => {
    expect(GSK_AGENTS).toHaveLength(3);
  });

  it("has attacker, defender, auditor in that order", () => {
    expect(GSK_AGENTS[0]?.id).toBe("attacker");
    expect(GSK_AGENTS[1]?.id).toBe("defender");
    expect(GSK_AGENTS[2]?.id).toBe("auditor");
  });

  it("each agent has required fields", () => {
    for (const agent of GSK_AGENTS) {
      expect(agent.id).toBeTruthy();
      expect(agent.emoji).toBeTruthy();
      expect(agent.displayName).toBeTruthy();
      expect(agent.systemPrompt).toBeTruthy();
      expect(agent.systemPrompt.length).toBeGreaterThan(100);
    }
  });

  it("attacker has red emoji", () => {
    expect(GSK_AGENTS[0]?.emoji).toContain("🔴");
  });

  it("defender has blue emoji", () => {
    expect(GSK_AGENTS[1]?.emoji).toContain("🔵");
  });

  it("auditor has scales emoji", () => {
    expect(GSK_AGENTS[2]?.emoji).toContain("⚖️");
  });

  it("system prompts are the canonical constants", () => {
    expect(GSK_AGENTS[0]?.systemPrompt).toBe(ATTACKER_SYSTEM_PROMPT);
    expect(GSK_AGENTS[1]?.systemPrompt).toBe(DEFENDER_SYSTEM_PROMPT);
    expect(GSK_AGENTS[2]?.systemPrompt).toBe(AUDITOR_SYSTEM_PROMPT);
  });

  it("all agent IDs are unique", () => {
    const ids = GSK_AGENTS.map((a) => a.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("all display names are uppercase", () => {
    for (const agent of GSK_AGENTS) {
      expect(agent.displayName).toBe(agent.displayName.toUpperCase());
    }
  });
});
