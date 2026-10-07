import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "var(--bg-canvas)",
          subtle: "var(--bg-canvas-subtle)",
        },
        surface: {
          DEFAULT: "var(--bg-surface)",
          hover: "var(--bg-surface-hover)",
          elevated: "var(--bg-surface-elevated)",
          border: "var(--border-subtle)",
        },
        brand: {
          green: {
            DEFAULT: "var(--brand-green)",
            hover: "var(--brand-green-hover)",
            subtle: "var(--brand-green-subtle)",
            text: "var(--brand-green-text)",
          },
          yellow: {
            DEFAULT: "var(--brand-yellow)",
            hover: "var(--brand-yellow-hover)",
            subtle: "var(--brand-yellow-subtle)",
            text: "var(--brand-yellow-text)",
          },
          blue: {
            DEFAULT: "var(--brand-blue)",
            subtle: "var(--brand-blue-subtle)",
            text: "var(--brand-blue-text)",
          },
        },
        muted: {
          DEFAULT: "var(--text-muted)",
          foreground: "var(--text-secondary)",
        },
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};
export default config;
