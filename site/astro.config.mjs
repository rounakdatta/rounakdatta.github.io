// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypeFigure from './src/lib/rehype-figure.mjs';
import rehypeSidenotes from './src/lib/rehype-sidenotes.mjs';

export default defineConfig({
  site: 'https://rounak.taptappers.club',
  trailingSlash: 'always',
  integrations: [
    mdx({ rehypePlugins: [rehypeFigure, rehypeSidenotes] }),
    // /about/ only redirects home, so it is not a page worth listing.
    sitemap({ filter: (page) => !page.endsWith('/about/') }),
  ],

  // Fonts are downloaded at build time and served from this site: no request to
  // Google, and a metric-matched fallback so text doesn't reflow when they land.
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'EB Garamond',
      cssVariable: '--font-serif',
      weights: [400, 600],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-mono',
      weights: [400],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Caveat',
      cssVariable: '--font-hand',
      weights: [500],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['cursive'],
    },
  ],

  // Hovering a link (or pressing on it) starts loading the page, so most clicks land instantly.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },

  image: {
    // AVIF at effort 2 encodes several times faster than the default for files a few percent larger.
    service: { entrypoint: 'astro/assets/services/sharp', config: { avif: { effort: 2 } } },
    layout: 'constrained',
    responsiveStyles: true,
    // Few, well-spaced widths: every width is an encode for every photo.
    breakpoints: [480, 800, 1200, 1600, 2000],
  },

  markdown: {
    processor: unified({ rehypePlugins: [rehypeFigure, rehypeSidenotes] }),
    // Both themes are written onto every token; global.css picks the one matching the reader's.
    // defaultColor: false, or Shiki writes the light colour inline and night mode can't override it.
    shikiConfig: { themes: { light: 'github-light', dark: 'github-dark-dimmed' }, defaultColor: false, wrap: true },
  },
});
