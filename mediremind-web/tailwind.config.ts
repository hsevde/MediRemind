import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#534AB7',
        'primary-light': '#ede9fe',
        'primary-dark': '#4338a8',
      },
    },
  },
  plugins: [],
};

export default config;
