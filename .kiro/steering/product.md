# Product Overview

> **Status**: 初期スキャフォールド段階。プロダクトドメインの詳細は `.kiro/specs/` で確定させていく。

`kanri-tool` は「管理（kanri）」を目的とする Web アプリケーションのコードベース。現時点ではドメイン（何を管理するか／誰のためか）は未確定であり、Next.js App Router 上で構築する Web フロントエンドの土台のみが用意されている。

## Core Capabilities

現時点では `create-next-app` 由来のスケルトンのみで、業務機能は未実装。今後追加される機能は以下のいずれかの軸に沿うことを想定する（確定したら本セクションを更新）。

- 対象リソース（ユーザー／案件／タスク等）の登録・参照・更新・削除
- 一覧 / 詳細の閲覧 UI
- フィルタリング・検索による絞り込み

## Target Use Cases

- 「何かを管理する」業務オペレーションをブラウザから行うユーザー
- 具体的なユースケース・ペルソナは仕様策定時に `.kiro/specs/{feature}/requirements.md` で定義する

## Value Proposition

- Next.js（App Router）+ React 19 + Tailwind CSS 4 をベースとした、軽量で型安全な管理画面基盤
- 仕様駆動開発（Kiro 方式）と組み合わせ、要求 → 設計 → タスク → 実装のトレーサビリティを担保

## Non-Goals（当面）

- ネイティブモバイルアプリ / デスクトップアプリの提供
- バックエンド／DB の選定は本ステアリングのスコープ外（必要になった時点で `tech.md` および custom steering を追加）

---
_業務ドメインが固まった段階で、Core Capabilities / Target Use Cases / Value Proposition を具体化すること。_
