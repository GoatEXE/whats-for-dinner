const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("shop smoke", () => {
  test("renders the seeded pantry items in the Shop tab", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "shop");

    const shopPanel = page.locator("#tab-shop");
    await expect(shopPanel.getByRole("heading", { name: "Pantry" })).toBeVisible();
    await expect(shopPanel.getByText("Ground beef", { exact: true })).toBeVisible();
    await expect(shopPanel.getByText("Rice", { exact: true })).toBeVisible();
    await expect(shopPanel.getByText("Soy sauce", { exact: true })).toBeVisible();
    await expect(shopPanel.locator("#pantry-list li")).toHaveCount(8);
  });

  test("shows the empty shopping list prompt before any meal is selected", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "shop");

    await expect(page.locator("#shopping-selected-meals")).toContainText(
      "No meals selected yet",
    );
    await expect(page.locator("#shopping-list-form")).toBeHidden();
  });
});
