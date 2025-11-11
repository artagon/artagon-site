#!/usr/bin/env bash
set -euo pipefail
in=${1:?Usage: $0 input.svg [output.svg]}
out=${2:-optimized.svg}
svgo --multipass -o "$out" "$in"
echo "Wrote $out"
