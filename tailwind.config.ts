import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Government-appropriate, trustworthy palette.
        brand: {
          50: "#eef4fb",
          100: "#d6e4f5",
          600: "#1f5aa8",
          700: "#184884",
          800: "#123667",
        },
        ink: {
          900: "#0f172a",
          700: "#334155",
          500: "#64748b",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-app)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Noto Sans",
          "Noto Sans Sinhala",
          "Noto Sans Tamil",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
