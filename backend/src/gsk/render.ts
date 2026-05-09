// src/gsk/render.ts

/**
 * GSK (Gemini Security Kit) deep-analysis pipeline for AgentShield.
 *
 * Three agents run sequentially:
 *   🔴 ATTACKER  — finds every exploit path
 *   🔵 DEFENDER  — proposes concrete mitigations
 *   ⚖️  AUDITOR   — renders the final verdict
 *
 * Each agent's response streams word-by-word to the terminal.
 *
 * Provider: Google Gemini via OpenAI-compatible REST API
 * Endpoint: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
 * Model:    gemini-2.5-pro
 * Auth:     Authorization: Bearer ${GSK_API_KEY}
 */

import type { SecurityReport } from "../types.js";
import {
  GSK_AGENTS,
  type GSKAgentLabel,
} from "./prompts.js";

// ─── Types ────────────────────────────────────────────────

interface GSKMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

interface GSKStreamChunk {
  readonly choices?: ReadonlyArray<{
    readonly delta?: {
      readonly content?: string;
    };
    readonly finish_reason?: string | null;
  }>;
}

interface GSKAgentResult {
  readonly agentId: "attacker" | "defender" | "auditor";
  readonly text: string;
}

// ─── Constants ────────────────────────────────────────────

/**
 * Google Gemini OpenAI-compatible endpoint.
 * Docs: https://ai.google.dev/gemini-api/docs/openai
 */
const GSK_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const GSK_MODEL = "gemini-2.5-pro";
const MAX_TOKENS = 2048;
const WORD_DELAY_MS = 18; // ms between words for typing effect

// ─── ANSI color helpers (no external deps) ───────────────

const RESET   = "\x1b[0m";
const BOLD    = "\x1b[1m";
const DIM     = "\x1b[2m";
const RED     = "\x1b[31m";
const BLUE    = "\x1b[34m";
const YELLOW  = "\x1b[33m";
const CYAN    = "\x1b[36m";
const GREEN   = "\x1b[32m";
const WHITE   = "\x1b[37m";
const BG_DARK = "\x1b[40m";

function color(code: string, text: string): string {
  return `${code}${text}${RESET}`;
}

function agentColor(agentId: GSKAgentLabel["id"]): string {
  switch (agentId) {
    case "attacker": return RED;
    case "defender": return BLUE;
    case "auditor":  return YELLOW;
  }
}

// ─── Progress bar ─────────────────────────────────────────

function renderProgressBar(
  current: number,
  total: number,
  width = 30
): string {
  const pct = current / total;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pctLabel = String(Math.round(pct * 100)).padStart(3, " ") + "%";
  return `${DIM}[${RESET}${CYAN}${bar}${RESET}${DIM}]${RESET} ${BOLD}${pctLabel}${RESET}`;
}

// ─── Box drawing ──────────────────────────────────────────

function drawBox(lines: ReadonlyArray<string>, width = 72): string {
  const top    = `╔${"═".repeat(width - 2)}╗`;
  const bottom = `╚${"═".repeat(width - 2)}╝`;
  const body = lines.map((line) => {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, "");
    const pad = Math.max(0, width - 2 - stripped.length);
    return `║ ${line}${" ".repeat(pad - 1)}║`;
  });
  return [top, ...body, bottom].join("\n");
}

// ─── Streaming word-by-word writer ────────────────────────

