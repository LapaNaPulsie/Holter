/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#142E49', soft: '#3B5068' },
        burgundy: { DEFAULT: '#6B1F25', dark: '#55181D' },
        cream: '#EFDBCD',
        powder: '#E5D1C1',
        offwhite: '#FFF5EB',
        caramel: '#C99A70',
      },
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        soft: '0 6px 24px -8px rgba(20, 46, 73, 0.18)',
      },
    },
  },
  plugins: [],
};
