import { describe, expect, it } from "vitest";

import { createFakeRepository } from "@test/utils/fakeRepository";
import { createFakeSession } from "@test/utils/fakeSession";

describe("test foundation (task 1.5)", () => {
  it("createFakeSession returns a safe-default viewer session", () => {
    const session = createFakeSession();
    expect(session.role).toBe("viewer");
    expect(session.isActive).toBe(true);
    expect(session.facilityIds).toEqual(["facility-a"]);
  });

  it("createFakeSession applies overrides without mutating base", () => {
    const a = createFakeSession({ role: "admin", facilityIds: ["x", "y"] });
    const b = createFakeSession();
    expect(a.role).toBe("admin");
    expect(a.facilityIds).toEqual(["x", "y"]);
    expect(b.role).toBe("viewer");
    expect(b.facilityIds).toEqual(["facility-a"]);
  });

  it("createFakeRepository auto-creates vi.fn mocks on demand", async () => {
    interface DummyRepo {
      findById(id: string): Promise<string | null>;
      delete(id: string): Promise<void>;
    }
    const repo = createFakeRepository<DummyRepo>({
      findById: async () => "found",
    });

    await expect(repo.findById("abc")).resolves.toBe("found");
    expect(repo.findById).toHaveBeenCalledWith("abc");

    // 未指定の delete も呼べる（自動で vi.fn() が割り当てられる）
    await repo.delete("xyz");
    expect(repo.delete).toHaveBeenCalledTimes(1);
  });
});
