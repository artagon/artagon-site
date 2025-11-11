#!/usr/bin/env bash
set -euo pipefail
src=${1:?Usage: $0 source.(svg|png)}
out=${2:-public/assets}
mkdir -p "$out" ios android
# Web PWA
for s in 192 512; do if [[ "$src" == *.svg ]]; then inkscape "$src" --export-type=png -w "$s" -h "$s" -o "$out/icon-$s.png" || magick convert -background none "$src" -resize ${s}x${s} "$out/icon-$s.png"; else magick convert "$src" -resize ${s}x${s} "$out/icon-$s.png"; fi; done
# iOS
mkdir -p ios/AppIcon.appiconset
for s in 20 29 40 60 76 83.5 1024; do magick convert "$src" -resize ${s}x${s} "ios/AppIcon.appiconset/Icon-${s}.png"; done
# Android
for dir in mipmap-mdpi:48 mipmap-hdpi:72 mipmap-xhdpi:96 mipmap-xxhdpi:144 mipmap-xxxhdpi:192; do d=${dir%%:*}; s=${dir##*:}; mkdir -p android/$d; magick convert "$src" -resize ${s}x${s} android/$d/ic_launcher.png; cp android/$d/ic_launcher.png android/$d/ic_launcher_round.png; done
echo "All icons generated."
