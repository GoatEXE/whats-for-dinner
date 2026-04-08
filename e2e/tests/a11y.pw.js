const AxeBuilder = require("@axe-core/playwright").default;
const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("accessibility audit — seeded states", () => {
  test("Plan tab default state has no a11y violations", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Meals tab seeded state has no a11y violations", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");
    await expect(page.locator("#meals-list article")).toHaveCount(3);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Shop tab seeded state has no a11y violations", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "shop");
    await expect(page.locator("#pantry-list li")).toHaveCount(8);

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
