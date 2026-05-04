import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const pagesCollection = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero: z
      .object({
        title: z.string(),
        subtitle: z.string(),
        missionText: z.string(),
      })
      .optional(),
  }),
});

export const collections = {
  pages: pagesCollection,
};
