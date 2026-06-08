import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: { ampersand: { 50: '#eef8ff', 100: '#d9efff', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' } },
      boxShadow: { soft: '0 12px 30px rgba(15, 23, 42, 0.08)' },
    },
  },
  plugins: [],
};
export default config;
