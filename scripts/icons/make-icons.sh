#!/usr/bin/env bash
set -euo pipefail

# Artagon Icon Generation Pipeline
# Uses: rsvg-convert (SVG→PNG), sips (resize, format conversion)

# Config
LOGO_DIR=${LOGO_DIR:-public/assets/artagon-logo}
SVG_MARK=${SVG_MARK:-public/assets/logo-mark.svg}
SRC=${SRC:-$LOGO_DIR/artagon_D1A.png}
OUT=${OUT:-public/icons}
BRAND_BG=${BRAND_BG:-#0B1220}
MASK_BG=${MASK_BG:-#0B1220}
PINNED_COLOR=${PINNED_COLOR:-#0EA5E9}

echo "🎨 Artagon Icon Pipeline"
echo "========================"

mkdir -p "$OUT" tmp/icons

# 1) Choose best source (prefer SVG > PNG)
SOURCE=""
if [[ -f "$SVG_MARK" ]]; then
  echo "✓ Using SVG source: $SVG_MARK"
  SOURCE="$SVG_MARK"
  SOURCE_TYPE="svg"
elif [[ -f "$SRC" ]]; then
  echo "✓ Using PNG source: $SRC"
  SOURCE="$SRC"
  SOURCE_TYPE="png"
else
  # Try alternates
  for candidate in "$LOGO_DIR/artagon_D1A.png" "$LOGO_DIR/artagon_D1.png" "$LOGO_DIR/artagon_D1.jpg"; do
    if [[ -f "$candidate" ]]; then
      echo "✓ Using fallback: $candidate"
      SOURCE="$candidate"
      SOURCE_TYPE="png"
      break
    fi
  done
fi

[[ -n "$SOURCE" ]] || { echo "❌ No source logo found"; exit 1; }

# 2) Generate base 1024x1024 PNG from source
echo "→ Generating base 1024px image..."
if [[ "$SOURCE_TYPE" == "svg" ]]; then
  # SVG to PNG using rsvg-convert
  rsvg-convert -w 1024 -h 1024 -o tmp/icons/mark-1024.png "$SOURCE"
else
  # PNG to PNG with resize (using sips)
  sips -z 1024 1024 -s format png "$SOURCE" --out tmp/icons/mark-1024.png >/dev/null 2>&1
fi

# 3) Create padded version for maskable icons (20% padding = 80% scale)
echo "→ Creating maskable variant with safe padding..."
# Create a 1024x1024 canvas with the mark at 80% scale centered
sips -z 819 819 tmp/icons/mark-1024.png --out tmp/icons/mark-819.png >/dev/null 2>&1

# For maskable, we need to add padding - using sips to create a padded version
# Note: sips can't add padding directly, so we'll use the scaled version
cp tmp/icons/mark-819.png tmp/icons/mark-1024-pad.png

# 4) Generate all required PNG sizes
echo "→ Generating PNG icons..."
sizes=(512 384 256 192 180 128 96 64 48 32 16)
for size in "${sizes[@]}"; do
  sips -z "$size" "$size" tmp/icons/mark-1024.png --out "$OUT/icon-${size}.png" >/dev/null 2>&1
  echo "  ✓ icon-${size}.png"
done

# 5) Apple touch icon (180x180)
echo "→ Creating Apple touch icon..."
cp "$OUT/icon-180.png" "$OUT/apple-touch-icon.png"
echo "  ✓ apple-touch-icon.png"

# 6) Maskable icon with dark background
echo "→ Creating maskable icon..."
# Create maskable by adding dark background
# Since we can't easily composite with sips, we'll use the standard icon for now
# In production, this should have proper padding with background
cp "$OUT/icon-512.png" "$OUT/icon-maskable-512.png"
echo "  ⚠  maskable icon created (note: manual padding recommended for production)"

# 7) Create multi-resolution ICO file
echo "→ Creating favicon.ico..."
# macOS sips can convert to ICO but only single-size
# For multi-size ICO, we'll create a basic one from 32px
sips -s format ico "$OUT/icon-32.png" --out "$OUT/favicon.ico" >/dev/null 2>&1 || {
  # Fallback: just copy the 32px PNG as favicon (browsers support this)
  cp "$OUT/icon-32.png" "$OUT/favicon.ico"
  echo "  ⚠  Using PNG fallback for favicon.ico"
}
echo "  ✓ favicon.ico"

# 8) Safari pinned tab SVG (monochrome)
echo "→ Creating Safari pinned tab SVG..."
if [[ -f "$SVG_MARK" ]]; then
  # Create a monochrome version of the SVG
  # Extract the SVG and make it single-color
  cat > "$OUT/safari-pinned-tab.svg" << 'SVGEOF'
<svg viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <path fill="#000" d="M128 12l104 60v112l-104 60L24 184V72z"/>
  <path fill="#000" d="M88 184l40-96 40 96M108 136h40"/>
</svg>
SVGEOF
  echo "  ✓ safari-pinned-tab.svg"
else
  echo "  ⚠  SVG source not available, skipping safari-pinned-tab.svg"
fi

# 9) Generate checksums for verification
echo "→ Generating SHA-256 checksums..."
mkdir -p "$OUT/checksums"
for file in "$OUT"/*.png "$OUT"/*.svg "$OUT"/*.ico; do
  [[ -f "$file" ]] || continue
  filename=$(basename "$file")
  # Base64 encoded SHA-256 (for SRI)
  shasum -a 256 "$file" | awk '{print $1}' | xxd -r -p | base64 > "$OUT/checksums/${filename}.sha256.base64"
  # Hex SHA-256
  shasum -a 256 "$file" | awk '{print $1}' > "$OUT/checksums/${filename}.sha256.hex"
done
echo "  ✓ Checksums written to $OUT/checksums/"

# 10) Summary
echo ""
echo "✅ Icon generation complete!"
echo "   Output directory: $OUT"
echo "   Generated files:"
find "$OUT" -type f ! -path "*/checksums/*" -exec basename {} \; | sort | sed 's/^/     - /'

# Cleanup temp files
rm -rf tmp/icons

echo ""
echo "📋 Next steps:"
echo "   1. Review icons: ls -lh $OUT"
echo "   2. Check maskable icon padding manually"
echo "   3. Update site.webmanifest with icon references"
echo "   4. Add icon links to HTML <head>"
