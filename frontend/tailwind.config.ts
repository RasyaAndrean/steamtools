import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#000000',
          50: '#f7f7f7',
          100: '#e3e3e3',
          200: '#c8c8c8',
          300: '#a4a4a4',
          400: '#7b7b7b',
          500: '#525252',
          600: '#3d3d3d',
          700: '#292929',
          800: '#1a1a1a',
          900: '#0a0a0a',
          950: '#000000',
        },
        secondary: {
          DEFAULT: '#ffffff',
          50: '#ffffff',
          100: '#fafafa',
          200: '#f5f5f5',
          300: '#f0f0f0',
          400: '#e8e8e8',
          500: '#d4d4d4',
          600: '#a3a3a3',
          700: '#737373',
          800: '#525252',
          900: '#404040',
          950: '#262626',
        },
        accent: {
          DEFAULT: '#ff0000',
          50: '#fff1f1',
          100: '#ffe1e1',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff6b6b',
          500: '#ff0000',
          600: '#e60000',
          700: '#cc0000',
          800: '#a30000',
          900: '#7a0000',
          950: '#4d0000',
        },
      },
      borderWidth: {
        '3': '3px',
        '5': '5px',
        '6': '6px',
      },
      boxShadow: {
        'brutal': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-lg': '8px 8px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-sm': '2px 2px 0px 0px rgba(0, 0, 0, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
