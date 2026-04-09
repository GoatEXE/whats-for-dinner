const request = require("supertest");
const { createTestContext } = require("../helpers/test-app");

const contexts = [];

function setup() {
  const context = createTestContext();
  contexts.push(context);
  return context;
}

function buildImportPayload(meals, overrides = {}) {
  return {
    format: "whats-for-dinner-recipes",
    version: 1,
    exportedAt: new Date().toISOString(),
    meals,
    ...overrides,
  };
}

function toPortableMeal(meal) {
  return {
    name: meal.name,
    notes: meal.notes ?? null,
    prepMinutes: meal.prepMinutes ?? null,
    isFavorite: meal.isFavorite,
    tags: meal.tags ?? [],
    ingredients: meal.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantityText: ingredient.quantityText ?? null,
      isOptional: Boolean(ingredient.isOptional),
    })),
  };
}

function sortPortableMeals(meals) {
  return [...meals].sort((left, right) => left.name.localeCompare(right.name));
}

async function getExportPayload(app) {
  const exportResponse = await request(app).get("/api/meals/export");

  if (exportResponse.status === 404) {
    const listResponse = await request(app).get("/api/meals").expect(200);
    return buildImportPayload(listResponse.body.data.map(toPortableMeal));
  }

  expect(exportResponse.status).toBe(200);
  return exportResponse.body;
}

afterEach(() => {
  while (contexts.length > 0) {
    const context = contexts.pop();

    if (context) {
      context.cleanup();
    }
  }
});

describe("recipe export", () => {
  it("exports all active meals in the recipe envelope without internal identifiers", async () => {
    const { app } = setup();

    const favoriteResponse = await request(app)
      .post("/api/meals")
      .send({
        name: "Favorite Pasta",
        notes: "Family staple",
        prepMinutes: 25,
        isFavorite: true,
        tags: ["comfort", "quick"],
        ingredients: [
          { name: "Pasta", quantityText: "12 oz" },
          { name: "Sauce", quantityText: "1 jar" },
        ],
      })
      .expect(201);

    await request(app)
      .post("/api/meals")
      .send({
        name: "Taco Night",
        ingredients: [
          { name: "Tortillas", quantityText: "8" },
          { name: "Beans", quantityText: "1 can", isOptional: true },
        ],
      })
      .expect(201);

    const archivedResponse = await request(app)
      .post("/api/meals")
      .send({
        name: "Archived Soup",
        ingredients: [{ name: "Broth", quantityText: "4 cups" }],
      })
      .expect(201);

    await request(app)
      .delete(`/api/meals/${archivedResponse.body.data.id}`)
      .expect(200);

    const response = await request(app).get("/api/meals/export");

    expect(response.status).toBe(200);
    expect(response.body.data).toBeUndefined();
    expect(response.body).toEqual({
      format: "whats-for-dinner-recipes",
      version: 1,
      exportedAt: expect.any(String),
      meals: expect.any(Array),
    });
    expect(response.body.meals).toHaveLength(2);
    expect(response.body.meals.map((meal) => meal.name)).toEqual([
      favoriteResponse.body.data.name,
      "Taco Night",
    ]);

    expect(response.body.meals[0]).toEqual({
      name: "Favorite Pasta",
      notes: "Family staple",
      prepMinutes: 25,
      isFavorite: true,
      tags: ["comfort", "quick"],
      ingredients: [
        {
          name: "Pasta",
          quantityText: "12 oz",
          isOptional: false,
        },
        {
          name: "Sauce",
          quantityText: "1 jar",
          isOptional: false,
        },
      ],
    });

    for (const meal of response.body.meals) {
      expect(meal.id).toBeUndefined();
      expect(meal.normalizedName).toBeUndefined();
      expect(meal.isArchived).toBeUndefined();
      expect(meal.createdAt).toBeUndefined();
      expect(meal.updatedAt).toBeUndefined();

      for (const ingredient of meal.ingredients) {
        expect(ingredient.ingredientId).toBeUndefined();
        expect(ingredient.sortOrder).toBeUndefined();
      }
    }
  });

  it("exports an empty meals array when no active meals exist", async () => {
    const { app } = setup();

    const response = await request(app).get("/api/meals/export");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      format: "whats-for-dinner-recipes",
      version: 1,
      exportedAt: expect.any(String),
      meals: [],
    });
  });

  it("sets a download-friendly Content-Disposition header for recipe exports", async () => {
    const { app } = setup();

    await request(app)
      .post("/api/meals")
      .send({
        name: "Sheet Pan Sausage",
        ingredients: [{ name: "Sausage", quantityText: "1 lb" }],
      })
      .expect(201);

    const response = await request(app).get("/api/meals/export");

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toBe(
      `attachment; filename="recipes-${response.body.exportedAt.slice(0, 10)}.json"`,
    );
  });
});

