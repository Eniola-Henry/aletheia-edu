import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Parchment + near-ink. Never pure #000.
        cream: {
          DEFAULT: "#f7f1e6",
          alt: "#efe6d6",
          deep: "#e5d9c4",
        },
        ink: {
          DEFAULT: "#1c1916",
          soft: "#4a453e",
          faint: "#8a8378",
        },
        amber: {
          DEFAULT: "#9a342c",
          soft: "#f3e6d8",
          text: "#6e261f",
        },
      },
      fontFamily: {
        serif: ["var(--font-serif)"],
        sans: ["var(--font-sans)"],
      },
      letterSpacing: {
        greek: "0.18em",
      },
    },
  },
  plugins: [],
};
export default config;
