/// <reference types="astro/client" />

// USMR Phase 5.1d — augmentations for non-TS asset imports. CSS side-effect
// imports from React islands (e.g. `import "./TrustChainIsland.css"`) need
// a module declaration so the strict TS config doesn't flag them as
// unresolved. Astro/vite handle the actual bundling at build time.
declare module "*.css";
