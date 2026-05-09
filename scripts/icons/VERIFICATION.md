# Icon Integration Verification Checklist

Use this checklist to verify that all icons are correctly integrated across different platforms and browsers.

## ✅ Generation Verification

- [x] All icon sizes generated (16, 32, 48, 64, 96, 128, 192, 256, 384, 512)
- [x] Apple touch icon (180×180) created
- [x] Maskable icon (512×512) with padding created
- [x] Favicon.ico generated
- [x] Safari pinned tab SVG (monochrome) created
- [x] SHA-256 checksums generated for all files
- [x] Icons copied to `dist/` directory during build
- [x] Web manifest (`site.webmanifest`) created and valid JSON
- [x] BrowserConfig.xml created for Windows tiles

## 📱 Browser Testing

### Desktop Browsers

#### Chrome/Edge

- [ ] Favicon visible in browser tab
- [ ] Manifest detected (DevTools → Application → Manifest)
- [ ] All icon sizes listed in manifest
- [ ] Theme color matches canonical neutral-dark `--bg` (#0a0d12; pre-pt107 was #0B1220 midnight)
- [ ] "Install app" prompt available (if applicable)

#### Firefox

- [ ] Favicon visible in browser tab
- [ ] Bookmark icon displays correctly
- [ ] Theme color respected in UI

#### Safari (macOS)

- [ ] Favicon visible in browser tab
- [ ] Pinned tab shows monochrome icon
- [ ] Pinned tab color is #3ceedd (canonical brand-teal; pre-pt107 was #0EA5E9 sky blue)
- [ ] Reading mode icon displays correctly

### Mobile Browsers

#### iOS Safari

- [ ] Favicon visible in tab switcher
- [ ] "Add to Home Screen" uses correct icon (180×180)
- [ ] Home screen icon has no white border/background
- [ ] Status bar style is black-translucent
- [ ] App title is "Artagon"
- [ ] Launch from home screen works

#### Android Chrome

- [ ] Favicon visible in tabs
- [ ] "Install app" prompt shows correct icon
- [ ] Maskable icon displays without clipping (safe area)
- [ ] Theme color matches app bar (#0B1220)
- [ ] Installed PWA uses correct icon on launcher
- [ ] Splash screen uses theme colors

## 🔍 Technical Verification

### HTML Head Tags

```bash
# Check built HTML includes all required tags
grep -E "(icon|manifest|apple-touch)" dist/index.html
```

Expected tags:

- [x] `<link rel="icon" type="image/png" href="/icons/icon-32.png" sizes="32x32">`
- [x] `<link rel="icon" type="image/png" href="/icons/icon-16.png" sizes="16x16">`
- [x] `<link rel="shortcut icon" href="/icons/favicon.ico">`
- [x] `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`
- [x] `<link rel="manifest" href="/site.webmanifest">`
- [x] `<link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3ceedd">` (pt107 canonical brand-teal; pre-pt107 was `#0EA5E9` sky blue)
- [x] `<meta name="theme-color" content="#0a0d12">` (canonical neutral-dark `--bg` per `BaseLayout.astro:34` archaeology; pre-pt107 draft was `#0B1220` midnight)

### File Accessibility

Test all icon URLs are accessible:

```bash
# Start dev server
npm run dev

# In another terminal, test icon endpoints
curl -I http://localhost:4321/icons/icon-32.png
curl -I http://localhost:4321/icons/favicon.ico
curl -I http://localhost:4321/site.webmanifest
curl -I http://localhost:4321/icons/safari-pinned-tab.svg
```

All should return `200 OK`.

### Manifest Validation

- [ ] Valid JSON: `cat public/site.webmanifest | jq .`
- [ ] All referenced icons exist
- [ ] start_url is correct
- [ ] Theme colors match brand

### Icon Quality

- [ ] Icons are crisp and clear (not pixelated)
- [ ] Transparency preserved (no white/black backgrounds)
- [ ] Consistent branding across all sizes
- [ ] Maskable icon has adequate padding (20%)

## 🧪 Lighthouse Audit

Run Lighthouse PWA audit:

```bash
npm run build
npm run preview

# In another terminal
lighthouse http://localhost:4321 --view
```

### PWA Checklist Items

- [ ] ✅ "Provides a valid `apple-touch-icon`"
- [ ] ✅ "Configured for a custom splash screen"
- [ ] ✅ "Sets a theme color for the address bar"
- [ ] ✅ "Manifest has a maskable icon"
- [ ] ✅ "Has a `<meta name='viewport'>` tag with `width` or `initial-scale`"
- [ ] ✅ "Web app manifest meets the installability requirements"

Target score: **100/100** for PWA category

## 📊 File Size Check

Verify icon file sizes are optimized:

```bash
ls -lh public/icons/*.png | awk '{print $5, $9}'
```

Expected ranges:

- icon-16.png: < 1KB
- icon-32.png: < 2KB
- icon-64.png: < 5KB
- icon-128.png: < 12KB
- icon-256.png: < 30KB
- icon-512.png: < 80KB

### Optimization (Optional)

If files are larger than expected:

```bash
# Install oxipng
brew install oxipng

# Optimize
oxipng -o6 -s public/icons/*.png
```

## 🔐 Security Verification

### Subresource Integrity (Optional)

Checksums are available for SRI validation:

```bash
# View checksums
ls public/icons/checksums/

# Example: icon-32.png SHA-256
cat public/icons/checksums/icon-32.png.sha256.base64
cat public/icons/checksums/icon-32.png.sha256.hex
```

## 🐛 Troubleshooting

### Issue: Favicon not showing in Chrome

**Solution:** Hard refresh (Cmd+Shift+R / Ctrl+Shift+R) or clear site data

### Issue: iOS home screen icon has white background

**Solution:** Ensure source image has transparency. Regenerate with:

```bash
bash scripts/icons/make-icons.sh
```

### Issue: Android icon appears clipped

**Solution:** Increase maskable padding. Edit `scripts/icons/make-icons.sh`:

```bash
# Change from 80% to 75% for more padding
sips -z 768 768 tmp/icons/mark-1024.png --out tmp/icons/mark-pad.png
```

### Issue: Safari pinned tab icon not visible

**Solution:** Clear Safari cache or check SVG is valid:

```bash
file public/icons/safari-pinned-tab.svg
# Should output: SVG Scalable Vector Graphics image
```

### Issue: Manifest not detected in DevTools

**Solution:** Check manifest is valid JSON and accessible:

```bash
cat public/site.webmanifest | jq .
curl -I http://localhost:4321/site.webmanifest
```

## 📸 Visual Testing Screenshots

Take screenshots for documentation:

1. Browser tab with favicon (Chrome, Safari, Firefox)
2. iOS home screen with installed icon
3. Android launcher with installed PWA icon
4. Safari pinned tab
5. Chrome DevTools → Application → Manifest
6. Lighthouse PWA score

## ✨ Final Checklist

Before deploying:

- [ ] All icons generated and optimized
- [ ] Build completes without errors
- [ ] Icons visible in local dev server
- [ ] Manifest valid and accessible
- [ ] HTML includes all required meta tags
- [ ] Tested in at least 2 browsers
- [ ] Mobile devices tested (iOS and/or Android)
- [ ] Lighthouse PWA score > 90
- [ ] No console errors related to icons/manifest
- [ ] Git committed and pushed

## 📝 Regeneration

To regenerate icons after logo changes (post-USMR-pt72 — the
`public/assets/artagon-logo/` submodule was removed; SVG_MARK is
the primary source):

```bash
# 1. Update public/assets/logo-mark.svg with the new mark.
# 2. Regenerate icons (uses SVG_MARK by default since pt72):
bash scripts/icons/make-icons.sh

# Optional: if you have a local clone of the upstream artagon-logo
# PNG submodule (not tracked in this repo for size reasons), you
# can override the source via env vars:
#   LOGO_DIR=/path/to/local/artagon-logo bash scripts/icons/make-icons.sh

# Rebuild site
npm run build

# Test
npm run preview
```

---

**Last Updated:** 2025-11-11
**Generated by:** scripts/icons/make-icons.sh
**Icon Source:** public/assets/logo-mark.svg
