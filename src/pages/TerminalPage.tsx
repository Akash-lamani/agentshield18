import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { TERMINAL_BOOT_SEQUENCE } from "../data/mockData";

interface TerminalPageProps {
  isWatching: boolean;
  isScanning: boolean;
}

interface LogLine {
  id: string;
  text: string;
  type: "cmd" | "info" | "success" | "error" | "warn" | "divider";
  timestamp: string;
}

const TYPE_COLORS: Record<string, string> = {
  cmd: "#00d4ff",
  info: "#c8d8e8",
  success: "#00ff88",
  error: "#ff2b4e",
  warn: "#ffb400",
  divider: "#2a4060",
};

const TYPE_PREFIX: Record<string, string> = {
  cmd: "",
  info: "",
  success: "",
  error: "",
  warn: "",
  divider: "",
};

const WATCH_LOGS = [
  { text: "  ↳ File change detected: src/agent/chat-handler.ts", type: "info" },
  { text: "  ⟳ Running incremental scan...", type: "info" },
  { text: "  ⚠ CRITICAL: Prompt injection vector still present", type: "error" },
  { text: "  ↳ File change detected: .claude/mcp.json", type: "info" },
  { text: "  ⟳ Running MCP security analysis...", type: "info" },
  { text: "  ✓ No new issues in .claude/mcp.json", type: "success" },
  { text: "  ↳ File change detected: settings.json", type: "info" },
  { text: "  ⚠ HIGH: Excessive permissions unchanged", type: "warn" },
  { text: "  [policy] Blocked: external network call from web-scraper", type: "warn" },
  { text: "  [runtime] Agent attempted to read /etc/passwd — BLOCKED", type: "error" },
  { text: "  [policy] Blocked: subagent spawn without approval", type: "warn" },
  { text: "  ↳ File change detected: src/config/env.ts", type: "info" },
  { text: "  ⚠ CRITICAL: NEW secret detected — AWS key in src/config/env.ts:3", type: "error" },
];

