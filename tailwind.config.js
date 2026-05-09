/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#020510",
          surface: "#060d1f",
          card: "#0a1628",
          border: "#1a2d4a",
          cyan: "#00d4ff",
          "cyan-dim": "#0099bb",
          green: "#00ff88",
          "green-dim": "#00cc6a",
          red: "#ff2b4e",
          orange: "#ff6b35",
          amber: "#ffb400",
          blue: "#4a90d9",
          purple: "#8b5cf6",
          muted: "#4a6080",
          text: "#c8d8e8",
          "text-dim": "#6b8299",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "monospace"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "slide-in-right": "slideInRight 0.3s ease-out",
        flicker: "flicker 0.15s linear 2",
        "spin-slow": "spin 8s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 5px #00d4ff40, 0 0 10px #00d4ff20" },
          "50%": { boxShadow: "0 0 20px #00d4ff80, 0 0 40px #00d4ff40" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        flicker: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.1)",
        "glow-red": "0 0 20px rgba(255,43,78,0.4), 0 0 40px rgba(255,43,78,0.2)",
        "glow-green": "0 0 20px rgba(0,255,136,0.3), 0 0 40px rgba(0,255,136,0.1)",
        "card-cyber": "0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      },
    },
  },
  plugins: [],
};
