#!/usr/bin/env bash
set -euo pipefail
TITLE=${1:-"Artagon — The provable identity cloud"}
SUBTITLE=${2:-"OIDC 2.1 + GNAP • VCs • Zanzibar"}
OUT=${3:-public/assets/og-image.png}
LOGO=${5:-public/assets/logo-lockup.png}
TEMPLATE_IMG="assets/og-template-image.svg"
TEMPLATE_TXT="assets/og-template.svg"
if [[ "$4" != "--logo" && -n "${4-}" ]]; then echo "Usage: $0 "Title" "Subtitle" out.png [--logo path]"; exit 1; fi
esc(){ printf '%s' "$1" | sed -e 's/[&/]/\\&/g'; }
mkdir -p "$(dirname "$OUT")"
TMP=$(mktemp /tmp/og.XXXXXX).svg
MOTTO="Verified • Private • Attested"
if [[ -f "$TEMPLATE_IMG" && -f "$LOGO" ]]; then
  sed -e "s/{{TITLE}}/$(esc "$TITLE")/g" -e "s/{{SUBTITLE}}/$(esc "$SUBTITLE")/g" -e "s/{{MOTTO}}/$(esc "$MOTTO")/g" -e "s|{{LOGO}}|$(esc "$LOGO")|g" "$TEMPLATE_IMG" > "$TMP"
else
  sed -e "s/{{TITLE}}/$(esc "$TITLE")/g" -e "s/{{SUBTITLE}}/$(esc "$SUBTITLE")/g" -e "s/{{MOTTO}}/$(esc "$MOTTO")/g" "$TEMPLATE_TXT" > "$TMP"
fi
if command -v inkscape >/dev/null 2>&1; then inkscape "$TMP" --export-type=png -w 1200 -h 630 -o "$OUT"; else magick convert "$TMP" -resize 1200x630 "$OUT"; fi
echo "OG image written to $OUT"
