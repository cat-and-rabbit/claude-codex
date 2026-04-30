import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
    loader: glob({
        pattern: '**/*.md',
        base: './src/content/articles'
    }),
    schema: z.object({
        title: z.string(),
        description: z.string(),
        chapter: z.enum(['liber-1', 'liber-2', 'liber-3', 'liber-4']),
        order: z.number(),
        lastVerified: z.date(),
        targetVersion: z.string(),
        estimatedMinutes: z.number().optional(),
        draft: z.boolean().default(false),
    })
})

export const collections = {
    articles
}