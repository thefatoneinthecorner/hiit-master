import type { Config } from 'tailwindcss';

export default {
  content: ['./app/index.html', './app/src/**/*.{ts,tsx}', './stories/**/*.{ts,tsx,js,jsx,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
