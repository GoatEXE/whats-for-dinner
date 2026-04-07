const { test, expect } = require("@playwright/test");
const { startTestServer } = require("../fixtures/test-server");

test.describe("UI harness bootstrap", () => {
  let testServer;

  test.beforeAll(async () => {
    testServer = await startTestServer();
  });

  test.afterAll(async () => {
    if (testServer) {
      await testServer.cleanup();
    }
  });

  test("loads the seeded app shell", async ({ page }) => {
    await page.goto(testServer.baseURL);

    await expect(page).toHaveTitle("What's for Dinner");
    await expect(
      page.getByRole("heading", { name: "What's for Dinner?" }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(3);

    await page.getByRole("tab", { name: /Meals/i }).click();
    await expect(
      page.getByRole("heading", { name: "Spaghetti Tacos" }),
    ).toBeVisible();
  });
});
