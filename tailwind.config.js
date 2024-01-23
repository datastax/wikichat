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
      tertiary: "var(--tertiary)",
      inverse: "var(--inverse)",
      body: "var(--background-body)",
      "bg-1": "var(--background-level1)",
      "bg-2": "var(--background-level2)",
      gray: "var(--gray)",
      mushroom: "var(--mushroom)",
      poppy: "var(--poppy)",
      turf: "var(--turf)",
      sky: "var(--sky)",
      bubblegum: "var(--bubblegum)",
      lemon: "var(--lemon)",
      surf: "var(--surf)",
      link: "var(--link)",
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
  plugins: [require('tailwind-scrollbar'),],
};
