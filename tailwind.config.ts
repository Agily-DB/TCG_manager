import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html',
  ],
  theme: {
    extend: {
      colors: {
        pokedex: {
          red:     '#CC0000',
          darkred: '#990000',
          black:   '#1a1a1a',
          panel:   '#2a2a2a',
          screen:  '#1e2a1e',
          yellow:  '#FFCB05',
          blue:    '#3B4CCA',
          white:   '#F5F5F5',
          gray:    '#888888',
        },
        status: {
          pending:     '#FFCB05',
          in_progress: '#3B4CCA',
          completed:   '#22c55e',
        },
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        ui:   ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
