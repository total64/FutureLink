/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#18b87d',
          dark: '#0f8f62',
        },
        ink: {
          DEFAULT: '#173028',
          soft: '#3d5248',
        },
        paper: '#f4faf7',
        line: '#dceae3',
        mint: '#e7f8f1',
        match: '#e5f6ec',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 48, 40, 0.04), 0 12px 32px rgba(23, 48, 40, 0.05)',
      },
    },
  },
  plugins: [],
}
