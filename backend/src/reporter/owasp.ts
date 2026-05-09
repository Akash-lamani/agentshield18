/**
 * OWASP LLM Top 10 mappings for AgentShield findings.
 * Based on OWASP Top 10 for LLM Applications 2025.
 */

export interface OWASPMapping {
  readonly id: string;
  readonly name: string;
  readonly url: string;
}

const OWASP_LLM_2025: Record<string, OWASPMapping> = {
  "LLM01": {
    id: "LLM01:2025",
    name: "Prompt Injection",
    url: "https://genai.owasp.org/llmrisk/llm01-prompt-injection/",
  },
  "LLM02": {
    id: "LLM02:2025",
    name: "Sensitive Information Disclosure",
    url: "https://genai.owasp.org/llmrisk/llm02-sensitive-information-disclosure/",
  },
  "LLM03": {
    id: "LLM03:2025",
    name: "Supply Chain Vulnerabilities",
    url: "https://genai.owasp.org/llmrisk/llm03-supply-chain/",
  },
  "LLM04": {
    id: "LLM04:2025",
    name: "Data and Model Poisoning",
    url: "https://genai.owasp.org/llmrisk/llm04-data-model-poisoning/",
  },
  "LLM05": {
    id: "LLM05:2025",
    name: "Improper Output Handling",
    url: "https://genai.owasp.org/llmrisk/llm05-improper-output-handling/",
  },
  "LLM06": {
    id: "LLM06:2025",
    name: "Excessive Agency",
    url: "https://genai.owasp.org/llmrisk/llm06-excessive-agency/",
  },
  "LLM07": {
    id: "LLM07:2025",
    name: "System Prompt Leakage",
    url: "https://genai.owasp.org/llmrisk/llm07-system-prompt-leakage/",
  },
  "LLM08": {
    id: "LLM08:2025",
    name: "Vector and Embedding Weaknesses",
    url: "https://genai.owasp.org/llmrisk/llm08-vector-and-embedding-weaknesses/",
  },
  "LLM09": {
    id: "LLM09:2025",
    name: "Misinformation",
    url: "https://genai.owasp.org/llmrisk/llm09-misinformation/",
  },
  "LLM10": {
    id: "LLM10:2025",
    name: "Unbounded Consumption",
    url: "https://genai.owasp.org/llmrisk/llm10-unbounded-consumption/",
  },
};

/** Maps AgentShield finding categories to OWASP LLM Top 10 IDs */
const CATEGORY_TO_OWASP: Record<string, readonly string[]> = {
  "injection":         ["LLM01", "LLM05"],
  "prompt-injection":  ["LLM01"],
  "secret":            ["LLM02"],
  "secrets":           ["LLM02"],
  "supply-chain":      ["LLM03"],
  "misconfiguration":  ["LLM06", "LLM10"],
  "permissions":       ["LLM06"],
  "hook":              ["LLM06", "LLM05"],
  "mcp":               ["LLM03", "LLM06"],
  "agent":             ["LLM06"],
  "data-exfiltration": ["LLM02", "LLM05"],
  "taint":             ["LLM01", "LLM04"],
};

/** Returns OWASP mappings for a given finding category and title. */
export function getOWASPMappings(
  category: string,
  title: string,
): ReadonlyArray<OWASPMapping> {
  const lcat = category.toLowerCase();
  const ltitle = title.toLowerCase();

  const ids = new Set<string>();

  // Category match
  for (const [key, mappedIds] of Object.entries(CATEGORY_TO_OWASP)) {
    if (lcat.includes(key)) {
      for (const id of mappedIds) ids.add(id);
    }
  }

  // Title keyword match
  if (ltitle.includes("secret") || ltitle.includes("api key") || ltitle.includes("token") || ltitle.includes("password")) {
    ids.add("LLM02");
  }
  if (ltitle.includes("injection") || ltitle.includes("prompt")) {
    ids.add("LLM01");
  }
  if (ltitle.includes("permission") || ltitle.includes("allow") || ltitle.includes("wildcard") || ltitle.includes("bash")) {
    ids.add("LLM06");
  }
  if (ltitle.includes("hook") || ltitle.includes("curl") || ltitle.includes("exfil")) {
    ids.add("LLM05");
    ids.add("LLM06");
  }
  if (ltitle.includes("supply") || ltitle.includes("npm") || ltitle.includes("package") || ltitle.includes("mcp")) {
    ids.add("LLM03");
  }

  if (ids.size === 0) ids.add("LLM06"); // fallback

  return [...ids].sort().map((id) => OWASP_LLM_2025[id]).filter(Boolean);
}
