// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

export default defineConfig({
  site: 'https://rounak.taptappers.club',
  integrations: [mdx()],
  markdown: {
    processor: unified({
      shikiConfig: { theme: 'github-light', wrap: true },
    }),
  },
});
