#!/usr/bin/env bash
set -euo pipefail
outdir=${1:-public}
magick public/assets/icon-16.png public/assets/icon-24.png public/assets/icon-32.png public/assets/icon-48.png public/assets/icon-64.png -alpha on -colors 256 "$outdir/favicon.ico"
