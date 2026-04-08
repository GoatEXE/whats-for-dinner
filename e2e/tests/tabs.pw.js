const { test, expect, gotoApp, openTab } = require("../fixtures/smoke");

test.describe("tab shell smoke", () => {
  test("renders the page shell with Plan active by default", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    await expect(page.getByRole("tab", { name: /Plan/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: /Shop/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    await expect(page.getByRole("tab", { name: /Meals/i })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    await expect(page.locator("#tab-plan")).toBeVisible();
    await expect(page.locator("#tab-shop")).toBeHidden();
    await expect(page.locator("#tab-meals")).toBeHidden();
    await expect(
      page.getByRole("heading", { name: "Weekly plan" }),
    ).toBeVisible();
  });

  test("switches between Plan, Shop, and Meals tabs", async ({
    page,
    testServer,
  }) => {
    await gotoApp(page, testServer);

    await openTab(page, "shop");
    await expect(page.getByRole("tab", { name: /Shop/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tab-plan")).toBeHidden();
    await expect(page.locator("#tab-shop")).toBeVisible();
    await expect(page.locator("#tab-meals")).toBeHidden();
    await expect(page.getByRole("heading", { name: "Pantry" })).toBeVisible();

    await openTab(page, "meals");
    await expect(page.getByRole("tab", { name: /Meals/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tab-plan")).toBeHidden();
    await expect(page.locator("#tab-shop")).toBeHidden();
    await expect(page.locator("#tab-meals")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Meals" })).toBeVisible();

    await openTab(page, "plan");
    await expect(page.getByRole("tab", { name: /Plan/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator("#tab-plan")).toBeVisible();
    await expect(page.locator("#tab-shop")).toBeHidden();
    await expect(page.locator("#tab-meals")).toBeHidden();
  });

  test("keeps the mobile tab bar pinned to the bottom of the viewport", async ({
    page,
    testServer,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile viewport only");

    await gotoApp(page, testServer);

    const tabBar = page.locator(".tab-bar");
    await expect(tabBar).toBeVisible();
    const tabBarMetrics = await tabBar.evaluate((element) => {
      const style = globalThis.getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        position: style.position,
        bottom: style.bottom,
        left: style.left,
        right: style.right,
        viewportBottomGap: globalThis.innerHeight - rect.bottom,
      };
    });

    expect(tabBarMetrics.position).toBe("fixed");
    expect(tabBarMetrics.bottom).toBe("0px");
    expect(tabBarMetrics.left).toBe("0px");
    expect(tabBarMetrics.right).toBe("0px");
    expect(tabBarMetrics.viewportBottomGap).toBeLessThanOrEqual(1);
  });

  test("matches the tab bar shell screenshot", async ({ page, testServer }) => {
    await gotoApp(page, testServer);

    await expect(page.locator(".tab-bar")).toHaveScreenshot("tab-bar-shell.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
