/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        border: "var(--color-border)",

        // text colors as a group -> classes: text-text-primary, text-text-secondary
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
        },

        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",

        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
      },
      borderRadius: {
        xl: "var(--radius-xl)", // your request: use rounded-xl everywhere
        "2xl": "var(--radius-2xl)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
    },
  },
  plugins: [],
};
