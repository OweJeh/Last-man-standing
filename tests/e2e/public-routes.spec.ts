import { test, expect } from "@playwright/test";

test.describe("Last Man Standing Public & Auth Routes", () => {
  test("homepage renders hero, headline, and CTAs", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /ONE NUMBER\. ONE CHANCE\./i })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /ENTER A RAFFLE/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /WATCH LIVE/i })).toBeVisible();
  });

  test("unauthenticated access to /dashboard and /admin redirects to /login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("public informational routes load without 500 errors", async ({ page }) => {
    for (const route of [
      "/how-it-works",
      "/raffles",
      "/winners",
      "/terms",
      "/privacy",
      "/responsible-play",
      "/contact",
    ]) {
      const res = await page.goto(route);
      expect(res?.status()).toBeLessThan(500);
    }
  });
});

