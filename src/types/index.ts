export type Severity = "critical" | "high" | "medium" | "low" | "info";
export type FindingCategory =
  | "secrets" | "permissions" | "hooks" | "mcp" | "skills"
  | "agents" | "injection" | "exposure" | "exfiltration" | "misconfiguration";

export interface Fix {
  description: string;
  before: string;
  after: string;
  auto: boolean;
}

export interface Finding {
  id: string;
  severity: Severity;
  category: FindingCategory;
  title: string;
  description: string;
  file: string;
  line?: number;
  evidence?: string;
  runtimeConfidence?: string;
  fix?: Fix;
  detectedAt: string;
  owaspCategory?: string;
}

export interface SecurityScore {
  grade: "A" | "B" | "C" | "D" | "F";
  numericScore: number;
  breakdown: {
    secrets: number;
    permissions: number;
    hooks: number;
    mcp: number;
    agents: number;
  };
}

export interface ReportSummary {
  totalFindings: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  filesScanned: number;
  autoFixable: number;
}

export interface SecurityReport {
  timestamp: string;
  targetPath: string;
  findings: Finding[];
  score: SecurityScore;
  summary: ReportSummary;
}

export interface ActivityEvent {
  id: string;
  type: "detection" | "fix" | "scan" | "alert" | "policy" | "injection";
  message: string;
  severity?: Severity;
  timestamp: string;
  file?: string;
}

export interface MCPServer {
  id: string;
  name: string;
  command: string;
  status: "safe" | "risky" | "critical" | "unknown";
  riskLevel: number;
  permissions: string[];
  externalConnections: boolean;
  findings: number;
  description?: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  violations: number;
  blockedActions: number;
  category: string;
  severity: Severity;
}

export interface ScanHistoryItem {
  id: string;
  timestamp: string;
  target: string;
  score: number;
  grade: string;
  findings: number;
  critical: number;
  duration: number;
}

export interface ThreatTrendPoint {
  time: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  score: number;
}

export type DashboardView =
  | "dashboard" | "vulnerabilities" | "watchmode"
  | "attacksim" | "mcp" | "policy" | "terminal" | "report";
