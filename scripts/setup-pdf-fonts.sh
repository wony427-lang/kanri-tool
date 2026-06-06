#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGULAR="$ROOT/public/fonts/NotoSansJP-Regular.woff"
BOLD="$ROOT/public/fonts/NotoSansJP-Bold.woff"

if [[ -f "$REGULAR" && -f "$BOLD" ]]; then
  echo "PDF fonts already present in public/fonts/, skipping copy"
  exit 0
fi

SRC_DIR="$ROOT/node_modules/@fontsource/noto-sans-jp/files"
if [[ ! -f "$SRC_DIR/noto-sans-jp-japanese-400-normal.woff" ]]; then
  echo "ERROR: PDF fonts missing and @fontsource/noto-sans-jp is not installed." >&2
  exit 1
fi

mkdir -p "$ROOT/public/fonts"
cp "$SRC_DIR/noto-sans-jp-japanese-400-normal.woff" "$REGULAR"
cp "$SRC_DIR/noto-sans-jp-japanese-700-normal.woff" "$BOLD"
echo "PDF fonts copied to public/fonts/"
