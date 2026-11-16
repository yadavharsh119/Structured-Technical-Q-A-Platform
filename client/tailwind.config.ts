import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#171717',
        body: '#4A5568',
        muted: '#6B7280',
        line: '#E5E7EB',
        tint: '#F3F4F6',
        secondary: '#2D2D2D',
        success: '#22C55E',
        deco: '#9CA3AF',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1152px',
      },
    },
  },
  plugins: [],
} satisfies Config;

