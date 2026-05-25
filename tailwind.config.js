/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}','./components/**/*.{js,jsx}','./context/**/*.{js,jsx}','./hooks/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: { syne: ['var(--font-syne)','sans-serif'], dm: ['var(--font-dm)','sans-serif'] },
      keyframes: {
        blink:    { '0%,100%': { opacity:'1' }, '50%': { opacity:'0.4' } },
        gearspin: { to: { transform:'rotate(360deg)' } },
        dpulse:   { '0%,100%': { opacity:'0.3', transform:'scale(0.8)' }, '50%': { opacity:'1', transform:'scale(1.3)' } },
      },
      animation: {
        blink:    'blink 1.8s ease-in-out infinite',
        gearspin: 'gearspin 6s linear infinite',
        dpulse:   'dpulse 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
