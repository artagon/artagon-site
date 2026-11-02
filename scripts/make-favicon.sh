#!/usr/bin/env bash
set -euo pipefail
outdir=${1:-public}
# LAYOUT-07A: retain the output-directory argument while using the current icons.
magick public/icons/icon-16.png public/icons/icon-32.png public/icons/icon-48.png -alpha on -colors 256 "$outdir/favicon.ico"
