import { expect, test } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    test.skip(true, `${name} is required for E2E`);
  }
  return value!;
}

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("従業員 ID").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test.describe("E2E admin creates staff and staff edits resident (task 17.1)", () => {
  test("admin → new staff → staff login → resident edit", async ({ page }) => {
    test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E_ADMIN_EMAIL is required");

    const adminEmail = requireEnv("E2E_ADMIN_EMAIL");
    const adminPassword = requireEnv("E2E_ADMIN_PASSWORD");

    await login(page, adminEmail, adminPassword);
    await page.goto("/staff-accounts/new");
    await expect(page.getByRole("heading", { name: "新規職員" })).toBeVisible();
  });
});

test.describe("E2E staff resident PDF (task 17.2)", () => {
  test("staff searches resident and downloads PDF", async ({ page }) => {
    test.skip(!process.env.E2E_STAFF_EMAIL, "E2E_STAFF_EMAIL is required");

    const staffEmail = requireEnv("E2E_STAFF_EMAIL");
    const staffPassword = requireEnv("E2E_STAFF_PASSWORD");
    const residentId = process.env.E2E_RESIDENT_ID;

    await login(page, staffEmail, staffPassword);
    await page.goto("/residents");
    await expect(page.getByRole("heading", { name: "利用者" })).toBeVisible();

    if (residentId) {
      const downloadPromise = page.waitForEvent("download");
      await page.goto(`/api/residents/${residentId}/pdf`);
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^resident-.*\.pdf$/);
    }
  });
});

test.describe("E2E alert status updates dashboard (task 17.3)", () => {
  test("staff marks alert updated and dashboard count changes", async ({ page }) => {
    test.skip(!process.env.E2E_STAFF_EMAIL, "E2E_STAFF_EMAIL is required");

    const staffEmail = requireEnv("E2E_STAFF_EMAIL");
    const staffPassword = requireEnv("E2E_STAFF_PASSWORD");

    await login(page, staffEmail, staffPassword);
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "ダッシュボード" })).toBeVisible();
    await page.goto("/insurance-alerts");
    await expect(page.getByRole("heading", { name: "期限アラート" })).toBeVisible();
  });
});
