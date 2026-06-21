import { test, expect } from "@playwright/test";

test.describe("Charts Responsiveness (Mobile)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveTitle(/SteadyCut/);
    
    // Switch to Trends tab
    const trendsTabButton = page.getByRole("button", { name: "Trends", exact: true });
    await expect(trendsTabButton).toBeVisible();
    await trendsTabButton.click();
  });

  test("chart should be responsive and not overflow the card container", async ({ page }) => {
    // Find the weight trend card
    const card = page.locator("div.glass-card").filter({ hasText: "Weight trend" }).first();
    await expect(card).toBeVisible();

    // Find the chart container inside it
    const chart = card.locator('[data-slot="chart"]');
    await expect(chart).toBeVisible();

    // Measure bounding boxes
    const cardBox = await card.boundingBox();
    const chartBox = await chart.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(chartBox).not.toBeNull();

    if (cardBox && chartBox) {
      console.log(`Card width: ${cardBox.width}, Chart width: ${chartBox.width}`);
      // The chart should fit inside the card container and have a positive width
      expect(chartBox.width).toBeGreaterThan(0);
      expect(chartBox.width).toBeLessThanOrEqual(cardBox.width);
    }
  });

  test("X-Axis SVG labels should not overlap or collide", async ({ page }) => {
    const card = page.locator("div.glass-card").filter({ hasText: "Weight trend" }).first();
    await expect(card).toBeVisible();

    // Select the tick texts on the X Axis
    // Recharts uses .recharts-xAxis .recharts-cartesian-axis-tick text or similar structure
    const ticks = card.locator(".recharts-xAxis .recharts-cartesian-axis-tick text");
    
    // Wait for the chart to render ticks
    await page.waitForTimeout(500);

    const tickCount = await ticks.count();
    console.log(`Number of X-Axis ticks found: ${tickCount}`);

    const boxes: Array<{ x: number; width: number; text: string }> = [];
    for (let i = 0; i < tickCount; i++) {
      const tick = ticks.nth(i);
      const text = await tick.textContent() || "";
      const box = await tick.boundingBox();
      if (box && text.trim().length > 0) {
        boxes.push({ x: box.x, width: box.width, text });
      }
    }

    // Sort by horizontal position
    boxes.sort((a, b) => a.x - b.x);

    // Assert that no adjacent labels overlap
    for (let i = 0; i < boxes.length - 1; i++) {
      const current = boxes[i];
      const next = boxes[i + 1];
      const currentRight = current.x + current.width;
      
      console.log(`Tick ${i}: "${current.text}" [${current.x} - ${currentRight}], Tick ${i+1}: "${next.text}" [${next.x}]`);
      
      // Allow a tiny margin of error (e.g. 1px) for subpixel rendering, but generally they shouldn't overlap
      const overlap = currentRight - 1 > next.x;
      expect(overlap).toBe(false);
    }
  });
});
