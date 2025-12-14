import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const photoAlbums = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/photos' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    order: z.number().default(0),
    photos: z.array(z.object({
      src: z.string(),
      caption: z.string().optional(),
    })),
  }),
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/notes' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    description: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    url: z.string().optional(),
    github: z.string().optional(),
    logo: z.string().optional(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    special: z.boolean().default(false),
    internalUrl: z.string().optional(),
    order: z.number().default(0),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { notes, projects, photoAlbums, pages };
