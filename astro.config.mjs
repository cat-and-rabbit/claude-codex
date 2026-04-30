// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import mdx from '@astrojs/mdx';

import sitemap from '@astrojs/sitemap';

function rehypeExternalLinks() {
  return (tree) => {
    const walk = (node) => {
      if (node.tagName === 'a' && node.properties && typeof node.properties.href === 'string') {
        if (/^https?:\/\//.test(node.properties.href)) {
          node.properties.target = '_blank';
          node.properties.rel = 'noopener noreferrer';
        }
      }
      if (node.children) {
        for (const child of node.children) walk(child);
      }
    };
    walk(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap()],

  markdown: {
    rehypePlugins: [rehypeExternalLinks]
  }
});
