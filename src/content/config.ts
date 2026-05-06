// USMR Phase 4.1 — Astro Content Collections Zod schemas.
// Per spec site-content §"Type-Safe Content Schemas":
//   - `pages` requires title, description, eyebrow, headline, lede, ctas[]
//   - `pages/writing` (sub-collection) adds required published (ISO date)
//     + tags[]; accepts optional updated, cover, accent, repo
//   - `authors` requires name, slug; accepts optional bio, avatar, links[]
//
// During Phase 4 migration the marketing MDX files don't all carry the
// new fields yet. The required-field set is enforced; unmigrated files
// MUST be updated in the same change that ships them through to a route
// (Phase 4.2 / 5.x). vision.mdx is already migrated in this commit.

import { defineCollection, z } from "astro:content";

/** Single call-to-action chip. */
const cta = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  /** Optional rel attribute for outbound links. */
  rel: z.string().optional(),
  /** Optional cosmetic variant; defaults to "primary" when consumed. */
  variant: z.enum(["primary", "secondary", "ghost"]).optional(),
});

/** External link on an author profile. */
const authorLink = z.object({
  label: z.string().min(1),
  href: z.string().url(),
});

/** Base frontmatter shared by every marketing page. */
const pageBase = z.object({
  title: z.string().min(1),
  /** SEO description; lint-meta will enforce 80–160 chars at build time. */
  description: z.string().min(1),
  eyebrow: z.string().min(1),
  headline: z.string().min(1),
  lede: z.string().min(1),
  ctas: z.array(cta).default([]),
  /** Optional hero font override (e.g. "fraunces" for italic-display). */
  heroFont: z.enum(["space-grotesk", "fraunces", "inter-tight"]).optional(),
  /** Optional accent token override (e.g. "--accent-warm"). */
  accent: z.string().optional(),
  /** Free-form taxonomy tags; reused by /standards and writing. */
  tags: z.array(z.string()).default([]),
});

const pages = defineCollection({
  type: "content",
  schema: pageBase,
});

const writing = defineCollection({
  type: "content",
  schema: pageBase.extend({
    /** ISO 8601 publication date — anchors RSS + sort order. */
    published: z.coerce.date(),
    /** Optional update marker; if present, MUST be ≥ published. */
    updated: z.coerce.date().optional(),
    /** Hero image URL or path. */
    cover: z.string().optional(),
    /** Companion source repo (for code-anchored posts). */
    repo: z.string().url().optional(),
    /** Author slug — must resolve in the `authors` collection. */
    author: z.string().optional(),
    /** Hide post from RSS + index until non-draft. */
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  type: "content",
  schema: z.object({
    name: z.string().min(1),
    /** URL slug — kebab-case, matches filename. */
    slug: z.string().min(1),
    bio: z.string().optional(),
    avatar: z.string().optional(),
    links: z.array(authorLink).default([]),
  }),
});

export const collections = { pages, writing, authors };
