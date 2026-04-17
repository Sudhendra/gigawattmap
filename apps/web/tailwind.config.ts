import type { Config } from 'tailwindcss';

/**
 * Tailwind v4 reads its real theme from the @theme block in src/app/globals.css.
 * This file is kept for editor IntelliSense and to declare the content scan paths.
 * Do NOT add color hex values here — every token resolves through a CSS variable
 * declared in globals.css (see SPEC §5).
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--bg-base)',
        'bg-panel': 'var(--bg-panel)',
        'bg-elevated': 'var(--bg-elevated)',
        'text-primary': 'var(--text-primary)',
        'text-muted': 'var(--text-muted)',
        'text-subtle': 'var(--text-subtle)',
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
    },
  },
};

export default config;
