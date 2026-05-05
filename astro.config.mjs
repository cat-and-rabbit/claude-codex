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

function remarkRemoveComments() {
  return (tree) => {
    function isHtmlComment(node) {
      return node.type === 'html' && typeof node.value === 'string' && node.value.trimStart().startsWith('<!--');
    }
    function walk(node) {
      if (!node.children) return;
      node.children = node.children.filter(child => !isHtmlComment(child));
      node.children.forEach(walk);
    }
    walk(tree);
  };
}

// https://astro.build/config
export default defineConfig({
  // TODO: デプロイ先の URL に変更してください（サイトマップと OGP の og:url に使用されます）
  site: 'https://claude-codex.pages.dev/',

  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [mdx(), sitemap()],

  markdown: {
    remarkPlugins: [remarkRemoveComments],
    rehypePlugins: [rehypeExternalLinks]
  }
});
