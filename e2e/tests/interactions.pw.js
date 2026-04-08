const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("quick picker interaction", () => {
  test("picks a random meal and shows a result card with actions", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    // The Plan tab is the default; quick picker is visible
    const pickerSection = page.locator(
      'section[aria-label="Quick picker"]',
    );
    await expect(pickerSection).toContainText("No meal picked yet");

    // Click the Pick dinner button
    await pickerSection
      .getByRole("button", { name: "Pick dinner" })
      .click();

    // A result card should appear with a real meal name (one of the 3 seeded meals)
    const resultCard = page.locator("#random-result");
    await expect(resultCard).not.toContainText("No meal picked yet");
    // The result must have action buttons
    await expect(
      resultCard.getByRole("button", { name: /Serve/ }),
    ).toBeVisible();
    await expect(
      resultCard.getByRole("button", { name: /Edit/ }),
    ).toBeVisible();
  });

  test("can pick again and get a result each time", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    const pickBtn = page
      .locator('section[aria-label="Quick picker"]')
      .getByRole("button", { name: "Pick dinner" });

    // Pick twice — both should succeed (may be same or different meal)
    await pickBtn.click();
    await expect(page.locator("#random-result")).not.toContainText(
      "No meal picked yet",
    );
    await pickBtn.click();
    await expect(page.locator("#random-result")).not.toContainText(
      "No meal picked yet",
    );
  });
});

test.describe("archive meal via dialog", () => {
  test("shows in-app confirm dialog and archives the meal on confirm", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    // Verify 3 meals before archive
    await expect(page.locator("#meals-list article")).toHaveCount(3);

    // Click Archive on a specific meal
    const mealCard = page.locator("#meals-list article").filter({
      has: page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    });
    await mealCard
      .getByRole("button", { name: "Archive Chicken Stir-Fry" })
      .click();

    // Dialog should appear
    const dialog = page.locator("#dialog-overlay");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".dialog-title")).toContainText(
      "Archive meal",
    );
    await expect(dialog.locator(".dialog-body")).toContainText(
      "Archive this meal?",
    );

    // Confirm the archive
    await dialog
      .getByRole("button", { name: "Confirm" })
      .click();

    // Dialog should close
    await expect(dialog).toBeHidden();

    // Meal should be gone — only 2 left
    await expect(page.locator("#meals-list article")).toHaveCount(2);
    await expect(
      page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    ).toBeHidden();

    // Status banner should confirm
    await expect(page.locator("#status-banner")).toContainText("Meal archived");
  });

  test("cancelling the archive dialog does not remove the meal", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    await expect(page.locator("#meals-list article")).toHaveCount(3);

    const mealCard = page.locator("#meals-list article").filter({
      has: page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    });
    await mealCard
      .getByRole("button", { name: "Archive Chicken Stir-Fry" })
      .click();

    // Dialog visible
    const dialog = page.locator("#dialog-overlay");
    await expect(dialog).toBeVisible();

    // Cancel
    await dialog.getByRole("button", { name: "Cancel" }).click();

    // Dialog closes, meal still present
    await expect(dialog).toBeHidden();
    await expect(page.locator("#meals-list article")).toHaveCount(3);
    await expect(
      page.getByRole("heading", { name: "Chicken Stir-Fry" }),
    ).toBeVisible();
  });
});

test.describe("new weekly plan via dialog", () => {
  test("creates a plan from the empty state using the date prompt dialog", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    const planPanel = page.locator("#weekly-plan-panel");
    await expect(planPanel).toContainText("No active weekly plan");

    // Click Create plan (from the empty-state inline form, not the dialog)
    // The empty state has a date input + Create plan button
    await planPanel
      .getByRole("button", { name: "Create plan" })
      .click();

    // Plan should appear with 7 day slots
    await expect(planPanel).toContainText("0/7 meals planned");
    await expect(
      planPanel.getByRole("combobox", { name: "Pick meal for Monday" }),
    ).toBeVisible();
    await expect(
      planPanel.getByRole("combobox", { name: "Pick meal for Sunday" }),
    ).toBeVisible();
  });

  test("new week button opens prompt dialog for date entry", async ({
    page,
    request,
    testServer,
  }) => {
    // Create initial plan via API
    await request.post(`${testServer.baseURL}/api/weekly-plans`, {
      data: { weekStart: "2030-01-07" },
    });
    await gotoApp(page, testServer);

    // Click "New week" header button
    await page
      .locator("#weekly-plan-panel")
      .getByRole("button", { name: "New week" })
      .click();

    // Dialog should appear with prompt input
    const dialog = page.locator("#dialog-overlay");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".dialog-title")).toContainText(
      "New weekly plan",
    );
    await expect(dialog.locator(".dialog-input")).toBeVisible();

    // Enter a new Monday date and confirm
    await dialog.locator(".dialog-input").fill("2030-01-14");
    await dialog.getByRole("button", { name: "OK" }).click();

    // Dialog closes, new plan visible
    await expect(dialog).toBeHidden();
    await expect(
      page.locator("#weekly-plan-panel"),
    ).toContainText("2030-01-14");
    await expect(page.locator("#status-banner")).toContainText(
      "Weekly plan created",
    );
  });
});

