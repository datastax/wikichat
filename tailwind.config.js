/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  theme: {
    colors: {
      primary: "var(--primary)",
      "primary-hover": "var(--primary-hover)",
      inverse: "var(--inverse)",
      body: "var(--background-body)",
      "bg-1": "var(--background-level1)",
      "bg-2": "var(--background-level2)",
      gray: "var(--gray)",
      purple: "var(--purple)",
      pink: "var(--pink)",
      green: "var(--green)",
      teal: "var(--teal)",
      orange: "var(--orange)",
      yellow: "var(--yellow)",
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
      },
      screens: {
        origin: "1200px",
      },
    },
  },
  plugins: [],
};
