/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'serif': ['Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        '3xl': '0 35px 60px -12px rgba(0, 0, 0, 0.25)',
        'glow': '0 0 20px rgba(255, 255, 255, 0.3)',
        'christmas': '0 0 30px rgba(220, 38, 127, 0.5)',
      },
      colors: {
        christmas: {
          red: '#DC2626',
          green: '#059669',
          gold: '#F59E0B',
        }
      }
    },
  },
  plugins: [],
}