/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from "@playwright/test";

test.describe("Dashboard Tabs (Mobile)", () => {
  test.beforeEach(async ({ page }) => {
    // Go to the dashboard page where tabs are present
    await page.goto("/dashboard");
    // Ensure the page has loaded
    await expect(page).toHaveTitle(/SteadyCut/);
  });

  test("should transition tabs correctly and swap content", async ({ page }) => {
    // Wait for the mobile tab bar to be visible
    const summaryTabButton = page.getByRole("button", { name: "Summary", exact: true });
    const checkinTabButton = page.getByRole("button", { name: "Check-in", exact: true });
    const trendsTabButton = page.getByRole("button", { name: "Trends", exact: true });

    // Verify initial tab is Summary
    await expect(page.getByText("Calories today")).toBeVisible();
    await expect(page.getByText("Today's check-in")).not.toBeVisible();

    // Click Check-in tab
    await checkinTabButton.click();
    await expect(page.getByText("Today's check-in")).toBeVisible();
    await expect(page.getByText("Calories today")).not.toBeVisible();

    // Click Trends tab
    await trendsTabButton.click();
    await expect(page.getByText("Weight trend")).toBeVisible();
    await expect(page.getByText("Today's check-in")).not.toBeVisible();

    // Click Summary tab back
    await summaryTabButton.click();
    await expect(page.getByText("Calories today")).toBeVisible();
  });

  test("should preserve scroll position across tab transitions", async ({ page }) => {
    // Wait for mobile content to be visible first before scrolling
    await expect(page.getByText("Calories today")).toBeVisible();

    // Scroll down the page on Summary tab
    await page.evaluate(() => {
      window.scrollTo(0, 150);
    });
    
    // Allow any paint/scroll event to fire
    await page.waitForTimeout(100);

    const initialScrollY = await page.evaluate(() => window.scrollY);
    expect(initialScrollY).toBeGreaterThanOrEqual(100);

    // Switch to Check-in tab
    const checkinTabButton = page.getByRole("button", { name: "Check-in", exact: true });
    await checkinTabButton.click();

    // Check if scroll position is preserved
    const afterTransitionScrollY = await page.evaluate(() => window.scrollY);
    
    // Log for debugging if there is a layout bug
    console.log(`Scroll Y before transition: ${initialScrollY}, after: ${afterTransitionScrollY}`);
    
    // Assert scroll position did not reset to 0
    expect(afterTransitionScrollY).toBe(initialScrollY);
  });

  test("should maintain Cumulative Layout Shift (CLS) below 0.1 during tab transitions", async ({ page }) => {
    // Initialize Performance Observer for layout shift
    await page.evaluate(() => {
      (window as any).cumulativeLayoutShift = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            (window as any).cumulativeLayoutShift += (entry as any).value;
          }
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
      (window as any).clsObserver = observer;
    });

    // Click the Check-in tab
    const checkinTabButton = page.getByRole("button", { name: "Check-in", exact: true });
    await checkinTabButton.click();
    
    // Wait for animation or layout to settle
    await page.waitForTimeout(300);

    // Click back to Summary
    const summaryTabButton = page.getByRole("button", { name: "Summary", exact: true });
    await summaryTabButton.click();
    await page.waitForTimeout(300);

    // Get the accumulated CLS
    const cls = await page.evaluate(() => {
      if ((window as any).clsObserver) {
        (window as any).clsObserver.disconnect();
      }
      return (window as any).cumulativeLayoutShift || 0;
    });

    console.log(`Measured Cumulative Layout Shift (CLS) during tab swap: ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });
});