export default function TerminalPage({ isWatching, isScanning }: TerminalPageProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [booted, setBooted] = useState(false);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const addLine = (text: string, type: LogLine["type"]) => {
    setLines(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      text,
      type,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
    }]);
  };

  // Boot sequence
  useEffect(() => {
    if (booted) return;
    setBooted(true);
    TERMINAL_BOOT_SEQUENCE.forEach(({ delay, text, type }) => {
      setTimeout(() => addLine(text, type as LogLine["type"]), delay);
    });
  }, []);

  // Watch logs
  useEffect(() => {
    if (!isWatching) return;
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < WATCH_LOGS.length) {
        const log = WATCH_LOGS[idx];
        addLine(log.text, log.type as LogLine["type"]);
        idx++;
      } else {
        idx = 0;
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [isWatching]);

  // Scan logs
  useEffect(() => {
    if (!isScanning) return;
    addLine("$ agentshield scan /workspace/my-ai-agent --deep", "cmd");
    const scanLines = [
      { t: 300, text: "▶ Initializing deep scan...", type: "info" },
      { t: 600, text: "  Scanning 23 files...", type: "info" },
      { t: 1000, text: "  ⚠ CRITICAL: secrets detected", type: "error" },
      { t: 1400, text: "  ⚠ HIGH: permissions violation", type: "warn" },
      { t: 1800, text: "  ✓ Scan complete", type: "success" },
    ];
    scanLines.forEach(({ t, text, type }) => {
      setTimeout(() => addLine(text, type as LogLine["type"]), t);
    });
  }, [isScanning]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  const COMMANDS: Record<string, () => void> = {
    help: () => {
      addLine("Available commands:", "info");
      ["scan [path]", "watch [path]", "report", "policy list", "mcp list", "clear", "status"].forEach(c =>
        addLine(`  ${c}`, "success")
      );
    },
    clear: () => setLines([]),
    status: () => {
      addLine("AgentShield Status:", "info");
      addLine(`  Watch mode: ${isWatching ? "ACTIVE" : "INACTIVE"}`, isWatching ? "success" : "warn");
      addLine(`  Scan engine: READY`, "success");
      addLine(`  Policy engine: ACTIVE (6 policies)`, "success");
      addLine(`  MCP monitor: ACTIVE (5 servers)`, "success");
    },
    scan: () => {
      addLine("$ agentshield scan /workspace/my-ai-agent", "cmd");
      setTimeout(() => addLine("▶ Starting scan...", "info"), 200);
      setTimeout(() => addLine("  Scanning files...", "info"), 500);
      setTimeout(() => addLine("  ⚠ CRITICAL: 2 findings", "error"), 900);
      setTimeout(() => addLine("  ✓ Scan finished in 4.2s", "success"), 1200);
    },
    watch: () => addLine(isWatching ? "Watch mode already active" : "Use the WATCH button in the header to enable watch mode", "info"),
    report: () => {
      addLine("$ agentshield report --format html", "cmd");
      setTimeout(() => addLine("  ✓ Report generated: agentshield-report.html", "success"), 300);
      setTimeout(() => addLine("  Open the Report tab to view", "info"), 500);
    },
    "policy list": () => {
      addLine("Active Policies:", "info");
      ["No External Network", "Secret Scanning", "Prompt Injection Defense", "Filesystem Scope", "Tool Rate Limiting"]
        .forEach(p => addLine(`  ✓ ${p}`, "success"));
    },
    "mcp list": () => {
      addLine("MCP Servers:", "info");
      [["filesystem", "safe"], ["web-scraper", "critical"], ["github", "risky"], ["database", "risky"], ["search", "safe"]]
        .forEach(([name, status]) => addLine(`  [${status.toUpperCase()}] ${name}`, status === "safe" ? "success" : status === "critical" ? "error" : "warn"));
    },
  };

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    addLine(`$ ${cmd}`, "cmd");
    setCmdHistory(h => [cmd, ...h]);
    setHistoryIdx(-1);

    const handler = COMMANDS[trimmed];
    if (handler) {
      handler();
    } else if (trimmed) {
      addLine(`Command not found: ${trimmed}. Type 'help' for commands.`, "warn");
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      const idx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(idx);
      setInput(cmdHistory[idx] || "");
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      const idx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(idx);
      setInput(idx === -1 ? "" : cmdHistory[idx]);
      e.preventDefault();
    }
  };

  return (
    <div className="h-full p-5 flex flex-col gap-4">
      {/* Header */}
      <motion.div className="cyber-card p-4 flex items-center justify-between flex-shrink-0"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#c8d8e8" }}>
            TERMINAL
          </span>
          <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>
            agentshield v2.4.1 · /workspace/my-ai-agent
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isWatching && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{ background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.3)" }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00d4ff", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 9, color: "#00d4ff", fontFamily: "'JetBrains Mono', monospace" }}>WATCH ACTIVE</span>
            </div>
          )}
          <button className="cyber-btn" style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={() => setLines([])}>
            CLEAR
          </button>
          <div className="flex gap-1.5">
            {["#ff2b4e", "#ffb400", "#00ff88"].map(c => (
              <div key={c} className="w-3 h-3 rounded-full" style={{ background: c, opacity: 0.7 }} />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Terminal body */}
      <motion.div
        className="cyber-card flex-1 flex flex-col overflow-hidden cursor-text"
        style={{ background: "#030810", border: "1px solid #1a2d4a" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Scanline decoration */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg" style={{ zIndex: 0 }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Log output */}
        <div className="flex-1 overflow-y-auto p-4 relative" style={{ zIndex: 1 }}>
          <AnimatePresence>
            {lines.map((line) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-3 mb-0.5"
                style={{ minHeight: 20 }}
              >
                <span style={{ fontSize: 9, color: "#2a4060", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, marginTop: 1, width: 54 }}>
                  {line.timestamp}
                </span>
                {line.type === "divider" ? (
                  <span style={{ color: "#2a4060", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{line.text}</span>
                ) : (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 12,
                    color: TYPE_COLORS[line.type],
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}>
                    {line.text}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Input line */}
        <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid #1a2d4a", background: "rgba(0,0,0,0.3)" }}>
          <span style={{ color: "#00ff88", fontFamily: "'JetBrains Mono', monospace", fontSize: 13, flexShrink: 0 }}>
            agentshield&gt;
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent outline-none"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 12,
              color: "#00d4ff",
              caretColor: "#00d4ff",
              border: "none",
            }}
            placeholder="Type a command... (try 'help')"
            autoFocus
            spellCheck={false}
          />
          <motion.div
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{ width: 8, height: 16, background: "#00d4ff", flexShrink: 0 }}
          />
        </div>
      </motion.div>

      {/* Quick commands */}
      <motion.div className="flex items-center gap-2 flex-shrink-0 flex-wrap"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <span style={{ fontSize: 10, color: "#4a6080", fontFamily: "'JetBrains Mono', monospace" }}>QUICK:</span>
        {["scan", "watch", "status", "report", "policy list", "mcp list", "help", "clear"].map(cmd => (
          <button key={cmd} className="cyber-btn"
            style={{ padding: "3px 10px", fontSize: 10 }}
            onClick={() => { handleCommand(cmd); inputRef.current?.focus(); }}>
            {cmd}
          </button>
        ))}
      </motion.div>
    </div>
  );
}
