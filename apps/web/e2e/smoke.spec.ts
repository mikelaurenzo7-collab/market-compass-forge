import { test, expect } from "@playwright/test";

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /Grapevine/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
});

test("can login and navigate to portfolios", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/portfolios/);
  await expect(page.getByText("Portfolios")).toBeVisible();
});

test("can open portfolio wizard with CSV option", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/portfolios/new");
  await page.getByRole("button", { name: /Upload CSV/i }).click();
  await expect(page.getByText(/CSV File|company_name/i)).toBeVisible();
});

test("can open simulation lab and see run form", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/simulations");
  await expect(page.getByText("Simulation Lab")).toBeVisible();
  await expect(page.getByText(/Portfolio|Scenario/i)).toBeVisible();
});

test("activity feed shows events", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/activity");
  await expect(page.getByText("Activity Feed")).toBeVisible();
});

test("system page shows compute backend", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/system");
  await expect(page.getByText("System")).toBeVisible();
  await expect(page.getByText(/Compute|numpy|GPU/i)).toBeVisible();
});

test("benchmarks page renders", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/benchmarks");
  await expect(page.getByText("Benchmarks")).toBeVisible();
});

test("roadmap gpu page renders", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/email/i).first().fill("demo@grapevine.io");
  await page.getByLabel(/password/i).fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/roadmap/gpu");
  await expect(page.getByText(/GPU|Roadmap|CuPy|RAPIDS/i)).toBeVisible();
});
