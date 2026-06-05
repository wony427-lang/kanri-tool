import path from "node:path";

import { Font } from "@react-pdf/renderer";

let registered = false;

/**
 * Noto Sans JP を 1 回だけ登録する。
 * 配布物は @fontsource/noto-sans-jp 由来の woff（scripts/setup-pdf-fonts.sh で配置）。
 */
export function registerPdfFonts(): void {
  if (registered) {
    return;
  }

  const regularPath = path.join(
    process.cwd(),
    "public/fonts/NotoSansJP-Regular.woff",
  );
  const boldPath = path.join(process.cwd(), "public/fonts/NotoSansJP-Bold.woff");

  Font.register({
    family: "NotoSansJP",
    fonts: [
      { src: regularPath, fontWeight: "normal" },
      { src: boldPath, fontWeight: "bold" },
    ],
  });

  registered = true;
}
