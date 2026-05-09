#!/usr/bin/env bash
# AgentShield Demo Script
# Demonstrates scanning, reporting, watch mode, and policy engine

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

EXAMPLES_PATH="examples/vulnerable"
REPORTS_DIR="demo-reports"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No Color

banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}${BOLD}║        AgentShield Security Demo                 ║${NC}"
  echo -e "${CYAN}${BOLD}║   AI Agent Configuration Security Auditor        ║${NC}"
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
  echo ""
}

step() {
  echo ""
  echo -e "${YELLOW}${BOLD}▶ $1${NC}"
  echo -e "${DIM}  $2${NC}"
  echo ""
}

pause() {
  echo -e "${DIM}  Press Enter to continue...${NC}"
  read -r
}

# Create demo reports directory
mkdir -p "$REPORTS_DIR"

banner

echo -e "  This demo will:"
echo -e "  ${GREEN}1.${NC} Terminal scan of examples/vulnerable"
echo -e "  ${GREEN}2.${NC} Generate HTML report with OWASP mappings"
echo -e "  ${GREEN}3.${NC} Generate JSON report"
echo -e "  ${GREEN}4.${NC} Show policy validation"
echo -e "  ${GREEN}5.${NC} Show watch mode (5s)"
echo ""

pause

# ── Step 1: Terminal Scan ────────────────────────────────────
step "Step 1: Terminal Scan" "Scanning examples/vulnerable for security issues..."

npx tsx src/index.ts scan --path "$EXAMPLES_PATH"

pause

# ── Step 2: HTML Report ──────────────────────────────────────
step "Step 2: HTML Report" "Generating professional HTML report with OWASP mappings..."

npx tsx src/index.ts scan \
  --path "$EXAMPLES_PATH" \
  --report html \
  --output "$REPORTS_DIR/report.html"

echo -e "  ${GREEN}✓${NC} HTML report: ${BOLD}$REPORTS_DIR/report.html${NC}"
echo -e "  Open in browser to see:"
echo -e "    • Severity summary table"
echo -e "    • Affected files breakdown"
echo -e "    • OWASP LLM Top 10 mappings"
echo -e "    • Remediation roadmap"
echo -e "    • Full vulnerability details"

pause

# ── Step 3: JSON Report ──────────────────────────────────────
step "Step 3: JSON Report" "Generating machine-readable JSON report..."

npx tsx src/index.ts scan \
  --path "$EXAMPLES_PATH" \
  --report json \
  --output "$REPORTS_DIR/report.json"

FINDING_COUNT=$(cat "$REPORTS_DIR/report.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['summary']['totalFindings'])" 2>/dev/null || echo "?")
GRADE=$(cat "$REPORTS_DIR/report.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['score']['grade'])" 2>/dev/null || echo "?")

echo -e "  ${GREEN}✓${NC} JSON report: ${BOLD}$REPORTS_DIR/report.json${NC}"
echo -e "  Grade: ${RED}${BOLD}$GRADE${NC}  |  Findings: ${RED}${BOLD}$FINDING_COUNT${NC}"

pause

# ── Step 4: Policy Validation ────────────────────────────────
step "Step 4: Policy Engine" "Creating and validating an organization policy..."

POLICY_FILE="$REPORTS_DIR/demo-policy.json"
cat > "$POLICY_FILE" << 'POLICY'
{
  "version": 1,
  "name": "Demo Organization Policy",
  "description": "Security policy for demonstration",
  "min_score": 70,
  "max_severity": "high",
  "required_deny_list": ["WebFetch(*)", "WebSearch(*)"],
  "banned_mcp_servers": ["shell-runner", "unsandboxed-browser"],
  "banned_tools": [],
  "required_hooks": []
}
POLICY

echo -e "  Validating policy file..."
npx tsx src/index.ts policy validate "$POLICY_FILE" || true

echo ""
echo -e "  Applying policy to vulnerable examples..."
npx tsx src/index.ts policy apply "$POLICY_FILE" --path "$EXAMPLES_PATH" || true

pause

# ── Step 5: Watch Mode (brief) ───────────────────────────────
step "Step 5: Watch Mode" "Starting file watcher on examples/vulnerable (5 seconds)..."

echo -e "  ${DIM}In production: agentshield watch --path /path/to/config --debounce 500${NC}"
echo ""

# Run watcher in background, kill after 5s
timeout 5 npx tsx src/index.ts watch \
  --path "$EXAMPLES_PATH" \
  --debounce 500 \
  --min-severity high \
  2>&1 || true

echo ""
echo -e "  ${GREEN}✓${NC} Watch mode demonstrated"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║              Demo Complete!                      ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Generated files:"
echo -e "  ${GREEN}•${NC} $REPORTS_DIR/report.html     — HTML report (open in browser)"
echo -e "  ${GREEN}•${NC} $REPORTS_DIR/report.json     — Machine-readable JSON"
echo -e "  ${GREEN}•${NC} $REPORTS_DIR/demo-policy.json — Example policy file"
echo ""
echo -e "  Quick reference:"
echo -e "  ${DIM}npx tsx src/index.ts scan --path . --report html --output report.html${NC}"
echo -e "  ${DIM}npx tsx src/index.ts scan --path . --report json --output report.json${NC}"
echo -e "  ${DIM}npx tsx src/index.ts watch --path . --debounce 500${NC}"
echo -e "  ${DIM}npx tsx src/index.ts policy init${NC}"
echo -e "  ${DIM}npx tsx src/index.ts policy list${NC}"
echo -e "  ${DIM}npx tsx src/index.ts runtime install${NC}"
echo ""
