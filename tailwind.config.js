/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      colors: {
        mystic: {
          50: '#f6f3ff',
          100: '#eee8ff',
          200: '#ddd1ff',
          300: '#c5b0ff',
          400: '#a785ff',
          500: '#8d5cf2',
          600: '#7742d5',
          700: '#6232af',
          800: '#4d2a86',
          900: '#34205a',
        },
        verdant: {
          50: '#eefbf4',
          100: '#daf5e7',
          200: '#b7ead2',
          300: '#86d9b3',
          400: '#55c490',
          500: '#31a970',
          600: '#22875a',
          700: '#1c6b49',
          800: '#1a543d',
          900: '#174533',
        },
        amber: {
          soft: '#fef3c7',
          warm: '#f59e0b',
        },
      },
      backgroundImage: {
        'gradient-mystic': 'linear-gradient(135deg, #8d5cf2 0%, #6d46cf 42%, #31a970 100%)',
        'gradient-soft': 'radial-gradient(circle at top left, rgba(141, 92, 242, 0.22), transparent 32%), radial-gradient(circle at top right, rgba(49, 169, 112, 0.2), transparent 30%), linear-gradient(180deg, #f7fcf8 0%, #f4f2ff 46%, #edf7f0 100%)',
        'gradient-liliana': 'radial-gradient(circle at top left, rgba(141, 92, 242, 0.38), transparent 34%), radial-gradient(circle at bottom right, rgba(49, 169, 112, 0.2), transparent 30%), linear-gradient(135deg, #6c42da 0%, #8d5cf2 52%, #3a9a72 100%)',
        'gradient-yiqing': 'radial-gradient(circle at top right, rgba(141, 92, 242, 0.24), transparent 34%), radial-gradient(circle at bottom left, rgba(49, 169, 112, 0.34), transparent 30%), linear-gradient(135deg, #1e7a56 0%, #31a970 48%, #7658d8 100%)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(119, 66, 213, 0.22), 0 0 36px rgba(49, 169, 112, 0.08)' },
          '100%': { boxShadow: '0 0 28px rgba(119, 66, 213, 0.34), 0 0 44px rgba(49, 169, 112, 0.16)' },
        },
      },
    },
  },
  plugins: [],
}
