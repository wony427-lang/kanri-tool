import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 注意:
// - `@/` パスエイリアスを tsconfig.json と一致させて解決する。
// - `server-only` パッケージはランタイムで Client Component からの import を
//   エラーにする仕組みだが、Vitest（Node 上の単体テスト）では衝突する。
//   テスト時のみ空モジュールへエイリアスして握り潰す。
// - jsdom 環境を既定にし、Server Components のロジックも DOM 抜きで実行可能。
//   DOM 不要な単体テストでも jsdom 環境のオーバーヘッドは無視できる範囲。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@test": fileURLToPath(new URL("./tests", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/utils/serverOnlyStub.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    exclude: ["node_modules", ".next", "src/generated", "scripts"],
    css: false,
  },
});
