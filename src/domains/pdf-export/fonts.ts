import path from "node:path";

import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Noto Sans JP を 1 回だけ登録する。
 *
 * フォントは Regular(400) / Bold(700) の静的 TrueType（glyf）を使用する。
 * - woff は @react-pdf/renderer（Node ビルド）の読み込み時に毎回 zlib 展開が走り、
 *   1 回あたり数秒かかるため不可（計測で TTF 70ms に対し woff 6000ms 超）。
 * - 可変フォントや極細(Thin)・記号欠落のサブセットは文字化け/欠落の原因になる。
 */
export function registerPdfFonts(): void {
  if (registered) {
    return;
  }

  const regularPath = path.join(
    process.cwd(),
    "public/fonts/NotoSansJP-Regular.ttf",
  );
  const boldPath = path.join(process.cwd(), "public/fonts/NotoSansJP-Bold.ttf");

  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: regularPath, fontWeight: "normal" },
      { src: boldPath, fontWeight: "bold" },
    ],
  });

  registered = true;
}
