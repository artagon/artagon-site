# Artagon Icon Generation Pipeline

Generates a complete set of favicon, PWA, and platform-specific icons from the Artagon logo assets.

## Quick Start

```bash
# Generate all icons (uses default sources)
bash scripts/icons/make-icons.sh

# Or make it executable and run directly
chmod +x scripts/icons/make-icons.sh
./scripts/icons/make-icons.sh
```

## What It Generates

The script creates icons in `public/icons/`:

### Standard Icons

- `icon-16.png` through `icon-512.png` - Various sizes for PWA and browsers
- `favicon.ico` - Traditional favicon (32×32)
- `apple-touch-icon.png` - iOS home screen icon (180×180)

### Special Variants

- `icon-maskable-512.png` - Android adaptive icon with safe padding
- `safari-pinned-tab.svg` - Monochrome SVG for Safari pinned tabs

### Verification

- `checksums/` - SHA-256 digests (base64 and hex) for all generated files

## Configuration

Override defaults via environment variables:

```bash
# Use a different source image
SRC=path/to/logo.png bash scripts/icons/make-icons.sh

# Change output directory
OUT=public/my-icons bash scripts/icons/make-icons.sh

# Use different brand colors
BRAND_BG="#000000" MASK_BG="#111111" bash scripts/icons/make-icons.sh
```

### Available Variables

- `LOGO_DIR` - Logo submodule directory (default: `public/assets/artagon-logo`)
- `SVG_MARK` - SVG logo mark file (default: `public/assets/logo-mark.svg`)
- `SRC` - Fallback PNG source (default: `$LOGO_DIR/artagon_D1A.png`)
- `OUT` - Output directory (default: `public/icons`)
- `BRAND_BG` - Brand background color (default: `#0B1220`)
- `MASK_BG` - Maskable icon background (default: `#0B1220`)
- `PINNED_COLOR` - Safari pinned tab color (default: `#0EA5E9`)

## Requirements

### Installed Tools

- **rsvg-convert** - SVG to PNG conversion (from librsvg)
- **sips** - macOS image resizing and format conversion (built-in)
- **shasum** - Checksum generation (built-in)

### Check Tool Availability

```bash
# Check what's installed
which rsvg-convert sips shasum

# Install librsvg on macOS
brew install librsvg
```

## Source Priority

The script automatically selects the best available source:

1. **SVG** (`public/assets/logo-mark.svg`) - Preferred for crisp scaling
2. **PNG** (`public/assets/artagon-logo/artagon_D1A.png`) - High-quality raster
3. **Fallbacks** - `artagon_D1.png`, `artagon_D1.jpg` from logo submodule

## Output Structure

```
public/icons/
├── icon-16.png
├── icon-32.png
├── icon-48.png
├── icon-64.png
├── icon-96.png
├── icon-128.png
├── icon-192.png
├── icon-256.png
├── icon-384.png
├── icon-512.png
├── icon-maskable-512.png
├── apple-touch-icon.png
├── favicon.ico
├── safari-pinned-tab.svg
└── checksums/
    ├── icon-16.png.sha256.base64
    ├── icon-16.png.sha256.hex
    └── ... (checksums for all files)
```

## Integration

After generating icons, integrate them into your site:

### 1. Web Manifest

Create or update `public/site.webmanifest`:

```json
{
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### 2. HTML Head Links

Add to your `<head>`:

```html
<link rel="icon" type="image/png" href="/icons/icon-32.png" sizes="32x32" />
<link rel="icon" type="image/png" href="/icons/icon-16.png" sizes="16x16" />
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0EA5E9" />
<link rel="shortcut icon" href="/icons/favicon.ico" />
```

## Troubleshooting

### Issue: Icons appear pixelated

- **Solution**: Ensure you're using the SVG source (`logo-mark.svg`) which scales perfectly
- Check: `file public/assets/logo-mark.svg` should show SVG

### Issue: Maskable icon gets cropped on Android

- **Current**: Script uses 20% padding (80% safe area)
- **Fix**: Manually adjust padding in the script (line ~70) or edit the maskable PNG

### Issue: Safari pinned tab doesn't show

- **Check**: Ensure `safari-pinned-tab.svg` is a valid monochrome SVG
- **Test**: Open SVG in browser to verify it renders

### Issue: favicon.ico not working in older browsers

- **Note**: Script creates ICO from 32px PNG via sips
- **Alternative**: Use online converter for multi-resolution ICO if needed

### Issue: Script fails with "rsvg-convert not found"

```bash
# Install on macOS
brew install librsvg

# Install on Ubuntu/Debian
sudo apt-get install librsvg2-bin
```

## Manual Optimization

For production deployments, consider additional optimization:

### PNG Compression

```bash
# Install oxipng or pngquant
brew install oxipng

# Optimize all PNGs
oxipng -o6 -s public/icons/*.png
```

### SVG Optimization

```bash
# Install svgo
npm install -g svgo

# Optimize SVG
svgo public/icons/safari-pinned-tab.svg
```

## Testing

### Browser Testing

1. **Chrome**: Check DevTools → Application → Manifest for PWA icons
2. **Safari**: Pin tab to verify pinned tab icon and color
3. **iOS Safari**: Add to home screen to test Apple touch icon
4. **Android Chrome**: Install as PWA to test maskable icon

### Lighthouse Audit

```bash
npm run build
npm run preview

# In another terminal
lighthouse http://localhost:4321 --view
```

Check:

- ✅ "Provides a valid `apple-touch-icon`"
- ✅ "Manifest has a maskable icon"
- ✅ "Has a `<meta name="theme-color">` tag"

## Development Workflow

1. Update logo in submodule or `public/assets/logo-mark.svg`
2. Run `bash scripts/icons/make-icons.sh`
3. Commit generated icons to git
4. Deploy

### Git Workflow

```bash
# Update logo submodule
cd public/assets/artagon-logo
git pull origin main
cd ../../..
git add public/assets/artagon-logo

# Generate new icons
bash scripts/icons/make-icons.sh

# Commit everything
git add public/icons scripts/icons
git commit -m "Update site icons from latest logo"
```

## Notes

- Icons are generated from the **logo mark** (emblem/shield), not the full wordmark
- Maskable icons use 20% padding (80% safe area) per maskable icon guidelines
- SHA-256 checksums are provided for verification and optional SRI (Subresource Integrity)
- The Safari pinned tab SVG is a simplified monochrome version
