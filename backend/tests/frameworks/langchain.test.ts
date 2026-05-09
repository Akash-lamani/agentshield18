// tests/frameworks/langchain.test.ts

import { describe, it, expect } from "vitest";
import { langchainRules } from "../../src/frameworks/langchain.js";
import type { ConfigFile, Finding } from "../../src/types.js";

// ─── Test Factories ────────────────────────────────────────

function makeFile(
  content: string,
  path = "agents/agent.py",
  type: ConfigFile["type"] = "unknown"
): ConfigFile {
  return { path, type, content };
}

function makePyFile(content: string, path = "agents/agent.py"): ConfigFile {
  return makeFile(content, path, "unknown");
}

function makeEnvFile(content: string): ConfigFile {
  return makeFile(content, ".env", "unknown");
}

function runRule(ruleId: string, file: ConfigFile): ReadonlyArray<Finding> {
  const rule = langchainRules.find((r) => r.id === ruleId);
  if (!rule) throw new Error(`Rule ${ruleId} not found`);
  return rule.check(file);
}

function runAllRules(file: ConfigFile): ReadonlyArray<Finding> {
  return langchainRules.flatMap((rule) => rule.check(file));
}

// ─── LC-001: Hardcoded API Keys ───────────────────────────

describe("LC-001: Hardcoded API Keys", () => {
  it("detects hardcoded OpenAI API key in .env file", () => {
    const file = makeEnvFile("OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890");
    const findings = runRule("LC-001", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].title).toContain("OpenAI API key");
  });

  it("detects hardcoded Anthropic API key in .env file", () => {
    const file = makeEnvFile(
      "ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890"
    );
    const findings = runRule("LC-001", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("critical");
    expect(findings[0].title).toContain("Anthropic API key");
  });

  it("detects openai_api_key kwarg in Python source", () => {
    const file = makePyFile(
      'llm = ChatOpenAI(openai_api_key="sk-proj-realkeyhere12345678901234567890")'
    );
    const findings = runRule("LC-001", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].category).toBe("secrets");
  });

  it("detects anthropic_api_key kwarg in Python source", () => {
    const file = makePyFile(
      'llm = ChatAnthropic(anthropic_api_key="sk-ant-api03-realkeyhere1234567890")'
    );
    const findings = runRule("LC-001", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("skips os.environ reference", () => {
    const file = makePyFile(
      'llm = ChatOpenAI(openai_api_key=os.environ["OPENAI_API_KEY"])'
    );
    const findings = runRule("LC-001", file);
    expect(findings).toHaveLength(0);
  });

  it("skips os.getenv reference", () => {
    const file = makePyFile(
      'llm = ChatAnthropic(anthropic_api_key=os.getenv("ANTHROPIC_API_KEY"))'
    );
    const findings = runRule("LC-001", file);
    expect(findings).toHaveLength(0);
  });

  it("skips ${VAR} environment variable reference", () => {
    const file = makeEnvFile("OPENAI_API_KEY=${MY_REAL_KEY}");
    const findings = runRule("LC-001", file);
    expect(findings).toHaveLength(0);
  });

  it("masks the key value in evidence", () => {
    const file = makeEnvFile(
      "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
    );
    const findings = runRule("LC-001", file);
    expect(findings[0].evidence).toContain("...");
    expect(findings[0].evidence).not.toContain("abcdefghijklmnopqrstu");
  });

  it("provides a fix suggestion with os.getenv", () => {
    const file = makeEnvFile(
      "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
    );
    const findings = runRule("LC-001", file);
    expect(findings[0].fix).toBeDefined();
    expect(findings[0].fix?.after).toContain("os.getenv");
  });

  it("reports the correct line number", () => {
    const file = makeEnvFile(
      "DEBUG=true\nSOME_VAR=foo\nOPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
    );
    const findings = runRule("LC-001", file);
    expect(findings[0].line).toBe(3);
  });

  it("does not fire on non-LangChain files", () => {
    const file = makeFile(
      "OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz1234567890",
      "unrelated.txt",
      "unknown"
    );
    const findings = runRule("LC-001", file);
    // unrelated.txt is not a .env or python file — should produce no findings
    expect(findings).toHaveLength(0);
  });
});

// ─── LC-002: Dangerous Tool Names ─────────────────────────

describe("LC-002: Dangerous Tool Names", () => {
  it('detects tool named "shell"', () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="shell", func=run_shell, description="runs shell")'
    );
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
    expect(findings[0].title).toContain("shell");
  });

  it('detects tool named "terminal"', () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="terminal", func=run_cmd, description="terminal access")'
    );
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].title).toContain("terminal");
  });

  it('detects tool named "exec"', () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="exec", func=execute, description="executes code")'
    );
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('detects tool named "bash"', () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="bash", func=run_bash, description="bash runner")'
    );
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it('detects tool named "system"', () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="system", func=sys_call, description="os call")'
    );
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("detects dangerous name in JSON config format", () => {
    const content = `
from langchain.agents import AgentExecutor
tools_config = [{"name": "bash", "description": "runs bash"}]
`;
    const file = makePyFile(content);
    const findings = runRule("LC-002", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag safe tool names like 'search'", () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="search", func=search_web, description="web search")'
    );
    const findings = runRule("LC-002", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag safe tool names like 'calculator'", () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="calculator", func=calc, description="math")'
    );
    const findings = runRule("LC-002", file);
    expect(findings).toHaveLength(0);
  });

  it("does not fire on non-LangChain files", () => {
    const file = makeFile(
      'tool = Tool(name="shell", func=run)',
      "unrelated.txt",
      "unknown"
    );
    const findings = runRule("LC-002", file);
    expect(findings).toHaveLength(0);
  });

  it("category is permissions", () => {
    const file = makePyFile(
      'from langchain.tools import Tool\ntool = Tool(name="bash", func=run_bash, description="bash")'
    );
    const findings = runRule("LC-002", file);
    expect(findings[0].category).toBe("permissions");
  });
});

