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
import { glob } from "astro/loaders";

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

/**
 * The canonical bridge story (USMR site-bridge-story §"Canonical Bridge
 * Sentence"). Schema reserved for the `bridge` frontmatter field on
 * page MDX entries; populated by `platform.mdx` only. The earlier
 * Phase-5.x plan to add `scripts/lint-bridge.mjs` enforcing single-
 * source on `/platform` was deferred — `/platform` never wired
 * `<Content />` (the route mounts `PillarsIsland` directly), so no
 * route reads the bridge frontmatter today. `variants[]` remains the
 * allow-list of approved paraphrases for any future consumer.
 */
const bridgeStory = z.object({
  sentence: z.string().min(1),
  variants: z.array(z.string()).default([]),
});

/**
 * Optional on-ramp/design-partner card. Only home.mdx populates this today;
 * the top-strip labels frame the program (left) and current status (right).
 */
const onRamp = z.object({
  programLabel: z.string().min(1),
  statusLabel: z.string().min(1),
  headline: z.string().min(1),
  lede: z.string().min(1),
  ctas: z.array(cta).default([]),
  /**
   * Title for the contact mini-card; rows themselves come from `ORG`. Must
   * be present and non-empty in frontmatter — no default, so a missing key
   * fails the build with a Zod validation error rather than silently
   * rendering "Primary contacts".
   */
  contactsTitle: z.string().min(1),
});

/** Base frontmatter shared by every marketing page. */
const pageBase = z.object({
  title: z.string().min(1),
  /**
   * SEO description — bounded 80-160 chars to fit Google's SERP
   * truncation window. USMR Phase 5.5.14 promoted this from a
   * `lint-meta will enforce…` comment (the `lint:meta` script
   * never existed) to a Zod-enforced bound; over-length descriptions
   * now fail at content-load time, exactly where the violation is
   * authored.
   */
  description: z.string().min(80).max(160),
  eyebrow: z.string().min(1),
  headline: z.string().min(1),
  lede: z.string().min(1),
  ctas: z.array(cta).default([]),
  // USMR Phase 5.5.16-pt163 — `heroFont` frontmatter field removed.
  // Pre-pt163 the schema accepted ["space-grotesk", "fraunces",
  // "inter-tight"] but those token names don't match the runtime
  // canonical set (["grotesk", "fraunces", "dmserif", "mono"] per
  // [data-hero-font] in theme.css). AND no page actually read the
  // value to propagate onto <html data-hero-font> — every page
  // rendered BaseLayout's hardcoded "fraunces" default. Pure dead
  // frontmatter with a broken schema. If per-page hero-font is
  // re-introduced later, both schema enum AND BaseLayout wire-up
  // need to land together.
  // USMR Phase 5.5.16-pt164 — `accent` field removed. Pre-pt164 the
  // schema accepted `accent: z.string().optional()` but ZERO .mdx
  // files set the value AND ZERO pages read `post.data.accent`. Pure
  // dead schema. Per-page accent override is already runtime-toggleable
  // via the Tweaks panel (`[data-accent]` on <html>); a content-level
  // override would need both new schema + a BaseLayout wire-up to land
  // together (mirrors the pt163 heroFont removal).
  /** Free-form taxonomy tags; reused by /standards and writing. */
  tags: z.array(z.string()).default([]),
  /**
   * Optional bridge story — only `platform.mdx` populates this. The
   * planned Phase-5.x `scripts/lint-bridge.mjs` consumer was deferred
   * (see `bridgeStory` schema docstring above for context); the field
   * remains reserved for any future route that wires it up.
   */
  bridge: bridgeStory.optional(),
  /**
   * Optional on-ramp card — only `home.mdx` populates this today. Rendered
   * near the bottom of `/` as a design-partner CTA with a contact mini-card.
   */
  onRamp: onRamp.optional(),
});

// Astro 6 content layer: each collection declares its own loader so
// pages, writing, and authors collections can be authored as siblings
// under src/content/. Pre-pt414 the comment claimed writing posts
// nested under src/content/pages/writing/ — that's INVERTED; the
// actual `writing` loader (line 131 below) uses
// `base: "./src/content/writing"` (the conventional root path), and
// `src/content/pages/writing/` does not exist on disk.

const pages = defineCollection({
  loader: glob({
    pattern: "*.{md,mdx}",
    base: "./src/content/pages",
  }),
  schema: pageBase,
});

const writing = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/writing",
  }),
  schema: pageBase.extend({
    /** ISO 8601 publication date — anchors RSS + sort order. */
    published: z.coerce.date(),
    /** Optional update marker; if present, MUST be ≥ published. */
    updated: z.coerce.date().optional(),
    /** Hero image URL or path. */
    cover: z.string().optional(),
    // USMR Phase 5.5.16-pt164 — `repo` field removed. Pre-pt164 the
    // schema accepted `repo: z.string().url().optional()` for "code-
    // anchored posts" companion source links, but ZERO .mdx files
    // set the value AND ZERO consumers read post.data.repo. Pure
    // dead schema field. Re-introduce when the first code-anchored
    // post lands AND the post-detail layout actually renders the
    // link (mirrors the pt163 heroFont + pt164 accent pattern).
    /** Author slug — must resolve in the `authors` collection. */
    author: z.string().optional(),
    /** Hide post from RSS + index until non-draft. */
    draft: z.boolean().default(false),
  }),
});

const authors = defineCollection({
  loader: glob({
    pattern: "**/*.{md,mdx}",
    base: "./src/content/authors",
  }),
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
