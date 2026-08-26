/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#4f46e5',
          light: '#eef2ff',
        },
        day: {
          0: '#e5e7eb',
          red: '#ef4444',
          orange: '#f97316',
          yellow: '#eab308',
          green: '#22c55e',
        },
      },
      keyframes: {
        flicker: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
          '25%': { transform: 'scale(1.05) rotate(-2deg)' },
          '50%': { transform: 'scale(0.97) rotate(1deg)' },
          '75%': { transform: 'scale(1.04) rotate(2deg)' },
        },
        glowpulse: {
          '0%, 100%': { opacity: '0.45', transform: 'scale(1)' },
          '50%': { opacity: '0.75', transform: 'scale(1.15)' },
        },
      },
      animation: {
        flicker: 'flicker 1.8s ease-in-out infinite',
        glowpulse: 'glowpulse 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
