import { HttpError } from "../src/errors";
import { exportMealsEnvelope, importMeals } from "../src/import-export";

describe("exportMealsEnvelope", () => {
  it("builds the recipe export envelope with the existing format and version", () => {
    const exported = exportMealsEnvelope(
      [
        {
          name: "Tacos",
          notes: null,
          prepMinutes: 20,
          isFavorite: true,
          tags: ["quick"],
          ingredients: [
            { name: "Tortillas", quantityText: "8", isOptional: false },
          ],
        },
      ],
      "2026-04-10T00:00:00.000Z",
    );

    expect(exported).toEqual({
      format: "whats-for-dinner-recipes",
      version: 1,
      exportedAt: "2026-04-10T00:00:00.000Z",
      meals: [
        {
          name: "Tacos",
          notes: null,
          prepMinutes: 20,
          isFavorite: true,
          tags: ["quick"],
          ingredients: [
            { name: "Tortillas", quantityText: "8", isOptional: false },
          ],
        },
      ],
    });
  });
});

describe("importMeals", () => {
  it("imports valid meals, skips duplicates by normalized name, and reports validation failures", () => {
    let nextId = 1;

    const result = importMeals(
      {
        format: "whats-for-dinner-recipes",
        version: 1,
        meals: [
          {
            name: "  Taco Soup  ",
            ingredients: [{ name: "Beans" }],
          },
          {
            name: "taco   soup",
            ingredients: [{ name: "Beans" }],
          },
          {
            name: "",
            ingredients: [],
          },
          42,
        ],
      },
      {
        existingMeals: [{ name: "Existing Meal" }],
        importMeal: (meal) => ({ id: nextId++, name: meal.name }),
      },
    );

    expect(result.data.imported).toEqual([{ id: 1, name: "Taco Soup" }]);
    expect(result.data.skipped).toEqual([
      { name: "taco   soup", reason: "duplicate" },
    ]);
    expect(result.data.failed).toHaveLength(2);
    expect(result.data.failed[0]).toEqual({
      name: null,
      reason: expect.stringContaining("Validation:"),
    });
    expect(result.data.failed[1]).toEqual({
      name: null,
      reason: expect.stringContaining("Validation:"),
    });
    expect(result.data.summary).toEqual({
      importedCount: 1,
      skippedCount: 1,
      failedCount: 2,
      totalCount: 4,
    });
  });

  it("throws a validation error when the envelope itself is invalid", () => {
    expect(() => importMeals({ meals: [] })).toThrow(HttpError);

    try {
      importMeals({ meals: [] });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).statusCode).toBe(400);
      expect((error as HttpError).message).toBe("Validation failed");
    }
  });

  it("treats callback duplicate conflicts like the original service", () => {
    const result = importMeals(
      {
        format: "whats-for-dinner-recipes",
        version: 1,
        meals: [
          {
            name: "Chili",
            ingredients: [{ name: "Beans" }],
          },
        ],
      },
      {
        importMeal() {
          throw new HttpError(409, "A meal with that name already exists");
        },
      },
    );

    expect(result.data.imported).toEqual([]);
    expect(result.data.skipped).toEqual([{ name: "Chili", reason: "duplicate" }]);
    expect(result.data.failed).toEqual([]);
  });
});
