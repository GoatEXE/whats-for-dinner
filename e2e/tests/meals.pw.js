const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("meals smoke", () => {
  test("renders seeded meal cards in the Meals tab", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    await expect(page.locator("#meals-list article")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Spaghetti Tacos" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Black Bean Quesadillas" }),
    ).toBeVisible();
  });

  test("shows core meal actions for a seeded meal card", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    const mealCard = page.locator("#meals-list article").filter({
      has: page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    });

    await expect(mealCard).toBeVisible();
    await expect(
      mealCard.getByRole("button", { name: "Favorite Chicken Stir-Fry" }),
    ).toBeVisible();
    await expect(
      mealCard.getByRole("button", { name: "Edit Chicken Stir-Fry" }),
    ).toBeVisible();
    await expect(
      mealCard.getByRole("button", {
        name: "Serve Chicken Stir-Fry tonight",
      }),
    ).toBeVisible();
    await expect(
      mealCard.getByRole("button", {
        name: "Add Chicken Stir-Fry to shopping list",
      }),
    ).toBeVisible();
    await expect(
      mealCard.getByRole("button", { name: "Archive Chicken Stir-Fry" }),
    ).toBeVisible();
  });
});