describe("recipe import", () => {
  it("imports a valid file with two new meals", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([
          {
            name: "Import Chili",
            notes: "Freezer-friendly",
            prepMinutes: 30,
            isFavorite: true,
            tags: ["comfort"],
            ingredients: [
              { name: "Ground beef", quantityText: "1 lb" },
              { name: "Beans", quantityText: "2 cans" },
            ],
          },
          {
            name: "Veggie Stir Fry",
            notes: null,
            prepMinutes: 20,
            isFavorite: false,
            tags: ["quick"],
            ingredients: [
              { name: "Broccoli", quantityText: "2 cups" },
              { name: "Soy sauce", quantityText: "2 tbsp" },
            ],
          },
        ]),
      );

    expect(response.status).toBe(200);
    expect(response.body.data.imported).toEqual([
      { id: expect.any(Number), name: "Import Chili" },
      { id: expect.any(Number), name: "Veggie Stir Fry" },
    ]);
    expect(response.body.data.skipped).toEqual([]);
    expect(response.body.data.failed).toEqual([]);
    expect(response.body.data.summary).toEqual({
      importedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      totalCount: 2,
    });

    const listResponse = await request(app).get("/api/meals").expect(200);

    expect(listResponse.body.data.map((meal) => meal.name)).toEqual([
      "Import Chili",
      "Veggie Stir Fry",
    ]);
  });

  it("skips meals whose normalized name already exists", async () => {
    const { app } = setup();

    await request(app)
      .post("/api/meals")
      .send({
        name: "Test Chili",
        ingredients: [{ name: "Beans" }],
      })
      .expect(201);

    const response = await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([
          {
            name: "  Test   Chili  ",
            ingredients: [{ name: "Ground beef" }],
          },
        ]),
      );

    expect(response.status).toBe(200);
    expect(response.body.data.imported).toEqual([]);
    expect(response.body.data.skipped).toEqual([
      { name: "Test   Chili", reason: "duplicate" },
    ]);
    expect(response.body.data.failed).toEqual([]);
    expect(response.body.data.summary).toEqual({
      importedCount: 0,
      skippedCount: 1,
      failedCount: 0,
      totalCount: 1,
    });

    const listResponse = await request(app).get("/api/meals").expect(200);

    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].name).toBe("Test Chili");
  });

  it("continues after a per-meal validation failure and reports partial success", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([
          {
            name: "Good Soup",
            ingredients: [{ name: "Broth", quantityText: "4 cups" }],
          },
          {
            name: "Bad Meal",
            ingredients: [],
          },
        ]),
      );

    expect(response.status).toBe(200);
    expect(response.body.data.imported).toEqual([
      { id: expect.any(Number), name: "Good Soup" },
    ]);
    expect(response.body.data.skipped).toEqual([]);
    expect(response.body.data.failed).toEqual([
      {
        name: "Bad Meal",
        reason: expect.stringContaining("Validation:"),
      },
    ]);
    expect(response.body.data.summary).toEqual({
      importedCount: 1,
      skippedCount: 0,
      failedCount: 1,
      totalCount: 2,
    });

    const listResponse = await request(app).get("/api/meals").expect(200);

    expect(listResponse.body.data.map((meal) => meal.name)).toEqual([
      "Good Soup",
    ]);
  });

  it("rejects an import with the wrong format", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([], {
          format: "not-whats-for-dinner-recipes",
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("rejects an import with the wrong version", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([], {
          version: 2,
        }),
      );

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("accepts an empty meals array and returns zero counts", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/meals/import")
      .send(buildImportPayload([]));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      imported: [],
      skipped: [],
      failed: [],
      summary: {
        importedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        totalCount: 0,
      },
    });
  });

  it("creates new catalog ingredients while importing meals", async () => {
    const { app } = setup();

    await request(app)
      .post("/api/meals/import")
      .send(
        buildImportPayload([
          {
            name: "Purple Pancakes",
            ingredients: [
              { name: "Ube extract", quantityText: "1 tsp" },
              { name: "Sweet rice flour", quantityText: "2 cups" },
            ],
          },
        ]),
      )
      .expect(200);

    const ingredientsResponse = await request(app).get("/api/ingredients").expect(200);

    expect(ingredientsResponse.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Sweet rice flour" }),
        expect.objectContaining({ name: "Ube extract" }),
      ]),
    );
  });

  it("round-trips exported meals into a fresh database state", async () => {
    const source = setup();
    const target = setup();

    await request(source.app)
      .post("/api/meals")
      .send({
        name: "Round Trip Chili",
        notes: "Serve with cornbread",
        prepMinutes: 45,
        isFavorite: true,
        tags: ["comfort", "batch-cook"],
        ingredients: [
          { name: "Ground turkey", quantityText: "1 lb" },
          { name: "Beans", quantityText: "2 cans" },
        ],
      })
      .expect(201);

    await request(source.app)
      .post("/api/meals")
      .send({
        name: "Round Trip Salad",
        notes: null,
        prepMinutes: 10,
        isFavorite: false,
        tags: ["fresh"],
        ingredients: [
          { name: "Lettuce", quantityText: "1 head" },
          { name: "Feta", quantityText: "4 oz", isOptional: true },
        ],
      })
      .expect(201);

    const exportPayload = await getExportPayload(source.app);
    const importResponse = await request(target.app)
      .post("/api/meals/import")
      .send(exportPayload)
      .expect(200);

    expect(importResponse.body.data.summary).toEqual({
      importedCount: exportPayload.meals.length,
      skippedCount: 0,
      failedCount: 0,
      totalCount: exportPayload.meals.length,
    });

    const targetMealsResponse = await request(target.app).get("/api/meals").expect(200);

    expect(sortPortableMeals(targetMealsResponse.body.data.map(toPortableMeal))).toEqual(
      sortPortableMeals(exportPayload.meals),
    );
  });
});
