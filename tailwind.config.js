/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}','./components/**/*.{js,jsx}','./context/**/*.{js,jsx}','./hooks/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        acc: 'var(--acc)',
        'acc-hover': 'var(--acc-hover)',
        adim: 'var(--adim)',
        abrd: 'var(--abrd)',
        grn: 'var(--grn)',
        gdim: 'var(--gdim)',
        gbrd: 'var(--gbrd)',
        err: 'var(--err)',
        errdim: 'var(--errdim)',
        surf: 'var(--surf)',
        s2: 'var(--s2)',
        s3: 'var(--s3)',
        t1: 'var(--t1)',
        t2: 'var(--t2)',
        t3: 'var(--t3)',
        tok: 'var(--bg)',
        token: 'var(--bg)',
      },
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