test.describe("meal creation via form", () => {
  test("creates a new meal with name and ingredient, appears in the library", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);
    await openTab(page, "meals");

    // Verify starting count
    await expect(page.locator("#meals-list article")).toHaveCount(3);

    // Fill in the meal form
    const editorSection = page.locator('section[aria-label="Meal editor"]');
    await editorSection.getByLabel("Meal name").fill("Grilled Salmon");
    await editorSection.getByLabel("Prep minutes").fill("25");
    await editorSection
      .getByLabel("Notes")
      .fill("Season with lemon and dill");
    await editorSection.getByLabel("Tags").fill("healthy, quick");

    // Fill in the first ingredient row
    const ingredientRow = editorSection.locator(".ingredient-row").first();
    await ingredientRow.getByPlaceholder("Ingredient").fill("Salmon fillet");
    await ingredientRow.getByPlaceholder("e.g. 1 lb").fill("2 fillets");

    // Submit the form
    await editorSection.getByRole("button", { name: "Save meal" }).click();

    // Status banner confirms
    await expect(page.locator("#status-banner")).toContainText("Meal created");

    // The meal library now has 4 meals
    await expect(page.locator("#meals-list article")).toHaveCount(4);

    // The new meal card is visible with the right content
    const newCard = page.locator("#meals-list article").filter({
      has: page.getByRole("heading", { name: "Grilled Salmon" }),
    });
    await expect(newCard).toBeVisible();
    await expect(newCard).toContainText("25 min");
    await expect(newCard).toContainText("Season with lemon and dill");
    await expect(newCard).toContainText("Salmon fillet");
    await expect(newCard).toContainText("healthy");

    // The form resets to "Add meal" after saving
    await expect(editorSection.getByRole("heading").first()).toContainText(
      "Add meal",
    );
  });
});

test.describe("plan to shopping list flow", () => {
  test("generates a shopping list from a weekly plan and switches to Shop tab", async ({
    page,
    request,
    testServer,
  }) => {
    // Create a plan with two meals assigned via API
    await request.post(`${testServer.baseURL}/api/weekly-plans`, {
      data: { weekStart: "2030-01-07" },
    });
    // Spaghetti Tacos (id 1) needs taco shells (not in pantry)
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/0`,
      { data: { mealId: 1 } },
    );
    // Chicken Stir-Fry (id 2) needs chicken breast + frozen veggies (not in pantry)
    await request.patch(
      `${testServer.baseURL}/api/weekly-plans/current/slots/2`,
      { data: { mealId: 2 } },
    );

    await gotoApp(page, testServer);

    // Plan tab is active; verify assigned meals visible
    const planPanel = page.locator("#weekly-plan-panel");
    await expect(planPanel).toContainText("2/7 meals planned");

    // Click "Generate shopping list"
    await planPanel
      .getByRole("button", { name: "Generate shopping list" })
      .click();

    // Should switch to the Shop tab
    await expect(page.locator("#tab-shop")).toBeVisible();
    await expect(page.locator("#tab-plan")).toBeHidden();

    // Status banner confirms
    await expect(page.locator("#status-banner")).toContainText(
      "Shopping list generated from plan",
    );

    // Shopping list result should be visible with items
    const shopResult = page.locator("#shopping-list-result");
    await expect(shopResult).toContainText("Need to buy");

    // Should show items that aren't in pantry (e.g., taco shells, chicken breast)
    await expect(shopResult).toContainText("Taco shells");
    await expect(shopResult).toContainText("Chicken breast");

    // Summary stats should reflect 2 meals
    await expect(shopResult).toContainText("2 meals");

    // Selected meal chips should be visible
    const chips = page.locator("#shopping-selected-meals");
    await expect(chips).toContainText("Spaghetti Tacos");
    await expect(chips).toContainText("Chicken Stir-Fry");
  });
});
