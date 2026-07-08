import type { Config } from 'tailwindcss';

// Design tokens for the "operations console" direction:
// a floodlit control-room palette grounded in the stadium subject itself
// (pitch green for nominal status, floodlight white for data, amber/red for
// escalating risk) rather than a generic dashboard theme.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        console: {
          bg: '#0A0E13',
          panel: '#121821',
          panelAlt: '#182130',
          border: '#26313F',
          text: '#EAF1F6',
          muted: '#8697A6',
        },
        pitch: {
          DEFAULT: '#3FA34D',
          soft: '#2C7A3A',
        },
        floodlight: '#F4F7F9',
        risk: {
          nominal: '#3FA34D',
          elevated: '#E8A33D',
          high: '#E8722D',
          critical: '#E14B4B',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(38,49,63,0.6), 0 8px 24px -12px rgba(0,0,0,0.6)',
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(225,75,75,0.55)' },
          '100%': { boxShadow: '0 0 0 10px rgba(225,75,75,0)' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
