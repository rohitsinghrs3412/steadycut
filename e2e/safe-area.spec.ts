import { test, expect } from "@playwright/test";

test.describe("Safe Area Padding (Mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/SteadyCut/);
  });

  test("mobile bottom navigation bar should have safe area bottom padding", async ({ page }) => {
    // Mobile navigation bar should be visible on mobile viewport
    const bottomNav = page.locator('nav[aria-label="Mobile primary"]');
    await expect(bottomNav).toBeVisible();

    // Check computed padding-bottom
    const paddingBottomStr = await bottomNav.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });

    const paddingBottom = parseFloat(paddingBottomStr);
    console.log(`Mobile bottom nav padding-bottom: ${paddingBottomStr}`);

    // pb-[max(0.75rem,env(safe-area-inset-bottom))] -> 0.75rem is 12px
    expect(paddingBottom).toBeGreaterThanOrEqual(12);
  });

  test("Quick Log sheet should open and have bottom safe area padding", async ({ page }) => {
    // Open Quick Log sheet
    const quickLogButton = page.getByRole("button", { name: "Open quick log" });
    await expect(quickLogButton).toBeVisible();
    await quickLogButton.click();

    // The sheet content should be displayed as a dialog
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();

    // Check computed padding-bottom on the dialog
    const paddingBottomStr = await sheet.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });

    const paddingBottom = parseFloat(paddingBottomStr);
    console.log(`Quick Log sheet padding-bottom: ${paddingBottomStr}`);

    // pb-[max(1rem,env(safe-area-inset-bottom))] -> 1rem is 16px
    expect(paddingBottom).toBeGreaterThanOrEqual(16);
  });
});
