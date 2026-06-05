import { vi, type Mock } from "vitest";

/**
 * 任意のリポジトリ／サービスインタフェース `T` の全メソッドを `vi.fn()` 化した
 * モックを作るユーティリティ。
 *
 * - インタフェース型 `T` の関数メンバを `Mock<T[K]>` に置換する。
 * - 既定では空モック（戻り値 `undefined`）。テスト側で `.mockResolvedValue(...)`
 *   などを使って必要な戻り値を仕込む。
 * - 任意のメソッドを `overrides` で実装関数として差し替え可能。
 *   既に `vi.fn()` であればそのまま、そうでなければ自動で `vi.fn(impl)` で包むため
 *   呼び出し履歴・`toHaveBeenCalled*` 系アサーションが常に使える。
 *
 * @example
 *   const repo = createFakeRepository<ResidentRepository>({
 *     findById: async (id) => (id === "known" ? someRow : null),
 *   });
 *   await service.getResidentById("known", session);
 *   expect(repo.findById).toHaveBeenCalledWith("known", expect.any(Array));
 */
export type FakeRepository<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? Mock<(...args: A) => R>
    : T[K];
};

type AnyFn = (...args: unknown[]) => unknown;

function isMockFn(value: unknown): value is Mock {
  return (
    typeof value === "function" &&
    (value as { _isMockFunction?: boolean })._isMockFunction === true
  );
}

export function createFakeRepository<T extends object>(
  overrides: Partial<Record<keyof T, T[keyof T] | Mock>> = {},
): FakeRepository<T> {
  const holder: Record<string | symbol, unknown> = {};

  for (const [key, value] of Object.entries(overrides)) {
    if (isMockFn(value)) {
      holder[key] = value;
    } else if (typeof value === "function") {
      holder[key] = vi.fn(value as AnyFn);
    } else {
      holder[key] = value;
    }
  }

  return new Proxy(holder, {
    get(target, prop) {
      if (!(prop in target)) {
        target[prop] = vi.fn();
      }
      return target[prop];
    },
  }) as FakeRepository<T>;
}
