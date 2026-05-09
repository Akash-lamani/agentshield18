import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "./components/Layout/Sidebar";
import Header from "./components/Layout/Header";
import AlertToast from "./components/AlertToast";
import DashboardPage from "./pages/DashboardPage";
import VulnerabilitiesPage from "./pages/VulnerabilitiesPage";
import WatchModePage from "./pages/WatchModePage";
import AttackSimPage from "./pages/AttackSimPage";
import MCPPage from "./pages/MCPPage";
import PolicyPage from "./pages/PolicyPage";
import TerminalPage from "./pages/TerminalPage";
import ReportPage from "./pages/ReportPage";
import {
  buildInitialReport, buildFixedReport, INITIAL_MCP_SERVERS,
  INITIAL_POLICIES, SCAN_HISTORY, generateThreatTrend, generateActivityEvents
} from "./data/mockData";
import type { DashboardView, Finding, ActivityEvent, SecurityReport } from "./types";

const PAGE_TITLES: Record<DashboardView, string> = {
  dashboard: "Overview", vulnerabilities: "Vulnerabilities",
  watchmode: "Watch Mode", attacksim: "Attack Simulator",
  mcp: "MCP Security", policy: "Policy Engine",
  terminal: "Terminal", report: "Reports",
};

// Deduplicate alerts by title to prevent spam
function dedupeAlerts(alerts: Finding[]): Finding[] {
  const seen = new Set<string>();
  return alerts.filter(a => {
    const key = `${a.title}-${a.severity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function App() {
  const [view, setView] = useState<DashboardView>("dashboard");
  const [report, setReport] = useState<SecurityReport>(buildInitialReport());
  const [isScanning, setIsScanning] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [liveFindings, setLiveFindings] = useState<Finding[]>([]);
  const [alerts, setAlerts] = useState<Finding[]>([]);
  const [injectedFindings, setInjectedFindings] = useState<Finding[]>([]);
  const [isFixed, setIsFixed] = useState(false);
  const [activity, setActivity] = useState(generateActivityEvents());
  const [trend, setTrend] = useState(generateThreatTrend());
  const [policies, setPolicies] = useState(INITIAL_POLICIES);
  const [bgFlash, setBgFlash] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setTrend(generateThreatTrend()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isWatching) return;
    const interval = setInterval(() => {
      const randomFinding = report.findings[Math.floor(Math.random() * report.findings.length)];
      if (!randomFinding) return;
      const newFinding: Finding = {
        ...randomFinding,
        id: "LIVE-" + Date.now(),
        detectedAt: new Date().toISOString(),
        title: "[WATCH] " + randomFinding.title,
      };
      setLiveFindings(prev => [newFinding, ...prev].slice(0, 20));
      if (randomFinding.severity === "critical" || randomFinding.severity === "high") {
        setAlerts(prev => dedupeAlerts([newFinding, ...prev]).slice(0, 6));
        setBgFlash(true);
        setTimeout(() => setBgFlash(false), 500);
      }
      const newEvent: ActivityEvent = {
        id: "ev-" + Date.now(), type: "detection" as const,
        message: "[WATCH] " + randomFinding.title,
        severity: randomFinding.severity,
        timestamp: new Date().toISOString(), file: randomFinding.file,
      };
      setActivity(prev => [newEvent, ...prev].slice(0, 20));
    }, 6000);
    return () => clearInterval(interval);
  }, [isWatching, report.findings]);

  const handleScan = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    setActivity(prev => [{ id: "ev-" + Date.now(), type: "scan" as const, message: "Scan initiated", timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
    setTimeout(() => {
      setIsScanning(false);
      setReport(prev => ({ ...prev, timestamp: new Date().toISOString() }));
      setTrend(generateThreatTrend());
      setActivity(prev => [{ id: "ev-" + Date.now(), type: "scan" as const, message: "Scan complete: " + report.summary.totalFindings + " findings", timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
    }, 4000);
  }, [isScanning, report.summary.totalFindings]);

  const handleWatch = useCallback(() => {
    setIsWatching(prev => {
      const next = !prev;
      setActivity(a => [{ id: "ev-" + Date.now(), type: "scan" as const, message: next ? "Watch mode started" : "Watch mode stopped", timestamp: new Date().toISOString() }, ...a].slice(0, 20));
      if (!next) setLiveFindings([]);
      return next;
    });
  }, []);

  const handleInjectAttack = useCallback((finding: Finding) => {
    setInjectedFindings(prev => [...prev, finding]);
    setIsFixed(false);
    setLiveFindings(prev => [finding, ...prev].slice(0, 20));
    setAlerts(prev => dedupeAlerts([finding, ...prev]).slice(0, 6));
    setBgFlash(true);
    setTimeout(() => setBgFlash(false), 600);
    setReport(prev => ({
      ...prev,
      findings: [finding, ...prev.findings],
      summary: {
        ...prev.summary,
        totalFindings: prev.summary.totalFindings + 1,
        critical: prev.summary.critical + (finding.severity === "critical" ? 1 : 0),
      },
      score: { ...prev.score, numericScore: Math.max(5, prev.score.numericScore - 12), grade: "F" },
    }));
    setActivity(prev => [{ id: "ev-" + Date.now(), type: "injection" as const, message: "ATTACK DETECTED: " + finding.title, severity: finding.severity, timestamp: new Date().toISOString(), file: finding.file }, ...prev].slice(0, 20));
  }, []);

  const handleApplyFix = useCallback(() => {
    setIsFixed(true);
    setReport(buildFixedReport());
    setInjectedFindings([]);
    setActivity(prev => [{ id: "ev-" + Date.now(), type: "fix" as const, message: "Auto-fix applied: critical vulnerabilities patched", timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
  }, []);

  const handleRescan = useCallback(() => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setTrend(generateThreatTrend());
      setActivity(prev => [{ id: "ev-" + Date.now(), type: "scan" as const, message: "Rescan complete: score " + report.score.numericScore + "/100", timestamp: new Date().toISOString() }, ...prev].slice(0, 20));
    }, 3500);
  }, [report.score.numericScore]);

  const handleTogglePolicy = useCallback((id: string) => {
    setPolicies(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  }, []);

  const handleDismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const renderPage = () => {
    switch (view) {
      case "dashboard": return <DashboardPage report={report} activity={activity} history={SCAN_HISTORY} trend={trend} />;
      case "vulnerabilities": return <VulnerabilitiesPage findings={report.findings} />;
      case "watchmode": return <WatchModePage isWatching={isWatching} onToggleWatch={handleWatch} liveFindings={liveFindings} />;
      case "attacksim": return (
        <AttackSimPage onInjectAttack={handleInjectAttack} onApplyFix={handleApplyFix}
          onRescan={handleRescan} score={report.score.numericScore}
          isScanning={isScanning} injectedFindings={injectedFindings} isFixed={isFixed} />
      );
      case "mcp": return <MCPPage servers={INITIAL_MCP_SERVERS} />;
      case "policy": return <PolicyPage policies={policies} onTogglePolicy={handleTogglePolicy} />;
      case "terminal": return <TerminalPage isWatching={isWatching} isScanning={isScanning} />;
      case "report": return <ReportPage report={report} onGenerateReport={() => {}} />;
      default: return null;
    }
  };

  return (
    <div style={{
      display: "flex", height: "100vh", width: "100vw",
      overflow: "hidden", background: "#020510",
      fontFamily: "'Inter', system-ui, sans-serif",
      position: "relative",
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "linear-gradient(rgba(0,212,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.018) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
      }} />

      {/* Critical flash overlay — high z-index but doesn't block UI */}
      <AnimatePresence>
        {bgFlash && (
          <motion.div
            style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "#ff2b4e", zIndex: 200 }}
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.055, 0] }} exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
          />
        )}
      </AnimatePresence>

      {/* Toast system — highest z-index, positioned to not cover content */}
      <AlertToast alerts={alerts} onDismiss={handleDismissAlert} />

      {/* Sidebar */}
      <div style={{ position: "relative", zIndex: 10, flexShrink: 0 }}>
        <Sidebar activeView={view} onViewChange={setView} isScanning={isScanning} isWatching={isWatching} criticalCount={report.summary.critical} />
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative", zIndex: 10 }}>
        <Header report={report} isScanning={isScanning} isWatching={isWatching} onScan={handleScan} onWatch={handleWatch} title={PAGE_TITLES[view]} />

        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div key={view} style={{ height: "100%" }}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
