import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#021C2F',
          900: '#052B49',
          800: '#083D66',
          700: '#0A5080',
          600: '#0D6399',
        },
        gold: {
          DEFAULT: '#FCCF09',
          dark: '#C9A507',
          muted: '#7A6204',
        },
        muted: '#A8BED0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
