# AgentShield

## Overview

AgentShield is a modern AI security monitoring dashboard developed using React, TypeScript, and Tailwind CSS.
The project is designed to simulate and monitor AI agent vulnerabilities, attack detection, watch mode monitoring, policy management, and security reporting through an interactive web interface.

---

## Features

* AI Security Monitoring Dashboard
* Vulnerability Detection Interface
* Attack Simulation Module
* Watch Mode Monitoring
* Policy Management System
* Terminal Simulation Interface
* MCP Security Page
* Interactive Reports Dashboard
* Responsive User Interface
* Modern Component-Based Architecture

---

## Technologies Used

* React
* TypeScript
* Tailwind CSS
* Vite
* ESLint
* HTML5
* CSS3

---

## Project Structure

```text
src/
 ├── assets/
 ├── components/
 ├── data/
 ├── pages/
 ├── types/
 ├── App.tsx
 └── main.tsx
```

---

## Main Modules

* Dashboard Page
* Vulnerabilities Page
* Attack Simulation Page
* Watch Mode Page
* Terminal Page
* Policy Management Page
* MCP Monitoring Page
* Reports Page

---

## How to Run the Project

1. Clone the repository

```bash
git clone <repository-link>
```

2. Open the project folder

```bash
cd agentshield-github
```

3. Install dependencies

```bash
npm install
```

4. Start the development server

```bash
npm run dev
```

5. Open the browser and visit

```text
http://localhost:5173
```

---

## Future Enhancements

* Real-time Threat Detection
* AI-based Risk Prediction
* Cloud Deployment Support
* Authentication System
* Live Notifications
* API Integration
* Advanced Analytics Dashboard

---

## Screenshots

Store screenshots inside the `screenshots/` folder.

Example:

```text
screenshots/dashboard.png
screenshots/attack-sim.png
screenshots/watch-mode.png
```

---

## Author

Developed by [Your Name]

---

## License

This project is developed for educational and learning purposes.
## commands

# HELP
npx tsx src/index.ts --help

# INSTALL DEPENDENCIES
npm install

# BUILD PROJECT
npm run build

# RUN TESTS
npm test

# SET API KEY (Linux/macOS)
export ANTHROPIC_API_KEY=your-key

# BASIC SECURITY SCAN
npm run scan

# SCAN SPECIFIC PATH
npx tsx src/index.ts scan --path .

# DEEP SECURITY ANALYSIS
npx tsx src/index.ts scan --path . --deep

# GENERATE HTML REPORT
npx tsx src/index.ts scan --path . --report html --output report.html

# GENERATE JSON REPORT
npx tsx src/index.ts scan --path . --report json --output report.json

# CLAUDE OPUS AI ANALYSIS
npx tsx src/index.ts scan --path . --opus

# GOOGLE GEMINI ANALYSIS
npx tsx src/index.ts scan --path . --gsk

# XAI GROK ANALYSIS
npx tsx src/index.ts scan --path . --grok

# PROMPT INJECTION TESTING
npx tsx src/index.ts scan --path . --injection

# TAINT ANALYSIS
npx tsx src/index.ts scan --path . --taint

# SANDBOX ANALYSIS
npx tsx src/index.ts scan --path . --sandbox

# SUPPLY CHAIN SECURITY CHECK
npx tsx src/index.ts scan --path . --supply-chain

# AUTO FIX VULNERABILITIES
npx tsx src/index.ts scan --path . --fix

# FILTER ONLY HIGH/CRITICAL ISSUES
npx tsx src/index.ts scan --path . --min-severity high

# START WATCH MODE
npx tsx src/index.ts watch --path .

# CREATE POLICY FILE
npx tsx src/index.ts policy init --output policy.json

# APPLY POLICY
npx tsx src/index.ts policy apply policy.json --path .

# ENABLE CI/CD SECURITY GATE
npx tsx src/index.ts scan --path . --policy policy.json --gate

# INSTALL RUNTIME PROTECTION
npx tsx src/index.ts runtime install --path .

# CHECK RUNTIME STATUS
npx tsx src/index.ts runtime status --path .

# REMOVE RUNTIME PROTECTION
npx tsx src/index.ts runtime uninstall --path .

# START MINICLAW SANDBOX
npx tsx src/index.ts miniclaw start

# START FRONTEND DASHBOARD
npm run dev

# RUN DEMO SCAN
npm run scan:demo
