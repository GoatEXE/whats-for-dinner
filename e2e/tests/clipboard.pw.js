const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("weekly plan copy", () => {
  test("copies the current plan as formatted text", async ({
    page,
    context,
    request,
    testServer,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Create plan with 2 meals via API
    await request.post(`${testServer.baseURL}/api/weekly-plans`, {
      data: { weekStart: "2030-01-07" },
    });
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/0`,
      { data: { mealId: 1 } },
    );
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/3`,
      { data: { mealId: 2, notes: "use leftover rice" } },
    );

    await gotoApp(page, testServer);

    const planPanel = page.locator("#weekly-plan-panel");
    await expect(planPanel).toContainText("2/7 meals planned");

    // Click the exact "Copy plan" button (not "Copy plan & shopping list")
    await planPanel
      .getByRole("button", { name: "Copy plan", exact: true })
      .click();

    // Wait for status confirmation before reading clipboard
    await expect(page.locator("#status-banner")).toContainText(
      "Weekly plan copied to clipboard",
    );

    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );

    // Verify clipboard content structure
    expect(clipboard).toContain("Dinner plan");
    expect(clipboard).toContain("2030");
    expect(clipboard).toContain("Spaghetti Tacos");
    expect(clipboard).toContain("Chicken Stir-Fry");
    expect(clipboard).toContain("use leftover rice");
    expect(clipboard).toContain("(no plan)");
    // All 7 day labels present
    for (const day of [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ]) {
      expect(clipboard).toContain(day);
    }
  });
});

test.describe("shopping list copy", () => {
  test("copies the generated shopping list text", async ({
    page,
    context,
    request,
    testServer,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Create plan and assign a meal
    await request.post(`${testServer.baseURL}/api/weekly-plans`, {
      data: { weekStart: "2030-01-07" },
    });
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/0`,
      { data: { mealId: 1 } },
    );

    await gotoApp(page, testServer);

    // Generate shopping list from plan (switches to Shop tab)
    await page
      .locator("#weekly-plan-panel")
      .getByRole("button", { name: "Generate shopping list" })
      .click();
    await expect(page.locator("#tab-shop")).toBeVisible();
    await expect(page.locator("#shopping-list-result")).toContainText(
      "Need to buy",
    );

    // Click Copy to clipboard on the shopping list
    await page
      .getByRole("button", { name: "Copy shopping list to clipboard" })
      .click();

    await expect(page.locator("#status-banner")).toContainText(
      "Shopping list copied to clipboard",
    );

    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );

    expect(clipboard).toContain("Shopping list for:");
    expect(clipboard).toContain("Spaghetti Tacos");
    expect(clipboard).toContain("Need to buy:");
    expect(clipboard).toContain("Taco shells");
  });
});

test.describe("plan + shopping list share pack copy", () => {
  test("copies combined plan and shopping list in one action", async ({
    page,
    context,
    request,
    testServer,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Create plan with a meal
    await request.post(`${testServer.baseURL}/api/weekly-plans`, {
      data: { weekStart: "2030-01-07" },
    });
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/0`,
      { data: { mealId: 1 } },
    );

    await gotoApp(page, testServer);

    const planPanel = page.locator("#weekly-plan-panel");
    await expect(planPanel).toContainText("1/7 meals planned");

    // Click the share pack button
    await planPanel
      .getByRole("button", { name: "Copy plan & shopping list" })
      .click();

    // Wait for the async operation (API call + clipboard write) to complete
    await expect(page.locator("#status-banner")).toContainText(
      "Plan and shopping list copied to clipboard",
    );

    const clipboard = await page.evaluate(() =>
      navigator.clipboard.readText(),
    );

    // Plan section present
    expect(clipboard).toContain("Dinner plan");
    expect(clipboard).toContain("Spaghetti Tacos");
    expect(clipboard).toContain("(no plan)");

    // Separator
    expect(clipboard).toContain("---");

    // Shopping list section present
    expect(clipboard).toContain("Shopping list for:");
    expect(clipboard).toContain("Need to buy:");
    expect(clipboard).toContain("Taco shells");

    // The shopping list panel should also be updated (side effect)
    await openTab(page, "shop");
    await expect(page.locator("#shopping-list-result")).toContainText(
      "Need to buy",
    );
  });
});
