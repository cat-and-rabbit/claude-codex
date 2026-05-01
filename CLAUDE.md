# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

「Claude Code 写本」(Codex Claudia) — a Japanese guide for Claude Code, published as a static Astro site. Content is structured as four "Liber" chapters that progress from introduction to advanced usage.

For project-level orientation (chapter overview, tech stack, how to run locally), see [README.md](./README.md). This document focuses on editorial conventions and internal implementation notes.

## Commands

```bash
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to ./dist/
npm run preview  # Preview the built site
```

No test or lint scripts are configured. Node 22.12+ required (see `engines` in package.json).

## Content architecture

Articles live in `src/content/articles/<lang>/*.md` (currently `ja` only) under an Astro content collection (`src/content.config.ts`). Required frontmatter:

- `chapter`: `liber-1` | `liber-2` | `liber-3` | `liber-4` (chapters defined in `src/data/chapters.ts`)
- `order`: integer, sorts within a chapter
- `lastVerified`: date the content was checked against current Claude Code behavior
- `targetVersion`: Claude Code version string (e.g. `"2.x"`)
- `estimatedMinutes` (optional), `draft` (optional, defaults false; draft articles are excluded from listings)

Reading order = chapter index in `chapters.ts` → `order`. Prev/next navigation logic is in `src/utils/article-navigation.ts`.

The dynamic route `src/pages/ja/articles/[...slug].astro` strips the `ja/` prefix from article IDs, so `articles/ja/foo.md` becomes `/ja/articles/foo`. Internal cross-links between articles must use that exact path format.

`astro.config.mjs` includes a small inline rehype plugin that opens `http(s)://` links in a new tab. Relative internal links stay in the same tab.

## CSS gotcha — drop-cap

`src/layouts/ArticleLayout.astro` applies a drop-cap to the first paragraph of the article body. The selector uses the **child combinator** (`.article-body > :global(p:first-of-type)`); without `>`, the rule leaks into the first letter of every blockquote. Don't revert this to a descendant selector.

## Editorial conventions

These shape every article and are not codified elsewhere in the repo.

### Verify before claiming

When describing Claude Code features, commands, or shortcuts, **check the official docs at https://code.claude.com/docs/ja/** before writing. Past mistakes (wrong `@` mention behavior, missing environment caveat on `/btw`) caused user-visible inaccuracies. Always confirm:

1. Does the feature work as described in current Claude Code 2.x?
2. Which environments support it? CLI / VSCode extension / Desktop / Web frequently differ.
3. Are there plan or version requirements?

The book assumes a **VSCode extension** reader unless noted. Flag CLI-only features explicitly (e.g. 「ターミナルのみ」).

### Concept placement

Introduce concepts where the reader hands-on encounters them, not preemptively. 序 stays at the "what is this / how do I install" level — permissions, compaction, sub-agents are deferred to chapters where they connect to a concrete action.

### Liber II (基礎) scope line

Liber II caps at "commands + the first CLAUDE.md". Skills, sub-agents, MCP, hooks, multiple/nested CLAUDE.md, monorepo concerns all belong in Liber IV (応用), even when topically related.

### Article style

- である調 throughout (not ですます).
- Body shape: one-line framing → `##` sections (`###` subsections as needed) → optional closing transition between `---` separators → `## 参考情報` with external links.
- Cross-chapter references use the chapter name (e.g. 「実践の章で扱う」), not article titles, since chapter scope is more stable than individual articles.
- URLs marked `<!-- パスは推測。要確認 -->` in references are unverified guesses; resolve them when possible.

## Git workflow

Branches use `feat/<scope>` or `fix/<scope>` and merge into `main` with `--no-ff` (recent: `feat/liber-2-content`). Commit messages: imperative subject + bulleted body. Push only on explicit instruction.
