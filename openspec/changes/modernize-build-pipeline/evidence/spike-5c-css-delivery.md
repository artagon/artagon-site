# Spike 5C — CSS delivery

**Recommendation: keep the stable public CSS delivery for now; revisit a Vite migration as a coordinated contract change.** The local transform retained the inspected CSS structures, but importing the stylesheet through Vite changed its URL and broke the current stable-file minifier. Browser visual, forced-colors, and cache behavior remain unverified.

## Method and observed CSS

In a disposable copy outside the worktree, with Node `v26.13.0`, Astro `7.4.5`, and the existing Lightning CSS `1.33.0`, compared the production `scripts/minify-theme-css.mjs` output with a direct Lightning CSS transform using the configured targets Chrome 111, Edge 111, Firefox 114, Safari 16.4, and iOS Safari 16.4. Also built an actual Vite variant by copying the theme into the copy's `src/styles/`, importing it from `BaseLayout.astro`, removing the stable link and public source in that copy only, and running `npx --no-install astro build` (exit 0).

PostCSS inspection of the source, existing minified copy, direct Lightning output, and the Vite BaseLayout bundle found the ordered layers `reset`, `tokens`, `utilities`, `components`, `overrides`; both themed `:root[data-theme=…]` canvas declarations; the forced-colors selectors; and `-webkit-backdrop-filter` declarations. The source, existing minifier, and Lightning output each had 30 OKLCH declarations; Lightning rewrote syntax but retained the two theme `--bg` values. Hex literals in this source occur in masks/gradients; no separate hex fallback for the two theme canvas declarations was observed. Lightning output retained/rewrote hex values, but a structural count is not proof of color equivalence in every browser. The current postbuild CSS was 24,055 bytes; the direct Lightning theme-only result was 23,777 bytes. The Vite BaseLayout bundle was 32,490 bytes and also contains component CSS, so its size is not directly comparable.

## Delivery and integration

- The Vite variant referenced `/_astro/BaseLayout.BEFWbbki.css` on the homepage, and `.build/dist/assets/theme.css` was absent. The existing `minify-theme-css.mjs` exited 1 with `ENOENT` for that stable path. A production migration must update that contract rather than merely move the file.
- Running `scripts/sri.mjs` on the variant exited 0 and added `integrity` and `crossorigin` to the hashed BaseLayout stylesheet. The existing rule intentionally does not add SRI to stable `/assets/theme.css`.
- Extracted and executed the actual `Prepare cache purge URLs` workflow step against each disposable tree. The current tree's manifest included `https://artagon.com/assets/theme.css`; the Vite variant's did not, and both excluded hashed `/_astro/` assets. This is an observed manifest difference, not a live Cloudflare purge.
- A migration would lose the stable public URL and its existing purge/minifier assumptions, and would need coordinated SRI, cache, consumer, and design regression checks. No browser or Cloudflare requests were made.

## Immutability guard

The task's combined unstaged, staged, and declared-root untracked guard exited 0 on the production worktree before and after the experiments. In a separate disposable Git fixture, a staged file and then an untracked file under `scripts/` each made the same guard exit 1; removing the probe restored exit 0. `vitest run tests/lint-scoped-package-versions.test.mts` exited 0.
