# Project Structure

## Organization Philosophy

Next.js App Router の規約に従ったレイアウトを基本とする。ソースコードは `src/` 配下にまとめ、ルーティングは `src/app/` のディレクトリ構造で表現する。機能が増えた段階で、必要に応じて以下の追加ディレクトリを設ける：

- `src/components/` … 横断的に再利用する UI プリミティブ
- `src/lib/` … フレームワーク非依存のユーティリティ・ドメインロジック
- `src/app/(group)/` … ルートグルーピング（URL に影響させずレイアウトを分けたい場合）

「フォルダ＝責務の境界」とし、機能追加で既存パターンから逸脱する場合のみ本ファイルを更新する。

## Directory Patterns

### App Router Pages
**Location**: `src/app/`
**Purpose**: ルーティング、レイアウト、Server/Client コンポーネントを配置する。既定は Server Component。
**Example**:
- `src/app/layout.tsx` … ルートレイアウト（`<html>` / `<body>`、フォント、グローバル CSS の読み込み）
- `src/app/page.tsx` … ルートページ
- `src/app/globals.css` … Tailwind のエントリ＋テーマ用 CSS 変数

### Static Assets
**Location**: `public/`
**Purpose**: ビルドを介さず配信する静的ファイル（SVG、画像、`favicon` など）
**Example**: `public/next.svg`、`public/vercel.svg`

### Spec & Steering（プロジェクトメモリ）
**Location**: `.kiro/specs/`, `.kiro/steering/`
**Purpose**: 機能ごとの仕様（specs）と、プロジェクト横断の知識（steering）を保持
**Example**: `.kiro/steering/{product,tech,structure}.md`

## Naming Conventions

- **App Router の特殊ファイル**: Next.js 規約に従う（`layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `route.ts` 等）。**小文字固定**
- **コンポーネント**: PascalCase で 1 ファイル 1 コンポーネント（例: `UserCard.tsx`）。ファイル名とデフォルトエクスポート名を一致させる
- **ユーティリティ / フック**: camelCase（例: `formatDate.ts`, `useDebounce.ts`）
- **CSS / アセット**: kebab-case（例: `globals.css`, `next.svg`）
- **環境変数**: `UPPER_SNAKE_CASE`。クライアント公開する値のみ `NEXT_PUBLIC_` プレフィックスを付ける

## Import Organization

```typescript
// 1) Next.js / React のビルトイン
import type { Metadata } from "next";
import Image from "next/image";

// 2) サードパーティ
// import clsx from "clsx";

// 3) 絶対パス（@ エイリアス）
import { Button } from "@/components/Button";

// 4) 相対パス（同一機能内に閉じるもののみ）
import { localHelper } from "./helpers";

// 5) スタイル
import "./globals.css";
```

**Path Aliases**:
- `@/`: `./src/` にマップ（`tsconfig.json` の `compilerOptions.paths`）

絶対パスを優先し、相対パスは「同じ機能フォルダ内で完結する import」に限定する。

## Code Organization Principles

- **Server First**: コンポーネントは既定で Server Component。`useState` / `useEffect` / イベントハンドラ等が必要になった時点で初めて `"use client"` を付ける
- **境界の最小化**: クライアントツリーはできる限り葉側に寄せ、データ取得は Server Component または Route Handler 側で行う
- **スタイリング**: Tailwind のユーティリティクラスを優先。テーマ値（色・フォント）は `globals.css` の CSS 変数経由で参照する
- **画像**: `next/image` を使用し、`width` / `height` または `fill` を必ず指定
- **`src/` 配下に集約**: アプリケーションコードはすべて `src/` に置き、設定ファイル（`next.config.ts`, `eslint.config.mjs` 等）と分離する

---
_ディレクトリの全列挙ではなく、新しいコードが従うべき「パターン」を記載する。_
