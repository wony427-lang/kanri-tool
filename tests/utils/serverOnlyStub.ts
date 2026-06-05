// Vitest 専用の `server-only` スタブ。
// 本番ビルドでは `node_modules/server-only` が Client Component からの import を
// 拒否するが、Node 上の単体テストでは衝突するため、テスト時のみここに alias する。
export {};
