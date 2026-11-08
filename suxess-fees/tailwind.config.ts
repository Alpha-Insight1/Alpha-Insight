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
        brand: {
          /* Alpha Insight — light blue & white system */
          green: "#0B5C2E",
          gold: "#D4A017",
          dark: "#0A3D1F",
          blue: "#2563EB",
          navy: "#1D4ED8",
          sky: "#EFF6FF",
          mist: "#DBEAFE",
          ink: "#1E3A5F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
