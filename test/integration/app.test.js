const request = require("supertest");
const { createTestContext } = require("../helpers/test-app");

const contexts = [];

function setup() {
  const context = createTestContext();
  contexts.push(context);
  return context;
}

afterEach(() => {
  while (contexts.length > 0) {
    const context = contexts.pop();

    if (context) {
      context.cleanup();
    }
  }
});

describe("application smoke tests", () => {
  it("responds to /health", async () => {
    const { app } = setup();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
  });

  it("supports meal CRUD, favorite toggle, and archive", async () => {
    const { app } = setup();

    const createResponse = await request(app)
      .post("/api/meals")
      .send({
        name: "Test Chili",
        notes: "Slow cooker night",
        prepMinutes: 20,
        isFavorite: false,
        tags: ["comfort"],
        ingredients: [
          { name: "Ground beef", quantityText: "1 lb" },
          { name: "Beans", quantityText: "2 cans" },
        ],
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data.name).toBe("Test Chili");
    expect(createResponse.body.data.tags).toContain("comfort");

    const mealId = createResponse.body.data.id;

    const favoriteResponse = await request(app)
      .post(`/api/meals/${mealId}/favorite`)
      .send({ isFavorite: true });

    expect(favoriteResponse.status).toBe(200);
    expect(favoriteResponse.body.data.isFavorite).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/meals/${mealId}`)
      .send({
        notes: "Serve with cornbread",
        ingredients: [
          { name: "Ground beef", quantityText: "1 lb" },
          { name: "Beans", quantityText: "2 cans" },
          { name: "Cornbread mix", quantityText: "1 box", isOptional: true },
        ],
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.notes).toBe("Serve with cornbread");
    expect(updateResponse.body.data.ingredients).toHaveLength(3);

    const archiveResponse = await request(app).delete(`/api/meals/${mealId}`);
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.data.isArchived).toBe(true);

    const listResponse = await request(app).get("/api/meals");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(0);
  });

  it("supports pantry replacement and item deletion", async () => {
    const { app } = setup();

    const replaceResponse = await request(app)
      .put("/api/pantry")
      .send({
        items: [
          { name: "Rice", quantityText: "1 bag" },
          { name: "Soy sauce", quantityText: "1 bottle" },
        ],
      });

    expect(replaceResponse.status).toBe(200);
    expect(replaceResponse.body.data).toHaveLength(2);

    const pantryItems = replaceResponse.body.data;
    const riceItem = pantryItems.find((item) => item.name === "Rice");
    expect(riceItem).toBeTruthy();

    const deleteResponse = await request(app).delete(
      `/api/pantry/items/${riceItem.ingredientId}`,
    );
    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data).toHaveLength(1);
  });

  it("ranks full matches before partial matches and includes missing ingredients", async () => {
    const { app } = setup();

    await request(app)
      .post("/api/meals")
      .send({
        name: "Bean Tacos",
        ingredients: [{ name: "Tortillas" }, { name: "Beans" }],
        tags: ["quick"],
      })
      .expect(201);

    await request(app)
      .post("/api/meals")
      .send({
        name: "Loaded Burrito",
        ingredients: [
          { name: "Tortillas" },
          { name: "Beans" },
          { name: "Rice" },
        ],
        tags: ["quick"],
      })
      .expect(201);

    const response = await request(app)
      .post("/api/suggestions/matches")
      .send({
        ingredientNames: ["Tortillas", "Beans"],
        includePartial: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.matches).toHaveLength(2);
    expect(response.body.data.matches[0].name).toBe("Bean Tacos");
    expect(response.body.data.matches[0].isFullMatch).toBe(true);
    expect(response.body.data.matches[1].name).toBe("Loaded Burrito");
    expect(
      response.body.data.matches[1].missingRequiredIngredients.map(
        (ingredient) => ingredient.name,
      ),
    ).toEqual(["Rice"]);
  });

  it("generates a shopping list from selected meals, pantry items, and ad hoc on-hand ingredients", async () => {
    const { app } = setup();

    const firstMeal = await request(app)
      .post("/api/meals")
      .send({
        name: "Rice Bowls",
        ingredients: [
          { name: "Rice", quantityText: "2 cups cooked" },
          { name: "Chicken", quantityText: "1 lb" },
        ],
      })
      .expect(201);

    const secondMeal = await request(app)
      .post("/api/meals")
      .send({
        name: "Bean Burritos",
        ingredients: [
          { name: "Rice", quantityText: "1 cup cooked" },
          { name: "Beans", quantityText: "1 can" },
          { name: "Cilantro", quantityText: "1 bunch", isOptional: true },
        ],
      })
      .expect(201);

    await request(app)
      .put("/api/pantry")
      .send({
        items: [{ name: "Rice", quantityText: "1 bag" }],
      })
      .expect(200);

    const response = await request(app)
      .post("/api/shopping-list/generate")
      .send({
        mealIds: [firstMeal.body.data.id, secondMeal.body.data.id],
        ingredientNames: ["Beans"],
        includeOptional: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.selectedMeals).toEqual([
      { id: firstMeal.body.data.id, name: "Rice Bowls" },
      { id: secondMeal.body.data.id, name: "Bean Burritos" },
    ]);
    expect(
      response.body.data.availableIngredients.map((item) => item.name),
    ).toEqual(["Beans", "Rice"]);
    expect(response.body.data.requiredOnHand.map((item) => item.name)).toEqual([
      "Beans",
      "Rice",
    ]);
    expect(response.body.data.requiredOnHand[1].quantityHints).toEqual([
      "Rice Bowls — 2 cups cooked",
      "Bean Burritos — 1 cup cooked",
    ]);
    expect(response.body.data.requiredToBuy.map((item) => item.name)).toEqual([
      "Chicken",
    ]);
    expect(response.body.data.optionalToBuy.map((item) => item.name)).toEqual([
      "Cilantro",
    ]);
    expect(response.body.data.summary).toEqual({
      selectedMealCount: 2,
      requiredToBuyCount: 1,
      requiredOnHandCount: 2,
      optionalToBuyCount: 1,
    });
    expect(response.body.data.copyText).toContain(
      "Shopping list for: Rice Bowls, Bean Burritos",
    );
    expect(response.body.data.copyText).toContain(
      "- Chicken — Rice Bowls — 1 lb",
    );
  });

  it("returns 404 when a selected meal does not exist for shopping list generation", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/shopping-list/generate")
      .send({ mealIds: [9999] });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain(
      "selected meals were not found",
    );
  });

  it("rejects invalid boolean-like strings on shopping list inputs", async () => {
    const { app } = setup();

    const meal = await request(app)
      .post("/api/meals")
      .send({
        name: "Toast",
        ingredients: [{ name: "Bread" }],
      })
      .expect(201);

    const response = await request(app)
      .post("/api/shopping-list/generate")
      .send({
        mealIds: [meal.body.data.id],
        useSavedPantry: "banana",
        includeOptional: "yes",
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
  });

  it("does not persist unknown ad hoc ingredientNames into the catalog", async () => {
    const { app } = setup();

    const meal = await request(app)
      .post("/api/meals")
      .send({
        name: "Toast",
        ingredients: [{ name: "Bread" }],
      })
      .expect(201);

    const beforeIngredients = await request(app)
      .get("/api/ingredients")
      .expect(200);
    const beforeUnknown = beforeIngredients.body.data.find(
      (ingredient) => ingredient.name === "Dragon Fruit Powder",
    );

    expect(beforeUnknown).toBeUndefined();

    const response = await request(app)
      .post("/api/shopping-list/generate")
      .send({
        mealIds: [meal.body.data.id],
        ingredientNames: ["Dragon Fruit Powder", " bread "],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.availableIngredients).toEqual([
      expect.objectContaining({ name: "Bread" }),
    ]);

    const afterIngredients = await request(app)
      .get("/api/ingredients")
      .expect(200);
    const afterUnknown = afterIngredients.body.data.find(
      (ingredient) => ingredient.name === "Dragon Fruit Powder",
    );

    expect(afterUnknown).toBeUndefined();
  });

  it("can generate a full required shopping list without saved pantry", async () => {
    const { app } = setup();

    const meal = await request(app)
      .post("/api/meals")
      .send({
        name: "Tomato Pasta",
        ingredients: [
          { name: "Pasta", quantityText: "12 oz" },
          { name: "Sauce", quantityText: "1 jar" },
          { name: "Parmesan", quantityText: "to taste", isOptional: true },
        ],
      })
      .expect(201);

    await request(app)
      .put("/api/pantry")
      .send({
        items: [{ name: "Pasta" }],
      })
      .expect(200);

    const response = await request(app)
      .post("/api/shopping-list/generate")
      .send({
        mealIds: [meal.body.data.id, meal.body.data.id],
        useSavedPantry: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.data.selectedMeals).toEqual([
      { id: meal.body.data.id, name: "Tomato Pasta" },
    ]);
    expect(response.body.data.availableIngredients).toEqual([]);
    expect(response.body.data.requiredOnHand).toEqual([]);
    expect(response.body.data.requiredToBuy.map((item) => item.name)).toEqual([
      "Pasta",
      "Sauce",
    ]);
    expect(response.body.data.optionalToBuy).toEqual([]);
  });

  it("filters random selection by pantry readiness and recent history", async () => {
    const { app } = setup();

    const soupResponse = await request(app)
      .post("/api/meals")
      .send({
        name: "Tomato Soup",
        isFavorite: true,
        ingredients: [
          { name: "Tomato soup" },
          { name: "Grilled cheese bread", isOptional: true },
        ],
      })
      .expect(201);

    const pastaResponse = await request(app)
      .post("/api/meals")
      .send({
        name: "Pasta Night",
        isFavorite: true,
        ingredients: [{ name: "Pasta" }, { name: "Sauce" }],
      })
      .expect(201);

    await request(app)
      .put("/api/pantry")
      .send({
        items: [{ name: "Pasta" }, { name: "Sauce" }],
      })
      .expect(200);

    await request(app)
      .post("/api/history")
      .send({
        mealId: pastaResponse.body.data.id,
        servedOn: new Date().toISOString().slice(0, 10),
        source: "random",
      })
      .expect(201);

    const response = await request(app).get(
      "/api/suggestions/random?favoritesOnly=true&fullMatchOnly=true&excludeServedWithinDays=7",
    );

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain("No meals matched");

    const pantryUpdate = await request(app)
      .put("/api/pantry")
      .send({
        items: [{ name: "Tomato soup" }],
      })
      .expect(200);

    expect(pantryUpdate.body.data).toHaveLength(1);

    const secondResponse = await request(app).get(
      "/api/suggestions/random?favoritesOnly=true&fullMatchOnly=true&excludeServedWithinDays=7",
    );

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data.meal.id).toBe(soupResponse.body.data.id);
    expect(secondResponse.body.data.candidateCount).toBe(1);
  });
});
