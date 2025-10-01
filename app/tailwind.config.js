/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',       // pour tout ce qui est dans app/
    './components/**/*.{js,ts,jsx,tsx}', // pour les composants réutilisables
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
