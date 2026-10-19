/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151f33',
          950: '#070b14',
        },
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        energy: {
          normal: '#10b981',
          high: '#f59e0b',
          critical: '#ef4444',
          offline: '#64748b'
        }
      }
    },
  },
  plugins: [],
}
