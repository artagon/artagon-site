# Artagon Logo Assets

Comprehensive logo package generated from the `artagon-logo` submodule.

## 📦 Available Assets

### Full Logo (Mark + Wordmark)

Complete logo with emblem and text wordmark.

- `logo-full-1200.png` - 1200×800px (High-res for large displays, presentations)
- `logo-full-800.png` - 800×533px (Standard web use)
- `logo-full-400.png` - 400×267px (Small web use, email signatures)

**Use cases:**

- Website headers and footers
- Email signatures
- Presentations and documents
- Print materials

### Logo Mark (Emblem Only)

Just the Artagon shield/emblem without text.

- `logo-mark-512.png` - 512×512px (High-res app icons, large displays)
- `logo-mark-256.png` - 256×256px (Standard app icons)
- `logo-mark-128.png` - 128×128px (Desktop icons)
- `logo-mark-64.png` - 64×64px (Small icons, UI elements)
- `logo-mark-32.png` - 32×32px (Favicons, compact UI)

**Use cases:**

- App icons and favicons
- Social media profile pictures
- UI elements and buttons
- Loading indicators
- Watermarks

### Wordmark (Text Only)

Just the "Artagon" text without the emblem.

- `logo-wordmark-800.png` - Max width 800px
- `logo-wordmark-400.png` - Max width 400px
- `logo-wordmark-200.png` - Max width 200px

**Use cases:**

- Text-heavy layouts where space is limited
- Navigation bars
- Footer credits
- Compact headers

### Square Logo

Logo mark in square format for social media profiles.

- `logo-square-1200.png` - 1200×1200px (High-res social media)
- `logo-square-512.png` - 512×512px (Standard social media)

**Use cases:**

- Twitter/X profile picture
- LinkedIn company logo
- Facebook page profile
- Instagram profile
- App store listings

### Open Graph Image

Optimized for social media link previews.

- `og-image.png` - 1200×630px (Facebook, Twitter, LinkedIn link preview)

**Use cases:**

- Website meta tags (`<meta property="og:image">`)
- Social media link sharing
- Article thumbnails

### Horizontal Lockup

Logo arranged horizontally (currently same as full logo).

- `logo-horizontal-800.png` - 800px wide

**Use cases:**

- Wide headers and banners
- Email headers
- Presentation title slides

## 🎨 Usage Guidelines

### Clear Space

Always maintain a minimum clear space around the logo equal to the height of the "A" in Artagon.

### Minimum Sizes

- **Full logo:** Minimum width 200px (digital), 1 inch (print)
- **Logo mark:** Minimum 24px × 24px (digital), 0.25 inch (print)
- **Wordmark:** Minimum width 100px (digital), 0.5 inch (print)

### Color Variations

The logos have a dark background. For light backgrounds:

- Use the provided PNG with transparency
- Ensure sufficient contrast (minimum 4.5:1 ratio)

### Don'ts

- ❌ Don't stretch or distort the logo
- ❌ Don't change colors (use approved brand colors)
- ❌ Don't add effects (shadows, glows) unless part of brand guidelines
- ❌ Don't rotate the logo
- ❌ Don't place on busy backgrounds without sufficient contrast

## 🔧 Component Usage

### Astro Components

```astro
---
// Use the Logo component with different variants
import Logo from '../components/Logo.astro';
---

<!-- Default: SVG mark with wordmark -->
<Logo showWordmark={true} />

<!-- PNG variant -->
<Logo usePNG={true} size={64} />

<!-- Just the mark (no wordmark) -->
<Logo showWordmark={false} />
```

### Direct Image Usage

```html
<!-- Full logo -->
<img
  src="/assets/logos/logo-full-800.png"
  alt="Artagon"
  width="800"
  height="533"
/>

<!-- Logo mark only -->
<img
  src="/assets/logos/logo-mark-64.png"
  alt="Artagon"
  width="64"
  height="64"
/>

<!-- Wordmark only -->
<img
  src="/assets/logos/logo-wordmark-400.png"
  alt="Artagon"
  width="400"
  height="auto"
/>
```

### Open Graph Meta Tags

```html
<meta
  property="og:image"
  content="https://artagon.com/assets/logos/og-image.png"
/>
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:type" content="image/png" />

<meta name="twitter:card" content="summary_large_image" />
<meta
  name="twitter:image"
  content="https://artagon.com/assets/logos/og-image.png"
/>
```

## 📐 Technical Specifications

### File Formats

- **PNG:** 8-bit RGBA with transparency
- **Resolution:** 72 DPI (web), 300 DPI for print (use high-res variants)
- **Color Space:** sRGB

### Optimization

All PNGs are unoptimized. For production, run:

```bash
# Install oxipng
brew install oxipng

# Optimize all logos
oxipng -o6 -s public/assets/logos/*.png
```

## 🔄 Regeneration

To regenerate logos from the submodule source:

```bash
# Update submodule (if needed)
cd public/assets/artagon-logo
git pull origin main
cd ../../..

# Regenerate logos
bash scripts/convert-logos.sh
```

## 📱 Platform-Specific Requirements

### iOS App Icon

Use `logo-mark-512.png` as source, then resize to:

- 1024×1024 (App Store)
- 180×180 (iPhone)
- 167×167 (iPad Pro)
- 152×152 (iPad)
- 120×120 (iPhone small)

### Android App Icon

Use `logo-mark-512.png` as adaptive icon foreground.
Add 20% padding for safe area: Use `/icons/icon-maskable-512.png`

### Social Media Profiles

| Platform  | Size    | Use                                        |
| --------- | ------- | ------------------------------------------ |
| Twitter/X | 400×400 | `logo-square-512.png` (resize to 400×400)  |
| LinkedIn  | 300×300 | `logo-square-512.png` (resize to 300×300)  |
| Facebook  | 180×180 | `logo-square-512.png` (resize to 180×180)  |
| Instagram | 320×320 | `logo-square-512.png` (resize to 320×320)  |
| YouTube   | 800×800 | `logo-square-1200.png` (resize to 800×800) |

### Email Signatures

Use `logo-full-400.png` (max width 400px) to keep email size reasonable.

## 🎯 File Size Guidelines

Keep logo files under:

- **Email:** < 50 KB per image
- **Web:** < 100 KB for full logo, < 20 KB for mark
- **OG Image:** < 200 KB

Current sizes meet these guidelines.

## 📄 License

All logo assets are proprietary to Artagon. Unauthorized use is prohibited.

## 🆘 Support

For questions about logo usage or to request custom variations:

- Check brand guidelines documentation
- Contact brand/marketing team
- Open an issue in the repo for technical questions

---

**Generated:** 2025-11-11
**Source:** `public/assets/artagon-logo/artagon_D1A.png`
**Script:** `scripts/convert-logos.sh`
