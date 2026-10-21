import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Calm, trustworthy green — Sri Lankan civic / "guide" feel.
        brand: {
          50: "#eef8f1",
          100: "#d4efe0",
          200: "#a9e1c4",
          300: "#74cda3",
          400: "#43b682",
          500: "#23a066",
          600: "#1b8a56",
          700: "#166c44",
          800: "#124f33",
          900: "#0e3e28",
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
