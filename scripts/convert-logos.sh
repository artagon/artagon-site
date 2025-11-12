#!/usr/bin/env bash
set -euo pipefail

# Artagon Logo Conversion Script
# Converts high-res logos from artagon-logo submodule to web-optimized formats

LOGO_DIR=${LOGO_DIR:-public/assets/artagon-logo}
SRC_FULL=${SRC_FULL:-$LOGO_DIR/artagon_D1A.png}
OUT_DIR=${OUT_DIR:-public/assets/logos}
TEMP_DIR=${TEMP_DIR:-tmp/logo-conversion}

echo "🎨 Artagon Logo Conversion Pipeline"
echo "===================================="

# Check if source exists
if [[ ! -f "$SRC_FULL" ]]; then
  echo "❌ Source logo not found: $SRC_FULL"
  exit 1
fi

mkdir -p "$OUT_DIR" "$TEMP_DIR"

echo "✓ Source: $SRC_FULL"
echo "✓ Output: $OUT_DIR"
echo ""

# 1) Create full logo variations (with transparency)
echo "→ Creating full logo variations..."

# High-res for OG image and large displays (1200px wide)
sips -z 800 1200 "$SRC_FULL" --out "$OUT_DIR/logo-full-1200.png" >/dev/null 2>&1
echo "  ✓ logo-full-1200.png (Open Graph / Social Media)"

# Medium for general use (800px wide)
sips -z 533 800 "$SRC_FULL" --out "$OUT_DIR/logo-full-800.png" >/dev/null 2>&1
echo "  ✓ logo-full-800.png"

# Small for headers (400px wide)
sips -z 267 400 "$SRC_FULL" --out "$OUT_DIR/logo-full-400.png" >/dev/null 2>&1
echo "  ✓ logo-full-400.png"

# 2) Extract logo mark (emblem only - left ~40% of image)
echo ""
echo "→ Extracting logo mark (emblem)..."

# Get dimensions of source
WIDTH=$(sips -g pixelWidth "$SRC_FULL" | tail -1 | awk '{print $2}')
HEIGHT=$(sips -g pixelHeight "$SRC_FULL" | tail -1 | awk '{print $2}')

# Calculate crop dimensions for logo mark (left 45% of image, centered vertically)
MARK_WIDTH=$((WIDTH * 45 / 100))
MARK_HEIGHT=$HEIGHT
MARK_X=50
MARK_Y=0

# Create temporary cropped version
cp "$SRC_FULL" "$TEMP_DIR/mark-temp.png"
sips --cropToHeightWidth "$MARK_HEIGHT" "$MARK_WIDTH" "$TEMP_DIR/mark-temp.png" >/dev/null 2>&1

# Generate various sizes of the mark
sips -z 512 512 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-mark-512.png" >/dev/null 2>&1
echo "  ✓ logo-mark-512.png"

sips -z 256 256 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-mark-256.png" >/dev/null 2>&1
echo "  ✓ logo-mark-256.png"

sips -z 128 128 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-mark-128.png" >/dev/null 2>&1
echo "  ✓ logo-mark-128.png"

sips -z 64 64 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-mark-64.png" >/dev/null 2>&1
echo "  ✓ logo-mark-64.png"

sips -z 32 32 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-mark-32.png" >/dev/null 2>&1
echo "  ✓ logo-mark-32.png"

# 3) Extract wordmark (text only - right ~55% of image)
echo ""
echo "→ Extracting wordmark (text)..."

WORD_WIDTH=$((WIDTH * 55 / 100))
WORD_HEIGHT=$HEIGHT
WORD_X=$((WIDTH * 45 / 100))
WORD_Y=0

# Create temporary cropped version
cp "$SRC_FULL" "$TEMP_DIR/word-temp.png"
# First crop to right portion, then resize
sips --cropToHeightWidth "$WORD_HEIGHT" "$WORD_WIDTH" --cropOffset "$WORD_Y" "$WORD_X" "$TEMP_DIR/word-temp.png" >/dev/null 2>&1

# Generate wordmark at different widths (maintaining aspect ratio)
sips -Z 800 "$TEMP_DIR/word-temp.png" --out "$OUT_DIR/logo-wordmark-800.png" >/dev/null 2>&1
echo "  ✓ logo-wordmark-800.png"

sips -Z 400 "$TEMP_DIR/word-temp.png" --out "$OUT_DIR/logo-wordmark-400.png" >/dev/null 2>&1
echo "  ✓ logo-wordmark-400.png"

sips -Z 200 "$TEMP_DIR/word-temp.png" --out "$OUT_DIR/logo-wordmark-200.png" >/dev/null 2>&1
echo "  ✓ logo-wordmark-200.png"

# 4) Create OG image (1200x630 for social media)
echo ""
echo "→ Creating Open Graph image (1200x630)..."

# Resize to OG dimensions (maintaining aspect ratio, then pad to exact size)
sips -Z 1200 "$SRC_FULL" --out "$TEMP_DIR/og-temp.png" >/dev/null 2>&1
# Then resize to exact OG dimensions
sips -z 630 1200 "$TEMP_DIR/og-temp.png" --out "$OUT_DIR/og-image.png" >/dev/null 2>&1

# Also create for public root (common OG image location)
cp "$OUT_DIR/og-image.png" "public/assets/og-image.png"
echo "  ✓ og-image.png (1200x630)"

# 5) Create square logo variants (for social media profiles)
echo ""
echo "→ Creating square logo variants..."

# Create square canvas with logo centered
sips -z 1200 1200 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-square-1200.png" >/dev/null 2>&1
echo "  ✓ logo-square-1200.png (Twitter, LinkedIn, etc.)"

sips -z 512 512 "$TEMP_DIR/mark-temp.png" --out "$OUT_DIR/logo-square-512.png" >/dev/null 2>&1
echo "  ✓ logo-square-512.png"

# 6) Create horizontal lockup (mark + wordmark side by side)
echo ""
echo "→ Creating horizontal lockup..."
echo "  ⚠  Manual compositing recommended for production quality"
echo "  ℹ  Using full logo as horizontal lockup for now"
cp "$OUT_DIR/logo-full-800.png" "$OUT_DIR/logo-horizontal-800.png"
echo "  ✓ logo-horizontal-800.png"

# 7) Generate summary
echo ""
echo "✅ Logo conversion complete!"
echo ""
echo "📁 Generated files in $OUT_DIR:"
ls -lh "$OUT_DIR" | tail -n +2 | awk '{printf "   %8s  %s\n", $5, $9}'

echo ""
echo "📋 Usage:"
echo "   Full logo:     logo-full-{1200,800,400}.png"
echo "   Mark only:     logo-mark-{512,256,128,64,32}.png"
echo "   Wordmark:      logo-wordmark-{800,400,200}.png"
echo "   Square:        logo-square-{1200,512}.png"
echo "   OG Image:      og-image.png (1200x630)"
echo "   Horizontal:    logo-horizontal-800.png"

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "💡 Next steps:"
echo "   1. Review generated images"
echo "   2. Update components to use new logo variants"
echo "   3. Consider creating SVG versions for vector scaling"
echo "   4. Run image optimization (oxipng, imageoptim)"