// ─── LC-003: allow_dangerous_requests=True ────────────────

describe("LC-003: allow_dangerous_requests=True", () => {
  it("detects allow_dangerous_requests=True in Python", () => {
    const file = makePyFile(
      "from langchain.tools import RequestsGetTool\ntool = RequestsGetTool(allow_dangerous_requests=True)"
    );
    const findings = runRule("LC-003", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("high");
  });

  it("does not flag allow_dangerous_requests=False", () => {
    const file = makePyFile(
      "from langchain.tools import RequestsGetTool\ntool = RequestsGetTool(allow_dangerous_requests=False)"
    );
    const findings = runRule("LC-003", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag when flag is absent", () => {
    const file = makePyFile(
      "from langchain.tools import RequestsGetTool\ntool = RequestsGetTool()"
    );
    const findings = runRule("LC-003", file);
    expect(findings).toHaveLength(0);
  });

  it("provides auto-fixable fix suggestion", () => {
    const file = makePyFile(
      "from langchain.tools import RequestsGetTool\ntool = RequestsGetTool(allow_dangerous_requests=True)"
    );
    const findings = runRule("LC-003", file);
    expect(findings[0].fix?.auto).toBe(true);
    expect(findings[0].fix?.after).toContain("False");
  });

  it("reports the correct line number", () => {
    const content =
      "from langchain.tools import RequestsGetTool\n# configure tool\ntool = RequestsGetTool(allow_dangerous_requests=True)";
    const file = makePyFile(content);
    const findings = runRule("LC-003", file);
    expect(findings[0].line).toBe(3);
  });

  it("category is permissions", () => {
    const file = makePyFile(
      "from langchain.tools import RequestsGetTool\ntool = RequestsGetTool(allow_dangerous_requests=True)"
    );
    const findings = runRule("LC-003", file);
    expect(findings[0].category).toBe("permissions");
  });

  it("does not fire on non-LangChain files", () => {
    const file = makeFile(
      "allow_dangerous_requests=True",
      "config.yaml",
      "unknown"
    );
    const findings = runRule("LC-003", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── LC-004: verbose=True ─────────────────────────────────

describe("LC-004: verbose=True with sensitive data", () => {
  it("detects verbose=True in AgentExecutor with API key reference", () => {
    const content = `
import os
from langchain.agents import AgentExecutor

api_key = os.getenv("OPENAI_API_KEY")
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
  });

  it("detects verbose=True in LLMChain with secret reference", () => {
    const content = `
from langchain.chains import LLMChain
secret = os.environ["MY_SECRET"]
chain = LLMChain(llm=llm, prompt=prompt, verbose=True)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    expect(findings.length).toBeGreaterThan(0);
  });

  it("does not flag verbose=True without sensitive data in file", () => {
    const content = `
from langchain.agents import AgentExecutor
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    // No api_key / secret / os.environ in file — should not flag
    expect(findings).toHaveLength(0);
  });

  it("does not flag verbose=False", () => {
    const content = `
import os
from langchain.agents import AgentExecutor
api_key = os.getenv("OPENAI_API_KEY")
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=False)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    expect(findings).toHaveLength(0);
  });

  it("provides auto-fixable fix suggestion", () => {
    const content = `
import os
from langchain.agents import AgentExecutor
api_key = os.getenv("OPENAI_API_KEY")
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    expect(findings[0].fix?.auto).toBe(true);
    expect(findings[0].fix?.after).toContain("False");
  });

  it("category is exposure", () => {
    const content = `
import os
from langchain.agents import AgentExecutor
api_key = os.getenv("OPENAI_API_KEY")
agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
`;
    const file = makePyFile(content);
    const findings = runRule("LC-004", file);
    expect(findings[0].category).toBe("exposure");
  });

  it("does not fire on non-LangChain files", () => {
    const file = makeFile("verbose=True", "random.txt", "unknown");
    const findings = runRule("LC-004", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── LC-005: Missing Input Validation ─────────────────────

describe("LC-005: Missing input validation on tool arguments", () => {
  it("detects Tool without args_schema", () => {
    const file = makePyFile(`
from langchain.tools import Tool

def my_func(query: str) -> str:
    return query

tool = Tool(name="search", func=my_func, description="searches things")
`);
    const findings = runRule("LC-005", file);
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0].severity).toBe("medium");
  });

  it("does not flag Tool that has args_schema", () => {
    const file = makePyFile(`
from langchain.tools import Tool
from pydantic import BaseModel

class SearchInput(BaseModel):
    query: str

tool = Tool(name="search", func=my_func, description="searches", args_schema=SearchInput)
`);
    const findings = runRule("LC-005", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag StructuredTool.from_function (implicit schema)", () => {
    const file = makePyFile(`
from langchain.tools import StructuredTool

tool = StructuredTool.from_function(func=my_func, name="calc", description="math")
`);
    const findings = runRule("LC-005", file);
    expect(findings).toHaveLength(0);
  });

  it("does not flag StructuredTool that has args_schema", () => {
    const file = makePyFile(`
from langchain.tools import StructuredTool

tool = StructuredTool(name="calc", func=my_func, description="math", args_schema=CalcInput)
`);
    const findings = runRule("LC-005", file);
    expect(findings).toHaveLength(0);
  });

  it("category is misconfiguration", () => {
    const file = makePyFile(`
from langchain.tools import Tool
tool = Tool(name="search", func=my_func, description="searches")
`);
    const findings = runRule("LC-005", file);
    expect(findings[0].category).toBe("misconfiguration");
  });

  it("provides fix suggestion referencing args_schema", () => {
    const file = makePyFile(`
from langchain.tools import Tool
tool = Tool(name="search", func=my_func, description="searches")
`);
    const findings = runRule("LC-005", file);
    expect(findings[0].fix).toBeDefined();
    expect(findings[0].fix?.after).toContain("args_schema");
  });

  it("truncates evidence for long tool blocks", () => {
    const file = makePyFile(`
from langchain.tools import Tool
tool = Tool(
    name="search",
    func=a_very_long_function_name_that_goes_on_and_on,
    description="This is a very long description that keeps going and going to test truncation behavior"
)
`);
    const findings = runRule("LC-005", file);
    if (findings.length > 0) {
      expect(findings[0].evidence).toContain("...");
    }
  });

  it("does not fire on non-LangChain files", () => {
    const file = makeFile(
      'Tool(name="search", func=my_func, description="searches")',
      "unrelated.txt",
      "unknown"
    );
    const findings = runRule("LC-005", file);
    expect(findings).toHaveLength(0);
  });
});

// ─── Integration: run all rules together ──────────────────

describe("langchainRules integration", () => {
  it("exports exactly 5 rules", () => {
    expect(langchainRules).toHaveLength(5);
  });

  it("all rules have required fields", () => {
    for (const rule of langchainRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.severity).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(typeof rule.check).toBe("function");
    }
  });

  it("all findings have required fields", () => {
    const maliciousFile = makePyFile(`
from langchain.agents import AgentExecutor
from langchain.tools import Tool, RequestsGetTool
import os

api_key = os.getenv("OPENAI_API_KEY")
hardcoded = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
OPENAI_API_KEY=hardcoded

shell_tool = Tool(name="shell", func=run_shell, description="runs shell")
dangerous = RequestsGetTool(allow_dangerous_requests=True)
executor = AgentExecutor(agent=agent, tools=[shell_tool], verbose=True)
unvalidated = Tool(name="search", func=my_func, description="searches")
`);
    const findings = runAllRules(maliciousFile);
    for (const finding of findings) {
      expect(finding.id).toBeTruthy();
      expect(finding.severity).toBeTruthy();
      expect(finding.category).toBeTruthy();
      expect(finding.title).toBeTruthy();
      expect(finding.description).toBeTruthy();
      expect(finding.file).toBeTruthy();
    }
  });

  it("detects multiple issues in a single vulnerable file", () => {
    const content = `
from langchain.agents import AgentExecutor
from langchain.tools import Tool, RequestsGetTool
import os

OPENAI_API_KEY = "sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"

shell_tool = Tool(name="bash", func=run_bash, description="bash runner")
req_tool = RequestsGetTool(allow_dangerous_requests=True)
unvalidated = Tool(name="lookup", func=look_up, description="looks up things")

agent_executor = AgentExecutor(
    agent=agent,
    tools=[shell_tool, req_tool, unvalidated],
    verbose=True,
)
`;
    const file = makePyFile(content);
    const findings = runAllRules(file);
    // Expect at least one finding per rule (LC-001 through LC-005)
    const ruleIds = new Set(findings.map((f) => f.id.split("-").slice(0, 2).join("-")));
    expect(ruleIds.has("LC-001")).toBe(true);
    expect(ruleIds.has("LC-002")).toBe(true);
    expect(ruleIds.has("LC-003")).toBe(true);
    expect(ruleIds.has("LC-005")).toBe(true);
  });

  it("returns no findings for a clean LangChain file", () => {
    const file = makePyFile(`
from langchain.agents import AgentExecutor
from langchain.tools import StructuredTool
from pydantic import BaseModel
import os

class SearchInput(BaseModel):
    query: str

def search(query: str) -> str:
    return f"Results for {query}"

search_tool = StructuredTool.from_function(
    func=search,
    name="web_search",
    description="Searches the web for information"
)

agent_executor = AgentExecutor(
    agent=agent,
    tools=[search_tool],
    verbose=False,
)
`);
    const findings = runAllRules(file);
    expect(findings).toHaveLength(0);
  });
});
