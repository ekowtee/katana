/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-green': '#0B1A12',
        'panel-green': '#162A1F',
        'surface-green': '#1E3628',
        'muted-green': '#2A4A38',
        'border-green': '#2E5240',
        'gold': '#C9A84C',
        'gold-light': '#D4B85E',
        'gold-muted': '#A18A42',
        'cream': '#F0EBE0',
        'cream-muted': '#C8C2B4',
        'dark-green': '#002b1b', // Legacy support
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
        ui: ['"Outfit"', 'sans-serif'],
        handwriting: ['"Great Vibes"', 'cursive'],
        serif: ['"Cormorant Garamond"', 'serif'],
      },
      backgroundImage: {
        'custom-gradient': 'linear-gradient(94.06deg, #CE1919 -1.21%, #FF5252 58.66%, #FFA3A3 116.84%)',
      },
      screens: {
        'msm': '360px',
        'xxsm': '390px',
        'xsm': '375px',
        'vsm': '393px',
        'rsm': '412px',
        'nsm': '414px',
        'small': '430px',
        'md': '768px',
        'lg': '1024px',
        "tablet": { min: '1090px', max: '1279px' },
        'xl': '1280px',
        'large': '1343px',
        '2xl': '1536px',
        'xxl': '1620px',
        'vl': '1728px',
        '3xl': '1800px',
        '4xl': '1912px',
        '5xl': '5120px',
        'pro13': '1440px',
        'pro16': '1792px',
        'iMac': '1867px',
      },
    },
  },
  plugins: [require('tailwindcss-motion')],
}
