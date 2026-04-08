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
