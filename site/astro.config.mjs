// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  site: 'https://rounak.taptappers.club',
  outDir: '../docs',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  image: {
    // Disable image optimization - use images as-is from public folder
    service: { entrypoint: 'astro/assets/services/noop' },
  },
});
