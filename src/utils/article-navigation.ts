import type { CollectionEntry } from 'astro:content';
import { chapters } from '../data/chapters';

type Article = CollectionEntry<'articles'>;

/**
 * 全記事を「章順 → 章内 order 順」でソートした配列を返す
 */
export function sortArticlesInReadingOrder(articles: Article[]): Article[] {
  // 章の表示順を辞書化（liber-1 → 0, liber-2 → 1, ...）
  const chapterOrder = new Map(
    chapters.map((c, index) => [c.id, index])
  );

  return [...articles].sort((a, b) => {
    const chapterDiff =
      (chapterOrder.get(a.data.chapter) ?? 0) -
      (chapterOrder.get(b.data.chapter) ?? 0);

    if (chapterDiff !== 0) return chapterDiff;
    return a.data.order - b.data.order;
  });
}

/**
 * 指定した記事の「前の記事」「次の記事」を返す
 */
export function getAdjacentArticles(
  currentArticle: Article,
  allArticles: Article[]
): { prev: Article | null; next: Article | null } {
  const sorted = sortArticlesInReadingOrder(allArticles);
  const currentIndex = sorted.findIndex((a) => a.id === currentArticle.id);

  if (currentIndex === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: currentIndex > 0 ? sorted[currentIndex - 1] : null,
    next: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null,
  };
}