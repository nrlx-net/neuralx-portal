/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nrlx: {
          bg: '#000000',
          surface: '#0A0A0A',
          el: '#141414',
          el2: '#1C1C1E',
          border: 'rgba(255,255,255,0.07)',
          accent: '#0A84FF',
          text: '#FFFFFF',
          muted: '#8E8E93',
          success: '#30D158',
          warning: '#FF9F0A',
          danger: '#FF453A',
          card: '#141414',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        display: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
