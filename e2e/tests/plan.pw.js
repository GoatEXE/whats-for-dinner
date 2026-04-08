const { test, expect, gotoApp } = require("../fixtures/smoke");

const PLAN_WEEK_START = "2030-01-07";
const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

test.describe("weekly plan smoke", () => {
  test("shows the empty weekly plan state on first load", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    const weeklyPlanPanel = page.locator("#weekly-plan-panel");
    await expect(weeklyPlanPanel).toContainText("No active weekly plan.");
    await expect(
      weeklyPlanPanel.getByRole("button", { name: "Create plan" }),
    ).toBeVisible();
  });

  test("renders all seven day slots after creating a plan via API", async ({
    page,
    request,
    testServer,
  }) => {
    const response = await request.post(
      `${testServer.baseURL}/api/weekly-plans`,
      {
        data: { weekStart: PLAN_WEEK_START },
      },
    );

    expect(response.status()).toBe(201);
    await gotoApp(page, testServer);

    const weeklyPlanPanel = page.locator("#weekly-plan-panel");
    await expect(weeklyPlanPanel).toContainText(`Week of ${PLAN_WEEK_START}`);

    for (const dayLabel of DAY_LABELS) {
      await expect(
        weeklyPlanPanel.getByRole("combobox", {
          name: `Pick meal for ${dayLabel}`,
        }),
      ).toBeVisible();
    }
  });
});
