const { test: base, expect } = require("@playwright/test");
const { startTestServer } = require("./test-server");

const test = /** @type {any} */ (base).extend({
  // eslint-disable-next-line no-empty-pattern
  testServer: async ({}, use) => {
    const testServer = await startTestServer();
    await use(testServer);
    await testServer.cleanup();
  },
});

async function gotoApp(page, testServer) {
  await page.goto(testServer.baseURL);

  await expect(page).toHaveTitle("What's for Dinner");
  await expect(
    page.getByRole("heading", { name: "What's for Dinner?" }),
  ).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(3);
  await expect(page.locator("#meal-stats")).toContainText("3 active meals");
  await expect(page.locator("#pantry-list")).toContainText("Ground beef");
}

async function openTab(page, tabName) {
  await page.getByRole("tab", { name: new RegExp(tabName, "i") }).click();
  await expect(page.locator(`#tab-${tabName.toLowerCase()}`)).toBeVisible();
}

module.exports = {
  test,
  expect,
  gotoApp,
  openTab,
};
