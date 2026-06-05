import { describe, expect, it } from "vitest";

import { maskSecretValue } from "@/shared/domain/mask";
import { vendorKeyFormSchema } from "@/domains/external-vendors/schemas";

describe("maskSecretValue (task 11)", () => {
  it("masks all but the last two characters", () => {
    expect(maskSecretValue("ABCDEFGH")).toBe("******GH");
  });

  it("masks short values entirely", () => {
    expect(maskSecretValue("AB")).toBe("**");
  });
});

describe("vendorKeyFormSchema (task 11)", () => {
  it("requires vendor name and unique key", () => {
    expect(
      vendorKeyFormSchema.safeParse({
        vendorType: "medical",
        vendorName: "",
        uniqueKey: "key-001",
      }).success,
    ).toBe(false);

    expect(
      vendorKeyFormSchema.safeParse({
        vendorType: "medical",
        vendorName: "〇〇病院",
        uniqueKey: "key-001",
      }).success,
    ).toBe(true);
  });
});

describe("vendor duplicate identity (task 11)", () => {
  it("detects same resident vendor type and name pair", async () => {
    const { isDuplicateVendorIdentity } = await import(
      "@/domains/external-vendors/schemas"
    );
    const existing = [
      { id: "a", vendorType: "medical" as const, vendorName: "A病院" },
    ];
    expect(
      isDuplicateVendorIdentity(existing, {
        vendorType: "medical",
        vendorName: "A病院",
      }),
    ).toBe(true);
    expect(
      isDuplicateVendorIdentity(existing, {
        vendorType: "medical",
        vendorName: "B病院",
      }),
    ).toBe(false);
    expect(
      isDuplicateVendorIdentity(existing, {
        vendorType: "medical",
        vendorName: "A病院",
        excludeId: "a",
      }),
    ).toBe(false);
  });
});
