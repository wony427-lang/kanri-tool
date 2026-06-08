#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGULAR="$ROOT/public/fonts/NotoSansJP-Regular.ttf"
BOLD="$ROOT/public/fonts/NotoSansJP-Bold.ttf"

# PDF 用フォントはリポジトリに同梱している（Noto Sans JP Regular/Bold の静的 TTF）。
# woff は @react-pdf/renderer の読み込みが極端に遅くなるため使わない。
if [[ -f "$REGULAR" && -f "$BOLD" ]]; then
  echo "PDF fonts present in public/fonts/ (NotoSansJP-Regular.ttf / NotoSansJP-Bold.ttf)"
  exit 0
fi

echo "ERROR: PDF fonts missing." >&2
echo "  Expected: $REGULAR" >&2
echo "  Expected: $BOLD" >&2
echo "  These TrueType files are committed to the repository; restore them via 'git checkout -- public/fonts'." >&2
exit 1