async function writeWordByWord(text: string): Promise<void> {
  const words = text.split(/(\s+)/);
  for (const word of words) {
    process.stdout.write(word);
    if (word.trim().length > 0) {
      await sleep(WORD_DELAY_MS);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── GSK API: streaming call ──────────────────────────────

async function callGSKStreaming(
  messages: ReadonlyArray<GSKMessage>,
  onToken: (token: string) => void
): Promise<string> {
  const apiKey = process.env["GSK_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "GSK_API_KEY environment variable is not set. " +
      "Get your Google AI Studio key at https://aistudio.google.com/apikey"
    );
  }

  const body = JSON.stringify({
    model: GSK_MODEL,
    max_tokens: MAX_TOKENS,
    stream: true,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const response = await fetch(GSK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable)");
    throw new Error(`GSK API error ${response.status}: ${errText}`);
  }

  if (!response.body) {
    throw new Error("GSK API returned no response body");
  }

  let fullText = "";
  const decoder = new TextDecoder("utf-8");
  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const raw = decoder.decode(value, { stream: true });
    const lines = raw.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") break;

      try {
        const chunk = JSON.parse(payload) as GSKStreamChunk;
        const token = chunk.choices?.[0]?.delta?.content ?? "";
        if (token) {
          onToken(token);
          fullText += token;
        }
      } catch {
        // malformed SSE chunk — skip
      }
    }
  }

  return fullText;
}

// ─── Non-streaming fallback ───────────────────────────────

async function callGSKNonStreaming(
  messages: ReadonlyArray<GSKMessage>
): Promise<string> {
  const apiKey = process.env["GSK_API_KEY"];
  if (!apiKey) {
    throw new Error("GSK_API_KEY environment variable is not set.");
  }

  const response = await fetch(GSK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GSK_MODEL,
      max_tokens: MAX_TOKENS,
      stream: false,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "(unreadable)");
    throw new Error(`GSK API error ${response.status}: ${errText}`);
  }

  const data = (await response.json()) as {
    choices?: ReadonlyArray<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Build user prompt from findings ─────────────────────

function buildFindingsSummary(report: SecurityReport): string {
  const s = report.summary;
  const lines: string[] = [
    `TARGET: ${report.targetPath}`,
    `SCORE:  ${report.score.numericScore}/100 (Grade ${report.score.grade})`,
    `FILES:  ${s.filesScanned} scanned`,
    ``,
    `FINDINGS SUMMARY`,
    `  Critical: ${s.critical}`,
    `  High:     ${s.high}`,
    `  Medium:   ${s.medium}`,
    `  Low:      ${s.low}`,
    `  Info:     ${s.info}`,
    ``,
    `TOP FINDINGS (up to 20)`,
  ];

  const topFindings = [...report.findings]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 20);

  for (const f of topFindings) {
    lines.push(
      `  [${f.severity.toUpperCase()}] ${f.title}`,
      `    File: ${f.file}${f.line ? `:${f.line}` : ""}`,
      `    Evidence: ${f.evidence}`,
      `    Category: ${f.category}`,
      f.fix ? `    Fix available: ${f.fix.auto ? "auto" : "manual"}` : "",
      ``
    );
  }

  return lines.filter((l) => l !== null).join("\n");
}

// ─── Run a single agent ───────────────────────────────────

async function runAgent(
  agent: GSKAgentLabel,
  userContent: string,
  conversationHistory: ReadonlyArray<GSKMessage>,
  agentIndex: number,
  totalAgents: number
): Promise<GSKAgentResult> {
  const col = agentColor(agent.id);

  // Print agent header
  process.stdout.write("\n");
  process.stdout.write(
    drawBox(
      [
        color(col + BOLD, `${agent.emoji} ${agent.displayName}`),
        color(DIM, `Agent ${agentIndex + 1} of ${totalAgents}`),
      ],
      56
    ) + "\n\n"
  );

  // Progress indicator
  process.stdout.write(
    `  ${color(DIM, "Analyzing...")} ${renderProgressBar(agentIndex, totalAgents)}\n\n`
  );

  const messages: GSKMessage[] = [
    { role: "system", content: agent.systemPrompt },
    ...conversationHistory,
    { role: "user", content: userContent },
  ];

  // Indent all output by 2 spaces
  process.stdout.write("  ");

  const onToken = (token: string): void => {
    const indented = token.replace(/\n/g, "\n  ");
    process.stdout.write(indented);
  };

  let fullText: string;
  try {
    fullText = await callGSKStreaming(messages, onToken);
  } catch (streamErr) {
    // Fallback to non-streaming with word-by-word rendering
    process.stdout.write(
      color(DIM, "\n  [streaming unavailable, switching to non-streaming]\n\n  ")
    );
    fullText = await callGSKNonStreaming(messages);
    await writeWordByWord(fullText.replace(/\n/g, "\n  "));
  }

  process.stdout.write("\n");

  // Progress update
  process.stdout.write(
    `\n  ${color(DIM, "Done.")} ${renderProgressBar(agentIndex + 1, totalAgents)}\n`
  );

  return { agentId: agent.id, text: fullText };
}

// ─── Extract summary from auditor text ───────────────────

function extractSummary(results: ReadonlyArray<GSKAgentResult>): {
  readonly attackVectors: ReadonlyArray<string>;
  readonly mitigations: ReadonlyArray<string>;
  readonly verdict: string;
  readonly top3: ReadonlyArray<string>;
  readonly riskRating: string;
  readonly deploymentRecommendation: string;
} {
  const auditorText  = results.find((r) => r.agentId === "auditor")?.text ?? "";
  const attackerText = results.find((r) => r.agentId === "attacker")?.text ?? "";
  const defenderText = results.find((r) => r.agentId === "defender")?.text ?? "";

  // Extract top 3 from auditor
  const top3: string[] = [];
  const top3Match = auditorText.match(
    /TOP 3 FINDINGS[\s\S]*?(?:1\.\s+(.+))(?:\n\s*2\.\s+(.+))?(?:\n\s*3\.\s+(.+))?/
  );
  if (top3Match) {
    if (top3Match[1]) top3.push(top3Match[1].trim());
    if (top3Match[2]) top3.push(top3Match[2].trim());
    if (top3Match[3]) top3.push(top3Match[3].trim());
  }

  // Extract risk rating
  const riskMatch = auditorText.match(/FINAL RISK RATING:\s*(CRITICAL|HIGH|MEDIUM|LOW|MINIMAL)/i);
  const riskRating = riskMatch?.[1] ?? "UNKNOWN";

  // Extract deployment recommendation
  const deployMatch = auditorText.match(/DEPLOYMENT RECOMMENDATION:\s*(BLOCK|CONDITIONAL|APPROVE)/i);
  const deploymentRecommendation = deployMatch?.[1] ?? "CONDITIONAL";

  // Extract attack vectors
  const vectorMatches = [...attackerText.matchAll(/\[\d+\]\s+SEVERITY:\s*\S+\s+VECTOR:\s+(.+)/g)];
  const attackVectors = vectorMatches.map((m) => m[1]?.trim() ?? "").filter(Boolean).slice(0, 5);

  // Extract immediate fixes from defender
  const fixMatches = [...defenderText.matchAll(/IMMEDIATE FIXES[\s\S]*?(?:\[Finding \d+\].*?\n)+/g)];
  const mitigations = fixMatches.length > 0
    ? fixMatches[0][0].split("\n")
        .filter((l) => l.trim().startsWith("[Finding"))
        .map((l) => l.trim())
        .slice(0, 5)
    : [];

  // Verdict = rationale section
  const rationaleMatch = auditorText.match(/RATIONALE:\s*(.+?)(?:\n\n|\nMilestone|\nTOP 3)/s);
  const verdict = rationaleMatch?.[1]?.trim().replace(/\s+/g, " ").slice(0, 200) ?? "See full analysis above.";

  return { attackVectors, mitigations, verdict, top3, riskRating, deploymentRecommendation };
}

// ─── Render summary box ───────────────────────────────────

function renderSummaryBox(
  summary: ReturnType<typeof extractSummary>
): void {
  const riskColor =
    summary.riskRating === "CRITICAL" ? RED    :
    summary.riskRating === "HIGH"     ? YELLOW :
    summary.riskRating === "MEDIUM"   ? CYAN   :
    GREEN;

  const deployColor =
    summary.deploymentRecommendation === "BLOCK"       ? RED    :
    summary.deploymentRecommendation === "CONDITIONAL" ? YELLOW :
    GREEN;

  process.stdout.write("\n");
  process.stdout.write(color(BOLD + CYAN, "╔══════════════════════════════════════════════════════════╗\n"));
  process.stdout.write(color(BOLD + CYAN, "║         AgentShield GSK Analysis Summary                 ║\n"));
  process.stdout.write(color(BOLD + CYAN, "╚══════════════════════════════════════════════════════════╝\n\n"));

  process.stdout.write(
    `  ${BOLD}Final Risk Rating:${RESET}      ${color(riskColor + BOLD, summary.riskRating)}\n`
  );
  process.stdout.write(
    `  ${BOLD}Deployment Recommendation:${RESET} ${color(deployColor + BOLD, summary.deploymentRecommendation)}\n\n`
  );

  if (summary.attackVectors.length > 0) {
    process.stdout.write(color(RED + BOLD, "  🔴 Attack Vectors Found\n"));
    for (const v of summary.attackVectors) {
      process.stdout.write(color(DIM, `     • ${v}\n`));
    }
    process.stdout.write("\n");
  }

  if (summary.mitigations.length > 0) {
    process.stdout.write(color(BLUE + BOLD, "  🔵 Immediate Mitigations\n"));
    for (const m of summary.mitigations) {
      process.stdout.write(color(DIM, `     • ${m}\n`));
    }
    process.stdout.write("\n");
  }

  if (summary.top3.length > 0) {
    process.stdout.write(color(YELLOW + BOLD, "  ⚖️  Top 3 Findings\n"));
    summary.top3.forEach((item, i) => {
      process.stdout.write(color(WHITE, `     ${i + 1}. ${item}\n`));
    });
    process.stdout.write("\n");
  }

  process.stdout.write(color(BOLD, "  Auditor Verdict\n"));
  process.stdout.write(color(DIM, `  ${summary.verdict}\n\n`));
}

// ─── Public API ───────────────────────────────────────────

/**
 * Run the full GSK three-agent pipeline and stream output to terminal.
 * Uses Google Gemini (gemini-2.5-pro) via the OpenAI-compatible REST API.
 * Requires GSK_API_KEY environment variable (Google AI Studio key).
 */
export async function runGSKPipeline(report: SecurityReport): Promise<void> {
  // Header box
  process.stdout.write("\n");
  process.stdout.write(
    color(
      BOLD + BG_DARK + CYAN,
      "  AgentShield Deep Analysis — GSK Pipeline  "
    ) + "\n"
  );
  process.stdout.write(
    color(DIM, "  Three-agent adversarial security review\n")
  );
  process.stdout.write(
    color(DIM, `  Model: ${GSK_MODEL}  ·  Auth: GSK_API_KEY\n\n`)
  );

  const findingsSummary = buildFindingsSummary(report);
  const results: GSKAgentResult[] = [];
  const totalAgents = GSK_AGENTS.length;

  // Agent 1: ATTACKER
  const attackerAgent = GSK_AGENTS[0];
  if (!attackerAgent) throw new Error("ATTACKER agent not found");
  const attackerResult = await runAgent(
    attackerAgent,
    `Please analyze this AI agent configuration and find every exploitable security vulnerability:\n\n${findingsSummary}`,
    [],
    0,
    totalAgents
  );
  results.push(attackerResult);

  // Agent 2: DEFENDER — receives attacker output
  const defenderAgent = GSK_AGENTS[1];
  if (!defenderAgent) throw new Error("DEFENDER agent not found");
  const defenderResult = await runAgent(
    defenderAgent,
    `The red team has analyzed the following AI agent configuration and found these attack vectors. Please provide concrete mitigations:\n\n${findingsSummary}\n\nRED TEAM FINDINGS:\n${attackerResult.text}`,
    [],
    1,
    totalAgents
  );
  results.push(defenderResult);

  // Agent 3: AUDITOR — receives both
  const auditorAgent = GSK_AGENTS[2];
  if (!auditorAgent) throw new Error("AUDITOR agent not found");
  const auditorResult = await runAgent(
    auditorAgent,
    `Please audit the following AI agent configuration analysis. Review both the attacker findings and defender mitigations, then issue your final verdict.\n\nCONFIGURATION SUMMARY:\n${findingsSummary}\n\nRED TEAM FINDINGS:\n${attackerResult.text}\n\nBLUE TEAM MITIGATIONS:\n${defenderResult.text}`,
    [],
    2,
    totalAgents
  );
  results.push(auditorResult);

  // Summary box
  const summary = extractSummary(results);
  renderSummaryBox(summary);
}

// ─── Backward-compat alias ────────────────────────────────
// Allows existing callers of runGrokPipeline to keep working without changes.

/** @deprecated Use runGSKPipeline */
export const runGrokPipeline = runGSKPipeline;
