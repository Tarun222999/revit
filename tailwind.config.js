/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f7f7f4',
          100: '#ecebe4',
          300: '#b9b6a8',
          500: '#767160',
          700: '#3f3b32',
          900: '#181713',
        },
        ember: {
          400: '#d9824b',
          500: '#c66a33',
        },
        moss: {
          400: '#7f9f6a',
          500: '#607f51',
        },
        sky: {
          400: '#6aa7bf',
          500: '#4d8da6',
        },
      },
      borderRadius: {
        app: '8px',
      },
    },
  },
  plugins: [],
};
