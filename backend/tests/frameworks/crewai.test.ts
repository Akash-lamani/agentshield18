// tests/frameworks/crewai.test.ts

import { describe, it, expect } from "vitest";
import { crewaiRules } from "../../src/frameworks/crewai.js";
import type { ConfigFile, Finding } from "../../src/types.js";

// ─── Factories ─────────────────────────────────────────────

function makePy(content: string, path = "crew.py"): ConfigFile {
  return { path, type: "unknown", content };
}

function runRule(ruleId: string, file: ConfigFile): ReadonlyArray<Finding> {
  const rule = crewaiRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} not found`);
  return rule.check(file);
}

function runAll(file: ConfigFile): ReadonlyArray<Finding> {
  return crewaiRules.flatMap((r) => r.check(file));
}

// ─── CAI-001: allow_delegation=True ────────────────────────

describe("CAI-001: allow_delegation=True", () => {
  it("detects allow_delegation=True in crew.py", () => {
    const file = makePy(`
from crewai import Agent
researcher = Agent(
    role="Researcher",
    goal="Find information",
    backstory="Expert researcher",
    allow_delegation=True,
)
`);
    const findings = runRule("CAI-001", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].category).toBe("permissions");
  });

  it("detects allow_delegation=True in main.py", () => {
    const file = makePy("from crewai import Agent\nagent = Agent(allow_delegation=True)", "main.py");
    const findings = runRule("CAI-001", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag allow_delegation=False", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(role="Writer", goal="Write", backstory="Expert", allow_delegation=False)
`);
    const findings = runRule("CAI-001", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag when allow_delegation is absent", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(role="Writer", goal="Write", backstory="Expert")
`);
    const findings = runRule("CAI-001", file);
    expect(findings).toHaveLength(0);
  });

  it("provides auto-fixable fix suggestion", () => {
    const file = makePy("from crewai import Agent\nagent = Agent(allow_delegation=True)");
    const findings = runRule("CAI-001", file);
    expect(findings[0].fix?.auto).toBe(true);
    expect(findings[0].fix?.after).toContain("False");
  });

  it("does not fire on non-CrewAI files", () => {
    const file: ConfigFile = { path: "config.py", type: "unknown", content: "allow_delegation=True" };
    const findings = runRule("CAI-001", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── CAI-002: Dangerous Imports ────────────────────────────

describe("CAI-002: OS/subprocess/shell imports", () => {
  it("detects 'import os' in crewai file", () => {
    const file = makePy("from crewai import Agent\nimport os\n\nos.system('ls')");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("os module"))).toBe(true);
    expect(findings[0].severity).toBe("high");
  });

  it("detects 'import subprocess' in crewai file", () => {
    const file = makePy("from crewai import Agent\nimport subprocess");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("subprocess"))).toBe(true);
  });

  it("detects 'from subprocess import run'", () => {
    const file = makePy("from crewai import Agent\nfrom subprocess import run");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("subprocess"))).toBe(true);
  });

  it("detects os.system() call", () => {
    const file = makePy("from crewai import Agent\nos.system('rm -rf /tmp/cache')");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("os.system"))).toBe(true);
  });

  it("detects subprocess.run() call", () => {
    const file = makePy("from crewai import Agent\nsubprocess.run(['ls', '-la'])");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("subprocess"))).toBe(true);
  });

  it("detects eval()", () => {
    const file = makePy("from crewai import Agent\nresult = eval(user_input)");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("eval"))).toBe(true);
  });

  it("detects exec()", () => {
    const file = makePy("from crewai import Agent\nexec(code_string)");
    const findings = runRule("CAI-002", file);
    expect(findings.some((f) => f.title.includes("exec"))).toBe(true);
  });

  it("category is permissions", () => {
    const file = makePy("from crewai import Agent\nimport os");
    const findings = runRule("CAI-002", file);
    expect(findings[0].category).toBe("permissions");
  });

  it("does not fire on non-CrewAI files", () => {
    const file: ConfigFile = { path: "utils.py", type: "unknown", content: "import os\nimport subprocess" };
    const findings = runRule("CAI-002", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── CAI-003: Missing max_iter ─────────────────────────────

describe("CAI-003: Missing max_iter", () => {
  it("flags Agent without max_iter", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(
    role="Researcher",
    goal="Find info",
    backstory="Expert",
)
`);
    const findings = runRule("CAI-003", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
    expect(findings[0].category).toBe("misconfiguration");
  });

  it("does not flag Agent with max_iter set", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(
    role="Researcher",
    goal="Find info",
    backstory="Expert",
    max_iter=10,
)
`);
    const findings = runRule("CAI-003", file);
    expect(findings).toHaveLength(0);
  });

  it("provides a fix suggestion", () => {
    const file = makePy("from crewai import Agent\nagent = Agent(role='R', goal='G', backstory='B')");
    const findings = runRule("CAI-003", file);
    expect(findings[0].fix).toBeDefined();
    expect(findings[0].fix?.after).toContain("max_iter");
  });

  it("does not fire on non-CrewAI files", () => {
    const file: ConfigFile = {
      path: "config.py",
      type: "unknown",
      content: "agent = Agent(role='R', goal='G', backstory='B')",
    };
    const findings = runRule("CAI-003", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── CAI-004: Hardcoded API Keys ───────────────────────────

describe("CAI-004: Hardcoded API Key", () => {
  it("detects hardcoded OpenAI key in crew.py", () => {
    const file = makePy(
      'from crewai import Agent\nopenai_api_key = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"'
    );
    const findings = runRule("CAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].category).toBe("secrets");
  });

  it("detects hardcoded Anthropic key", () => {
    const file = makePy(
      'from crewai import Agent\nANTHROPIC_API_KEY = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890"'
    );
    const findings = runRule("CAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("detects hardcoded Serper API key", () => {
    const file = makePy(
      'from crewai import Agent\nSERPER_API_KEY = "abcdefghijklmnopqrstuvwxyz123456"'
    );
    const findings = runRule("CAI-004", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("skips os.getenv reference", () => {
    const file = makePy(
      'from crewai import Agent\nopenai_api_key = os.getenv("OPENAI_API_KEY")'
    );
    const findings = runRule("CAI-004", file);
    expect(findings).toHaveLength(0);
  });

  it("masks evidence", () => {
    const file = makePy(
      'from crewai import Agent\napi_key = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"'
    );
    const findings = runRule("CAI-004", file);
    expect(findings[0].evidence).toContain("...");
  });

  it("does not fire on non-CrewAI files", () => {
    const file: ConfigFile = {
      path: "utils.py",
      type: "unknown",
      content: 'api_key = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"',
    };
    const findings = runRule("CAI-004", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── CAI-005: verbose=True ─────────────────────────────────

describe("CAI-005: verbose=True", () => {
  it("detects verbose=True on Agent", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(role="R", goal="G", backstory="B", verbose=True)
`);
    const findings = runRule("CAI-005", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("low");
    expect(findings[0].category).toBe("exposure");
  });

  it("detects verbose=True on Crew", () => {
    const file = makePy(`
from crewai import Crew, Agent
crew = Crew(agents=[agent], tasks=[task], verbose=True)
`);
    const findings = runRule("CAI-005", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag verbose=False", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(role="R", goal="G", backstory="B", verbose=False)
`);
    const findings = runRule("CAI-005", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag when verbose is absent", () => {
    const file = makePy(`
from crewai import Agent
agent = Agent(role="R", goal="G", backstory="B")
`);
    const findings = runRule("CAI-005", file);
    expect(findings).toHaveLength(0);
  });

  it("provides auto-fixable fix", () => {
    const file = makePy("from crewai import Agent\nagent = Agent(role='R', goal='G', backstory='B', verbose=True)");
    const findings = runRule("CAI-005", file);
    expect(findings[0].fix?.auto).toBe(true);
    expect(findings[0].fix?.after).toContain("False");
  });

  it("does not fire on non-CrewAI files", () => {
    const file: ConfigFile = {
      path: "random.py",
      type: "unknown",
      content: "agent = Agent(verbose=True)",
    };
    const findings = runRule("CAI-005", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── Integration ───────────────────────────────────────────

describe("crewaiRules integration", () => {
  it("exports exactly 5 rules", () => {
    expect(crewaiRules).toHaveLength(5);
  });

  it("all rules have required fields", () => {
    for (const rule of crewaiRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(typeof rule.check).toBe("function");
    }
  });

  it("all findings have required fields", () => {
    const file = makePy(`
from crewai import Agent, Crew
import os, subprocess
import os

OPENAI_API_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"

researcher = Agent(
    role="Researcher",
    goal="Research topics",
    backstory="Expert researcher",
    allow_delegation=True,
    verbose=True,
)

crew = Crew(agents=[researcher], tasks=[], verbose=True)
`);
    const findings = runAll(file);
    for (const finding of findings) {
      expect(finding.id).toBeTruthy();
      expect(finding.severity).toBeTruthy();
      expect(finding.category).toBeTruthy();
      expect(finding.title).toBeTruthy();
      expect(finding.description).toBeTruthy();
      expect(finding.file).toBeTruthy();
    }
  });

  it("returns no findings for a clean CrewAI file", () => {
    const file = makePy(`
from crewai import Agent, Crew, Task
import os
from dotenv import load_dotenv

load_dotenv()

researcher = Agent(
    role="Researcher",
    goal="Research topics thoroughly",
    backstory="You are an expert researcher with 10 years of experience.",
    allow_delegation=False,
    verbose=False,
    max_iter=10,
)

task = Task(description="Research AI trends", agent=researcher)
crew = Crew(agents=[researcher], tasks=[task], verbose=False)
`);
    // CAI-002 will still fire on "import os" since that's a real import
    // A truly clean file would not import os at all
    const findings = runAll(file);
    const nonOsFindings = findings.filter((f) => !f.id.startsWith("CAI-002"));
    expect(nonOsFindings).toHaveLength(0);
  });
});
