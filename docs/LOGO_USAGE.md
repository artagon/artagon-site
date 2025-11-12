# Artagon Logo Usage Guide

Quick reference for using logo assets throughout the site.

## 🚀 Quick Start

### Using LogoVariants Component (Recommended)

```astro
---
import LogoVariants from '../components/LogoVariants.astro';
---

<!-- Full logo, medium size -->
<LogoVariants variant="full" size="medium" />

<!-- Just the mark/emblem -->
<LogoVariants variant="mark" size={64} />

<!-- Wordmark only -->
<LogoVariants variant="wordmark" size="large" />

<!-- Square format (for avatars, profile pics) -->
<LogoVariants variant="square" size={128} />
```

### Using Original Logo Component

```astro
---
import Logo from '../components/Logo.astro';
---

<!-- Default: SVG mark + wordmark -->
<Logo showWordmark={true} />

<!-- PNG variant with custom size -->
<Logo usePNG={true} size={48} showWordmark={false} />
```

## 📦 Component Props

### LogoVariants

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'full' \| 'mark' \| 'wordmark' \| 'square' \| 'horizontal'` | `'mark'` | Logo style variant |
| `size` | `'small' \| 'medium' \| 'large' \| 'xlarge' \| number` | `'medium'` | Size preset or exact pixels |
| `format` | `'svg' \| 'png'` | Auto | Force format (SVG default for mark) |
| `alt` | `string` | `'Artagon'` | Alt text for accessibility |
| `class` | `string` | `''` | Additional CSS classes |

### Size Presets

| Size | Mark | Full | Wordmark | Square | Horizontal |
|------|------|------|----------|--------|------------|
| `small` | 32px | 200px | 150px | 64px | 200px |
| `medium` | 64px | 400px | 300px | 128px | 400px |
| `large` | 128px | 800px | 500px | 256px | 800px |
| `xlarge` | 256px | 1200px | 800px | 512px | 1200px |

## 🎨 Common Use Cases

### Site Header

```astro
<!-- Header with full logo -->
<header>
  <a href="/">
    <LogoVariants variant="full" size="medium" />
  </a>
</header>

<!-- Compact header (mobile) -->
<header class="mobile">
  <a href="/">
    <LogoVariants variant="mark" size="small" />
  </a>
</header>
```

### Footer

```astro
<footer>
  <LogoVariants variant="full" size="small" />
  <p>&copy; 2025 Artagon. All rights reserved.</p>
</footer>
```

### Hero Section

```astro
<section class="hero">
  <LogoVariants variant="full" size="xlarge" />
  <h1>Trusted Identity for Machines and Humans</h1>
</section>
```

### Social Media Profile

```astro
<!-- For avatar/profile picture -->
<LogoVariants variant="square" size="xlarge" />
```

### Loading Indicator

```astro
<div class="loading">
  <LogoVariants variant="mark" size={48} class="spin" />
  <p>Loading...</p>
</div>

<style>
.spin {
  animation: spin 2s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
```

### Email Signature

```html
<!-- Use smaller full logo to keep email size down -->
<img src="https://artagon.com/assets/logos/logo-full-400.png"
     alt="Artagon"
     width="400"
     height="267" />
```

## 🔗 Direct Asset URLs

When you need direct image URLs (outside components):

### Full Logo
- `/assets/logos/logo-full-1200.png` - High-res (1200×800)
- `/assets/logos/logo-full-800.png` - Standard (800×533)
- `/assets/logos/logo-full-400.png` - Small (400×267)

### Logo Mark
- `/assets/logos/logo-mark-512.png` - 512×512
- `/assets/logos/logo-mark-256.png` - 256×256
- `/assets/logos/logo-mark-128.png` - 128×128
- `/assets/logos/logo-mark-64.png` - 64×64
- `/assets/logos/logo-mark-32.png` - 32×32
- `/assets/logo-mark.svg` - SVG (scalable)

### Wordmark
- `/assets/logos/logo-wordmark-800.png` - Max 800px
- `/assets/logos/logo-wordmark-400.png` - Max 400px
- `/assets/logos/logo-wordmark-200.png` - Max 200px
- `/assets/logo-wordmark.svg` - SVG (scalable)

### Special Formats
- `/assets/logos/logo-square-1200.png` - Square 1200×1200
- `/assets/logos/logo-square-512.png` - Square 512×512
- `/assets/logos/og-image.png` - Open Graph 1200×630

## 🌐 SEO & Social Media

### Open Graph (Default)

The site automatically uses the OG image in SEO tags:

```astro
---
// In any page - uses default OG image
import Base from '../layouts/BaseLayout.astro';
---
<Base title="My Page" description="Description" />
```

### Custom OG Image

```astro
<Base
  title="Custom Page"
  description="Description"
  image="/assets/logos/logo-square-1200.png"
/>
```

### Social Media Meta Tags (Manual)

```html
<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://artagon.com/assets/logos/og-image.png" />

<!-- Open Graph -->
<meta property="og:image" content="https://artagon.com/assets/logos/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

## 📱 Platform-Specific

### iOS Share Sheet
Use square logo for better display:
```html
<link rel="apple-touch-icon" href="/assets/logos/logo-square-512.png" />
```

### Android Share Sheet
Use square logo:
```html
<link rel="icon" sizes="192x192" href="/assets/logos/logo-square-512.png" />
```

### PWA Manifest
```json
{
  "icons": [
    {
      "src": "/assets/logos/logo-square-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## 🎯 Performance Tips

### 1. Use Appropriate Sizes
Don't load a 1200px logo when 400px will do:

```astro
<!-- Bad: Over-sized for mobile -->
<LogoVariants variant="full" size="xlarge" />

<!-- Good: Right-sized -->
<LogoVariants variant="full" size="medium" />
```

### 2. Lazy Load Below Fold

```astro
<img
  src="/assets/logos/logo-full-800.png"
  loading="lazy"
  alt="Artagon"
/>
```

### 3. Prefer SVG for Icons

```astro
<!-- Better performance for small icons -->
<LogoVariants variant="mark" format="svg" size={32} />
```

### 4. Optimize PNGs

```bash
# Optimize all logo PNGs
oxipng -o6 -s public/assets/logos/*.png
```

## ♿ Accessibility

### Always Provide Alt Text

```astro
<!-- Good -->
<LogoVariants variant="full" alt="Artagon Identity Platform" />

<!-- Bad: Missing alt -->
<img src="/assets/logos/logo-full-800.png" />
```

### Use Semantic HTML

```astro
<!-- In header -->
<header>
  <h1>
    <a href="/">
      <LogoVariants variant="full" alt="Artagon Home" />
    </a>
  </h1>
</header>

<!-- In content -->
<div>
  <LogoVariants variant="mark" alt="" aria-hidden="true" />
  <h2>Feature Title</h2>
</div>
```

## 🔄 Updating Logos

When the logo design changes:

```bash
# 1. Update submodule
cd public/assets/artagon-logo
git pull origin main
cd ../../..

# 2. Regenerate all variants
bash scripts/convert-logos.sh

# 3. Optimize
oxipng -o6 -s public/assets/logos/*.png

# 4. Build site
npm run build

# 5. Test all pages
npm run preview
```

## 📚 Additional Resources

- Full asset documentation: `public/assets/logos/README.md`
- Icon generation: `scripts/icons/README.md`
- Brand guidelines: (contact marketing team)

---

**Need help?** Open an issue or contact the development team.
