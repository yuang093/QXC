/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mint: '#b8e6c8',
        pink: '#ff9eb5',
        purple: '#c89ec7',
        cream: '#fff8d6',
        blue: '#88c8e8',
        ink: '#2a1f3d',
        retro: {
          shadow: '#2a1f3d',
        },
      },
      fontFamily: {
        vt323: ['VT323', 'monospace'],
        pixel: ['"Press Start 2P"', 'monospace'],
        screen: ['Silkscreen', 'monospace'],
        mono: ['"DM Mono"', 'monospace'],
      },
      boxShadow: {
        retro: '4px 4px 0 #2a1f3d',
        'retro-sm': '3px 3px 0 #2a1f3d',
        'retro-lg': '6px 6px 0 #2a1f3d',
        'retro-pink': '4px 4px 0 #c89ec7',
        'retro-yellow': '4px 4px 0 #ffd93d',
      },
      animation: {
        'marquee': 'marquee 20s linear infinite',
        'blink': 'blink 1s steps(2) infinite',
        'wiggle': 'wiggle 0.3s ease-in-out infinite',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};
