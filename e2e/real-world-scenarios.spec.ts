import { test, expect } from "@playwright/test";

test.describe("Real-World User Journey (Mobile)", () => {
  test("user can navigate, switch tabs, open quick log, view progress, and return", async ({ page }) => {
    // 1. Visit the dashboard
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/SteadyCut/);

    // Verify we are on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // 2. Check tab transitions
    const summaryTab = page.getByRole("button", { name: "Summary", exact: true });
    const checkinTab = page.getByRole("button", { name: "Check-in", exact: true });
    const trendsTab = page.getByRole("button", { name: "Trends", exact: true });

    // Verify initial state (Summary)
    await expect(page.getByText("Calories today")).toBeVisible();

    // Go to Check-in
    await checkinTab.click();
    await expect(page.getByText("Today's check-in")).toBeVisible();

    // Go to Trends
    await trendsTab.click();
    await expect(page.getByText("Weight trend")).toBeVisible();

    // Go back to Summary
    await summaryTab.click();
    await expect(page.getByText("Calories today")).toBeVisible();

    // 3. Open Quick Log Sheet
    const quickLogButton = page.getByRole("button", { name: "Open quick log" });
    await expect(quickLogButton).toBeVisible();
    await quickLogButton.click();

    // Verify Quick Log is open
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(page.getByText("Quick log", { exact: true })).toBeVisible();

    // Close the Quick Log Sheet using Escape key
    await page.keyboard.press("Escape");
    await expect(sheet).not.toBeVisible();

    // 4. Navigate to Progress Page
    const mobileNav = page.locator('nav[aria-label="Mobile primary"]');
    const progressLink = mobileNav.getByRole("link", { name: "Progress" });
    await expect(progressLink).toBeVisible();
    await progressLink.click();

    // Verify URL is /progress
    await expect(page).toHaveURL(/\/progress/);
    await expect(page.getByRole("heading", { name: "Progress" })).toBeVisible();

    // 5. Navigate back to Today page
    const todayLink = mobileNav.getByRole("link", { name: "Today" });
    await expect(todayLink).toBeVisible();
    await todayLink.click();

    // Verify we are back on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Calories today")).toBeVisible();
  });
});
