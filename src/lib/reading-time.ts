/**
 * USMR Phase 5.5.11 Task #30 — shared reading-time helper hoisted
 * out of /writing/index.astro so the index card and post detail
 * byline cannot drift. 220 wpm is the WPM widely used by Medium /
 * Substack-class readers; floor of 1 minute prevents "0 min read"
 * on micro-posts.
 */

/** Words-per-minute baseline for body-text reading. */
export const READING_WPM = 220;

/**
 * Estimate reading time in whole minutes from a body string.
 * Returns at least 1 minute. Pass the rendered MDX body via
 * `post.body` (Astro 6 glob loaders expose it).
 */
export function readingMinutes(body: string | undefined): number {
  if (!body) return 1;
  const words = body.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / READING_WPM));
}
