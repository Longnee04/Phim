/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border)",
        primary: {
          DEFAULT: "#e50914",
          hover: "#f6121d",
        },
        accent: "#38bdf8",
      },
      fontFamily: {
        sans: ["var(--font-be-vietnam-pro)", "sans-serif"],
        display: ["var(--font-montserrat)", "sans-serif"],
      },
      boxShadow: {
        'glow-red': '0 0 20px -3px rgba(229, 9, 20, 0.45)',
      }
    },
  },
  plugins: [],
};
