// Content collections: long-form text kept as Markdown in src/content/.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const legal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legal' }),
  schema: z.object({
    title: z.string(),
    /** Shown as published on the page */
    lastUpdated: z.string(),
  }),
});

export const collections = { legal };
