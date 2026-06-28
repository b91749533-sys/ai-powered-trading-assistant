import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/charts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        trading: {
          green: "#00c805", // Robinhood green
          red: "#ff3b30",   // Apple red
          darkBg: "#0B0E11", // Trading Terminal deep dark
          cardBg: "#151A21", // Trading Terminal card bg
          border: "#202632",
          textSecondary: "#8491A5"
        }
      }
    },
  },
  plugins: [],
};
export default config;
