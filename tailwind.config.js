/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0A1526',
          panel: '#112442',
          deep: '#0D1C34'
        },
        ink: {
          DEFAULT: '#1A1A1A'
        },
        cream: {
          DEFAULT: '#F2ECE1',
          soft: '#EAE3D4',
          panel: '#EBE3BF'
        },
        gold: {
          DEFAULT: '#D9A25C',
          muted: '#BAA057',
          light: '#E0CBA2'
        },
        neutral: {
          body: '#A0A0A0'
        },
        accent: {
          pink: '#EDA7DB'
        }
      },
      fontFamily: {
        hero: ['"Cormorant Garamond"', 'serif'],
        display: ['"DM Serif Display"', 'serif'],
        heading: ['"Bodoni Moda"', 'serif'],
        countdown: ['Cinzel', 'serif'],
        body: ['"EB Garamond"', 'serif'],
        support: ['Jost', 'sans-serif'],
        nav: ['AmstelvarAlpha', 'serif'],
        signature: ['Sacramento', 'cursive'],
        badge: ['Amiri', 'serif']
      },
      borderRadius: {
        panel: '86px',
        tile: '9999px'
      },
      spacing: {
        18: '4.5rem',
        30: '7.5rem',
        43: '10.75rem',
        45.5: '11.375rem'
      },
      letterSpacing: {
        eyebrow: '0.4em',
        navlink: '0.11em'
      },
      backgroundImage: {
        'gold-radial': 'radial-gradient(circle, rgba(217,162,92,0.35) 0%, rgba(217,162,92,0) 70%)',
        'navy-radial': 'radial-gradient(circle, rgba(17,36,66,0.6) 0%, rgba(10,21,38,0) 70%)',
        'accent-gradient': 'linear-gradient(90deg, #7FB0E0 0%, #EDA7DB 50%, #B98CE0 100%)'
      }
    }
  },
  plugins: []
}