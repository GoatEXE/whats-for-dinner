const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("visual regression — seeded states", () => {
  test("Meals tab with seeded meal cards", async ({ page, testServer }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    // Wait for the card grid to be fully populated
    await expect(page.locator("#meals-list article")).toHaveCount(3);

    await expect(page.locator("#tab-meals")).toHaveScreenshot(
      "meals-tab-seeded.png",
      { maxDiffPixelRatio: 0.01 },
    );
  });

  test("Shop tab with seeded pantry and empty shopping prompt", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "shop");

    // Wait for pantry list to be populated
    await expect(page.locator("#pantry-list li")).toHaveCount(8);

    await expect(page.locator("#tab-shop")).toHaveScreenshot(
      "shop-tab-seeded.png",
      { maxDiffPixelRatio: 0.01 },
    );
  });

  test("Plan tab empty state", async ({ page, testServer }) => {
    await gotoApp(page, testServer);

    // Plan tab is active by default; verify empty state
    await expect(page.locator("#weekly-plan-panel")).toContainText(
      "No active weekly plan",
    );

    await expect(page.locator("#tab-plan")).toHaveScreenshot(
      "plan-tab-empty.png",
      { maxDiffPixelRatio: 0.01 },
    );
  });
});
