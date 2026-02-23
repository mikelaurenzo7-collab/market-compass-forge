import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Grapevine/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("can navigate to portfolios when logged in", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/portfolios/);
  await expect(page.getByText("Portfolios")).toBeVisible();
});
