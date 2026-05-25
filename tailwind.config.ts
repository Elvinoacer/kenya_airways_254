import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./pages/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#bb0013",
        "primary-container": "#e71520",
        secondary: "#a33c33",
        "on-secondary-fixed": "#410001",
        "secondary-fixed-dim": "#ffb4aa",
        outline: "#936e6a",
        "outline-variant": "#e8bcb7",
        surface: "#fcf9f8",
        "on-surface": "#1c1b1b",
        "on-surface-variant": "#5e3f3c",
        "surface-container": "#f0edec",
        "surface-container-highest": "#e5e2e1",
        "surface-container-low": "#f6f3f2",
        background: "#fcf9f8",
      },
      fontFamily: {
        sans: ["Hanken Grotesk", "sans-serif"],
      },
      boxShadow: {
        lift: "0 12px 32px rgba(13, 13, 13, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
