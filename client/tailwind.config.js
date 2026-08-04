/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0a0a0f',
          soft: '#0d0b14',
          panel: '#12101a',
          card: '#1a1726'
        },
        crystal: {
          DEFAULT: '#2d1854',
          deep: '#1a0a2e',
          mid: '#6b3fa0',
          light: '#9b6dd7',
          glow: '#c084fc'
        },
        amethyst: {
          DEFAULT: '#7c3aed',
          bright: '#a855f7',
          pale: '#c4b5fd'
        },
        neutral: {
          body: '#9ca3af',
          muted: '#6b7280',
          border: '#ffffff12'
        }
      },
      fontFamily: {
        brand: ['"Oswald"', 'sans-serif'],
        heading: ['"Oswald"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      borderRadius: {
        card: '8px',
        panel: '12px'
      },
      spacing: {
        18: '4.5rem',
        30: '7.5rem'
      },
      letterSpacing: {
        eyebrow: '0.25em',
        wide: '0.08em'
      },
      backgroundImage: {
        'crystal-radial': 'radial-gradient(ellipse at center, rgba(124,58,237,0.15) 0%, rgba(10,10,15,0) 70%)',
        'void-radial': 'radial-gradient(ellipse at center, rgba(45,24,84,0.3) 0%, rgba(10,10,15,0) 70%)',
        'crystal-gradient': 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%)',
        'surface-gradient': 'linear-gradient(180deg, rgba(26,23,38,0.8) 0%, rgba(10,10,15,0.95) 100%)'
      },
      boxShadow: {
        'crystal': '0 0 20px rgba(124,58,237,0.15)',
        'crystal-lg': '0 0 40px rgba(124,58,237,0.2)',
        'crystal-glow': '0 0 60px rgba(168,85,247,0.25)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 20s linear infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        drift: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    }
  },
  plugins: []
}