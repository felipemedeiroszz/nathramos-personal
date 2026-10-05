import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        "surface-secondary":
          "hsl(var(--surface-secondary) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground:
            "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        text: "hsl(var(--text) / <alpha-value>)",
        "text-secondary":
          "hsl(var(--text-secondary) / <alpha-value>)",
        border: "hsl(var(--border) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      height: {
        "13": "3.25rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.5s ease-out",
        "glow": "glow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
