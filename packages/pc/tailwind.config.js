/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        'app-width': '385px',
        'app-height': '640px',
        '3px': '3px',
        '13px': '13px',
        '15px': '15px',
        '19px': '19px',
        '44px': '44px',
        '247px': '247px'
      },
      colors: {
        primary: '#3671EE'
      },
      fontSize: {
        xxs: ['0.625rem', { lineHeight: '0.875rem' }]
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      },
      letterSpacing: {
        'ls--2': '-0.2px'
      }
    }
  },
  plugins: []
}
