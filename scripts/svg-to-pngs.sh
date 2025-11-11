#!/usr/bin/env bash
set -euo pipefail
in=${1:?Usage: $0 logo.svg}
outdir=${2:-public/assets}
mkdir -p "$outdir"
sizes=(16 24 32 48 64 96 128 180 192 256 384 512 1024)
for s in "${sizes[@]}"; do
 if command -v inkscape >/dev/null; then inkscape "$in" --export-type=png -w "$s" -h "$s" -o "$outdir/icon-${s}.png"; else magick convert -background none "$in" -resize ${s}x${s} "$outdir/icon-${s}.png"; fi
echo "$outdir/icon-${s}.png"; done
