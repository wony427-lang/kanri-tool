#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/public/fonts"
cp "$ROOT/node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-400-normal.woff" \
  "$ROOT/public/fonts/NotoSansJP-Regular.woff"
cp "$ROOT/node_modules/@fontsource/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff" \
  "$ROOT/public/fonts/NotoSansJP-Bold.woff"
echo "PDF fonts copied to public/fonts/"
