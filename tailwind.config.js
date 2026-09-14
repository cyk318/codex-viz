/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#120f16',
          100: '#1f1a26',
          200: '#342b3f',
          300: '#d8d5db',
          400: '#a6a2aa',
          500: '#8d8992',
          600: '#aeaab2',
          700: '#382f43',
          800: '#2d2636',
          900: '#19151e',
          950: '#120f15'
        },
        blue: {
          50: '#221b2b',
          100: '#31253f',
          200: '#d2b7f2',
          300: '#be98ed',
          400: '#aa82dc',
          500: '#b58be8',
          600: '#bc93ee',
          700: '#ac81e1',
          900: '#382b48',
          950: '#1e1826'
        }
      }
    }
  },
  plugins: []
};
