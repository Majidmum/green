/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./hooks/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#123D2A",
          DEFAULT: "#00A651",
          light: "#E8F5E9",
          cream: "#FAF8F2",
          ink: "#17231B",
        },
        // Семантические цвета: значения меняются между светлой и тёмной темой (см. globals.css)
        page: "rgb(var(--page) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        tint: "rgb(var(--tint) / <alpha-value>)",
        heading: "rgb(var(--heading) / <alpha-value>)",
        body: "rgb(var(--body) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
      },
      boxShadow: {
        soft: "0 8px 30px rgba(18, 61, 42, 0.08)",
        lift: "0 16px 48px rgba(18, 61, 42, 0.16)",
      },
    },
  },
  plugins: [],
};
