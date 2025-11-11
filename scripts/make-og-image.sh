#!/usr/bin/env bash
set -euo pipefail
text=${1:-Artagon — Verified • Private • Attested}
out=${2:-public/assets/og-image.png}
mkdir -p "$(dirname "$out")"
magick -size 1200x630 canvas:"#0B1220" -fill "white" -font Arial -pointsize 60 -gravity center -draw "text 0,0 '$text'" "$out"
