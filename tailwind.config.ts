import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

// Brand colours are CSS variables (RGB triplets) defined in src/app/globals.css.
// Change them there (see BRAND.md) and the whole app re-themes.
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: v("--brand-primary"),
          dark: v("--brand-primary-dark"),
          light: v("--brand-primary-light"),
          accent: v("--brand-accent"),
          ink: v("--brand-ink"),
          muted: v("--brand-muted"),
          surface: v("--brand-surface"),
          line: v("--brand-line"),
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        brand: "var(--brand-radius)",
      },
    },
  },
  plugins: [typography],
};

export default config;
