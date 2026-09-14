/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./public/**/*.html",
  ],
  theme: {
    extend: {
      colors: {
        // 薄荷白 + 松针绿
        paper: '#EFF6F0',
        ink: '#202922',
        pine: {
          light: '#DAEADB',
          DEFAULT: '#17634F',
          deep: '#134E3F',
        },
        sage: '#BFD2C1',
        moss: '#586A5D',
        warn: '#8A5A12',
      },
      fontFamily: {
        mono: ['Consolas', 'SF Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'hard-xs': '1.5px 1.5px 0 #202922',
        'hard-sm': '2px 2px 0 #202922',
        'hard': '4px 4px 0 #202922',
        'hard-lg': '7px 7px 0 #202922',
        'hard-xl': '8px 8px 0 #202922',
      },
    },
  },
  plugins: [],
}
