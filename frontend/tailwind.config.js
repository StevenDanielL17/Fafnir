/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        fafnir: {
          black: '#0A0A0F',
          dark: '#0D0D1A',
          elevated: '#12121F',
          green: '#00C896',
          'green-light': '#00E8AD',
          gold: '#D4AF37',
          'gold-light': '#F0D060',
          text: '#F5F5F0',
          muted: '#8A8A9A',
          'glass-border': 'rgba(255, 255, 255, 0.12)',
          // Legacy (old pages still use these)
          card: '#161B22',
          border: '#30363D',
          blue: '#58A6FF',
        },
      },
      fontFamily: {
        display: ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
        sans: ['var(--font-dm-sans)', 'DM Sans', 'sans-serif'],
      },
      borderRadius: {
        glass: '20px',
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
        float: 'float 4s ease-in-out infinite',
        'float-delayed': 'float 4s ease-in-out 1s infinite',
        'pulse-green': 'glassPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
