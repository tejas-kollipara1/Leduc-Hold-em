/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: {
          gold: '#ffbe0b',
          cyan: '#00f5d4',
          magenta: '#f15bb5',
          purple: '#9b5de5',
          blue: '#3a86ff',
        }
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
        orbitron: ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
