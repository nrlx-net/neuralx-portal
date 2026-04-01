/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        nrlx: {
          bg: '#0a0a0a',
          surface: '#111111',
          card: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#00d4aa',
          'accent-dim': '#00a886',
          text: '#e5e5e5',
          muted: '#888888',
          danger: '#ff4444',
          warning: '#ffaa00',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
        display: ['Eurostile', 'Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
