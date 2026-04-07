const request = require("supertest");
const { createTestContext } = require("../helpers/test-app");

const contexts = [];

function setup() {
  const context = createTestContext();
  contexts.push(context);
  return context;
}

async function createMeal(app, overrides = {}) {
  const response = await request(app)
    .post("/api/meals")
    .send({
      name: "Test Meal",
      ingredients: [{ name: "Ingredient" }],
      ...overrides,
    })
    .expect(201);

  return response.body.data;
}

async function createMeals(app, count, buildOverrides) {
  const meals = [];

  for (let index = 0; index < count; index += 1) {
    meals.push(await createMeal(app, buildOverrides(index)));
  }

  return meals;
}

async function fillCurrentPlanSlots(app, meals) {
  for (let day = 0; day < meals.length; day += 1) {
    await request(app)
      .patch(`/api/weekly-plans/current/slots/${day}`)
      .send({ mealId: meals[day].id })
      .expect(200);
  }
}

afterEach(() => {
  while (contexts.length > 0) {
    const context = contexts.pop();

    if (context) {
      context.cleanup();
    }
  }
});

describe("weekly planning routes", () => {
  it("returns 404 for the current plan when none exists and validates Monday weekStart", async () => {
    const { app } = setup();

    const missingResponse = await request(app).get("/api/weekly-plans/current");

    expect(missingResponse.status).toBe(404);
    expect(missingResponse.body.error.message).toBe("No active weekly plan found");

    const invalidResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-07" });

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.body.error.message).toBe("Validation failed");

    const invalidReuseResponse = await request(app)
      .post("/api/weekly-plans/from/1")
      .send({ weekStart: "2026-04-07" });

    expect(invalidReuseResponse.status).toBe(400);
    expect(invalidReuseResponse.body.error.message).toBe("Validation failed");
  });

  it("reuses a source plan into a new active week and archives the displaced active plan", async () => {
    const { app } = setup();
    const recurringMeal = await createMeal(app, {
      name: "Reuse Route Pasta",
      isFavorite: true,
      ingredients: [{ name: "Pasta" }, { name: "Sauce" }],
    });
    const archivedMeal = await createMeal(app, {
      name: "Reuse Route Tacos",
      ingredients: [{ name: "Tortillas" }],
    });

    const sourcePlanResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    await request(app)
      .patch("/api/weekly-plans/current/slots/0")
      .send({ mealId: recurringMeal.id, notes: "Pasta Monday" })
      .expect(200);
    await request(app)
      .patch("/api/weekly-plans/current/slots/2")
      .send({ mealId: archivedMeal.id, notes: "Use frozen beef" })
      .expect(200);
    await request(app)
      .post("/api/weekly-plans/current/slots/0/serve")
      .expect(200);
    await request(app).delete(`/api/meals/${archivedMeal.id}`).expect(200);

    const displacedPlanResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-13" })
      .expect(201);

    const reuseResponse = await request(app)
      .post(`/api/weekly-plans/from/${sourcePlanResponse.body.data.id}`)
      .send({ weekStart: "2026-04-20" });

    expect(reuseResponse.status).toBe(201);
    expect(reuseResponse.body.data).toEqual({
      id: expect.any(Number),
      weekStart: "2026-04-20",
      isArchived: false,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      slots: [
        {
          day: 0,
          date: "2026-04-20",
          label: "Monday",
          meal: {
            id: recurringMeal.id,
            name: "Reuse Route Pasta",
            isFavorite: true,
            isArchived: false,
          },
          notes: "Pasta Monday",
          served: false,
        },
        {
          day: 1,
          date: "2026-04-21",
          label: "Tuesday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 2,
          date: "2026-04-22",
          label: "Wednesday",
          meal: {
            id: archivedMeal.id,
            name: "Reuse Route Tacos",
            isFavorite: false,
            isArchived: true,
          },
          notes: "Use frozen beef",
          served: false,
        },
        {
          day: 3,
          date: "2026-04-23",
          label: "Thursday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 4,
          date: "2026-04-24",
          label: "Friday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 5,
          date: "2026-04-25",
          label: "Saturday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 6,
          date: "2026-04-26",
          label: "Sunday",
          meal: null,
          notes: null,
          served: false,
        },
      ],
    });

    const currentResponse = await request(app).get("/api/weekly-plans/current");

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.data.id).toBe(reuseResponse.body.data.id);
    expect(currentResponse.body.data.weekStart).toBe("2026-04-20");

    const historyResponse = await request(app).get(
      "/api/weekly-plans/history?limit=10",
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data.map((plan) => plan.id)).toEqual([
      displacedPlanResponse.body.data.id,
      sourcePlanResponse.body.data.id,
    ]);
  });

  it("returns 404 when the reuse source plan does not exist", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/weekly-plans/from/9999")
      .send({ weekStart: "2026-04-20" });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Weekly plan not found");
  });

  it("returns 409 when reusing into an already-active week", async () => {
    const { app } = setup();

    const sourcePlanResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-13" })
      .expect(201);

    const response = await request(app)
      .post(`/api/weekly-plans/from/${sourcePlanResponse.body.data.id}`)
      .send({ weekStart: "2026-04-13" });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toBe(
      "A weekly plan for that week already exists",
    );
  });

  it("creates plans, rejects duplicate active weeks, archives the previous active plan, and can fetch archived plan detail", async () => {
    const { app } = setup();
    const meal = await createMeal(app, {
      name: "History Detail Meal",
      isFavorite: true,
      ingredients: [{ name: "History Ingredient" }],
    });

    const firstResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" });

    expect(firstResponse.status).toBe(201);
    expect(firstResponse.body.data.weekStart).toBe("2026-04-06");
    expect(firstResponse.body.data.slots).toHaveLength(7);

    await request(app)
      .patch("/api/weekly-plans/current/slots/1")
      .send({ mealId: meal.id, notes: "Leftover night" })
      .expect(200);
    await request(app)
      .post("/api/weekly-plans/current/slots/1/serve")
      .expect(200);

    const duplicateResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" });

    expect(duplicateResponse.status).toBe(409);
    expect(duplicateResponse.body.error.message).toBe(
      "A weekly plan for that week already exists",
    );

    const replacementResponse = await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-13" });

    expect(replacementResponse.status).toBe(201);
    expect(replacementResponse.body.data.weekStart).toBe("2026-04-13");

    const currentResponse = await request(app).get("/api/weekly-plans/current");
    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.data.weekStart).toBe("2026-04-13");

    const historyResponse = await request(app).get(
      "/api/weekly-plans/history?limit=10",
    );

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toEqual([
      {
        id: firstResponse.body.data.id,
        weekStart: "2026-04-06",
        createdAt: expect.any(String),
      },
    ]);

    const historyDetailResponse = await request(app).get(
      `/api/weekly-plans/history/${firstResponse.body.data.id}`,
    );

    expect(historyDetailResponse.status).toBe(200);
    expect(historyDetailResponse.body.data).toEqual({
      id: firstResponse.body.data.id,
      weekStart: "2026-04-06",
      isArchived: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      slots: [
        {
          day: 0,
          date: "2026-04-06",
          label: "Monday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 1,
          date: "2026-04-07",
          label: "Tuesday",
          meal: {
            id: meal.id,
            name: "History Detail Meal",
            isFavorite: true,
            isArchived: false,
          },
          notes: "Leftover night",
          served: true,
        },
        {
          day: 2,
          date: "2026-04-08",
          label: "Wednesday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 3,
          date: "2026-04-09",
          label: "Thursday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 4,
          date: "2026-04-10",
          label: "Friday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 5,
          date: "2026-04-11",
          label: "Saturday",
          meal: null,
          notes: null,
          served: false,
        },
        {
          day: 6,
          date: "2026-04-12",
          label: "Sunday",
          meal: null,
          notes: null,
          served: false,
        },
      ],
    });
  });

  it("updates slots, rejects unknown meals, clears notes on documented clear requests, and keeps archived meal summaries visible", async () => {
    const { app } = setup();
    const meal = await createMeal(app, {
      name: "Pizza Night",
      ingredients: [{ name: "Pizza crust" }, { name: "Cheese" }],
    });

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    const invalidMealResponse = await request(app)
      .patch("/api/weekly-plans/current/slots/4")
      .send({ mealId: 9999 });

    expect(invalidMealResponse.status).toBe(404);
    expect(invalidMealResponse.body.error.message).toBe("Meal not found");

    const updateResponse = await request(app)
      .patch("/api/weekly-plans/current/slots/4")
      .send({ mealId: meal.id, notes: "Movie night" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.slots[4]).toEqual({
      day: 4,
      date: "2026-04-10",
      label: "Friday",
      meal: {
        id: meal.id,
        name: "Pizza Night",
        isFavorite: false,
        isArchived: false,
      },
      notes: "Movie night",
      served: false,
    });

    await request(app).delete(`/api/meals/${meal.id}`).expect(200);

    const currentResponse = await request(app).get("/api/weekly-plans/current");

    expect(currentResponse.status).toBe(200);
    expect(currentResponse.body.data.slots[4].meal).toEqual({
      id: meal.id,
      name: "Pizza Night",
      isFavorite: false,
      isArchived: true,
    });

    const clearResponse = await request(app)
      .patch("/api/weekly-plans/current/slots/4")
      .send({ mealId: null });

    expect(clearResponse.status).toBe(200);
    expect(clearResponse.body.data.slots[4]).toEqual({
      day: 4,
      date: "2026-04-10",
      label: "Friday",
      meal: null,
      notes: null,
      served: false,
    });

    const explicitNotesOnClearResponse = await request(app)
      .patch("/api/weekly-plans/current/slots/4")
      .send({ mealId: null, notes: "Keep this reminder" });

    expect(explicitNotesOnClearResponse.status).toBe(200);
    expect(explicitNotesOnClearResponse.body.data.slots[4]).toEqual({
      day: 4,
      date: "2026-04-10",
      label: "Friday",
      meal: null,
      notes: "Keep this reminder",
      served: false,
    });
  });

  it("fills random slots while excluding meals already planned elsewhere in the week", async () => {
    const { app } = setup();
    const firstMeal = await createMeal(app, {
      name: "Tacos",
      ingredients: [{ name: "Tortillas" }],
    });
    const secondMeal = await createMeal(app, {
      name: "Pasta",
      ingredients: [{ name: "Pasta" }],
    });

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    await request(app)
      .patch("/api/weekly-plans/current/slots/0")
      .send({ mealId: firstMeal.id })
      .expect(200);

    const randomResponse = await request(app).post(
      "/api/weekly-plans/current/slots/1/random",
    );

    expect(randomResponse.status).toBe(200);
    expect(randomResponse.body.data.slots[0].meal.id).toBe(firstMeal.id);
    expect(randomResponse.body.data.slots[1].meal.id).toBe(secondMeal.id);
    expect(randomResponse.body.data.slots[1].meal.id).not.toBe(firstMeal.id);
  });

  it("autofills an empty weekly plan with unique meals and returns summary metadata", async () => {
    const { app } = setup();
    await createMeals(app, 7, (index) => ({
      name: `Autofill Meal ${index}`,
      ingredients: [{ name: `Ingredient ${index}` }],
    }));

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    const autofillResponse = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({})
      .expect(200);

    const filledMealIds = autofillResponse.body.data.slots.map((slot) => slot.meal?.id);

    expect(autofillResponse.body.data.autofillResult).toEqual({
      filledCount: 7,
      skippedCount: 0,
      emptyBeforeCount: 7,
      noMoreCandidates: false,
    });
    expect(filledMealIds.every((mealId) => mealId != null)).toBe(true);
    expect(new Set(filledMealIds).size).toBe(7);
  });

  it("autofills only empty slots, preserves notes, and avoids duplicates with existing planned meals", async () => {
    const { app } = setup();
    const meals = await createMeals(app, 7, (index) => ({
      name: `Mixed Plan Meal ${index}`,
      ingredients: [{ name: `Mixed Ingredient ${index}` }],
    }));

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    await request(app)
      .patch("/api/weekly-plans/current/slots/0")
      .send({ mealId: meals[0].id, notes: "Already planned" })
      .expect(200);
    await request(app)
      .patch("/api/weekly-plans/current/slots/2")
      .send({ mealId: null, notes: "Keep this reminder" })
      .expect(200);

    const autofillResponse = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({})
      .expect(200);

    const { slots, autofillResult } = autofillResponse.body.data;
    const filledMealIds = slots.map((slot) => slot.meal?.id).filter(Boolean);

    expect(autofillResult).toEqual({
      filledCount: 6,
      skippedCount: 0,
      emptyBeforeCount: 6,
      noMoreCandidates: false,
    });
    expect(slots[0]).toEqual({
      day: 0,
      date: "2026-04-06",
      label: "Monday",
      meal: {
        id: meals[0].id,
        name: "Mixed Plan Meal 0",
        isFavorite: false,
        isArchived: false,
      },
      notes: "Already planned",
      served: false,
    });
    expect(slots[2].notes).toBe("Keep this reminder");
    expect(new Set(filledMealIds).size).toBe(7);
    expect(filledMealIds.filter((mealId) => mealId === meals[0].id)).toHaveLength(1);
  });

  it("returns a partial autofill result when candidate meals are exhausted", async () => {
    const { app } = setup();
    await createMeals(app, 4, (index) => ({
      name: `Limited Meal ${index}`,
      ingredients: [{ name: `Limited Ingredient ${index}` }],
    }));

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    const autofillResponse = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({})
      .expect(200);

    const filledCount = autofillResponse.body.data.slots.filter(
      (slot) => slot.meal !== null,
    ).length;

    expect(autofillResponse.body.data.autofillResult).toEqual({
      filledCount: 4,
      skippedCount: 3,
      emptyBeforeCount: 7,
      noMoreCandidates: true,
    });
    expect(filledCount).toBe(4);
  });

  it("returns the existing plan unchanged when there are no empty days to autofill", async () => {
    const { app } = setup();
    const meals = await createMeals(app, 7, (index) => ({
      name: `Full Plan Meal ${index}`,
      ingredients: [{ name: `Full Plan Ingredient ${index}` }],
    }));

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);
    await fillCurrentPlanSlots(app, meals);

    const beforeResponse = await request(app)
      .get("/api/weekly-plans/current")
      .expect(200);

    const autofillResponse = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({})
      .expect(200);

    expect(autofillResponse.body.data.autofillResult).toEqual({
      filledCount: 0,
      skippedCount: 0,
      emptyBeforeCount: 0,
      noMoreCandidates: false,
    });
    expect(autofillResponse.body.data.updatedAt).toBe(beforeResponse.body.data.updatedAt);
    expect(autofillResponse.body.data.slots).toEqual(beforeResponse.body.data.slots);
  });

  it("returns 404 when autofill is requested without an active plan", async () => {
    const { app } = setup();

    const response = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({});

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("No active weekly plan found");
  });

  it("respects the favoritesOnly autofill filter", async () => {
    const { app } = setup();
    await createMeals(app, 2, (index) => ({
      name: `Favorite Meal ${index}`,
      isFavorite: true,
      ingredients: [{ name: `Favorite Ingredient ${index}` }],
    }));
    await createMeals(app, 2, (index) => ({
      name: `Regular Meal ${index}`,
      ingredients: [{ name: `Regular Ingredient ${index}` }],
    }));

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    const autofillResponse = await request(app)
      .post("/api/weekly-plans/current/autofill")
      .send({ favoritesOnly: true })
      .expect(200);

    const filledMeals = autofillResponse.body.data.slots
      .filter((slot) => slot.meal !== null)
      .map((slot) => slot.meal);

    expect(autofillResponse.body.data.autofillResult).toEqual({
      filledCount: 2,
      skippedCount: 5,
      emptyBeforeCount: 7,
      noMoreCandidates: true,
    });
    expect(filledMeals).toHaveLength(2);
    expect(filledMeals.every((meal) => meal.isFavorite)).toBe(true);
  });

  it("serves a planned meal idempotently and records source plan in history once", async () => {
    const { app } = setup();
    const meal = await createMeal(app, {
      name: "Soup Night",
      ingredients: [{ name: "Soup" }],
    });

    await request(app)
      .post("/api/weekly-plans")
      .send({ weekStart: "2026-04-06" })
      .expect(201);

    const emptyServeResponse = await request(app).post(
      "/api/weekly-plans/current/slots/2/serve",
    );

    expect(emptyServeResponse.status).toBe(400);
    expect(emptyServeResponse.body.error.message).toBe(
      "Cannot serve an empty plan slot",
    );

    await request(app)
      .patch("/api/weekly-plans/current/slots/2")
      .send({ mealId: meal.id })
      .expect(200);

    const firstServeResponse = await request(app).post(
      "/api/weekly-plans/current/slots/2/serve",
    );

    expect(firstServeResponse.status).toBe(200);
    expect(firstServeResponse.body.data.slots[2].served).toBe(true);

    const secondServeResponse = await request(app).post(
      "/api/weekly-plans/current/slots/2/serve",
    );

    expect(secondServeResponse.status).toBe(200);
    expect(secondServeResponse.body.data.slots[2].served).toBe(true);

    const historyResponse = await request(app).get("/api/history");

    expect(historyResponse.status).toBe(200);
    expect(historyResponse.body.data).toHaveLength(1);
    expect(historyResponse.body.data[0]).toEqual(
      expect.objectContaining({
        mealId: meal.id,
        mealName: "Soup Night",
        servedOn: "2026-04-08",
        source: "plan",
      }),
    );
  });

  it("returns 404 when archived plan detail is not found", async () => {
    const { app } = setup();

    const response = await request(app).get("/api/weekly-plans/history/9999");

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe("Weekly plan not found");
  });

  it("allows source=plan through history validation", async () => {
    const { app } = setup();
    const meal = await createMeal(app, {
      name: "History Meal",
      ingredients: [{ name: "Thing" }],
    });

    const response = await request(app)
      .post("/api/history")
      .send({
        mealId: meal.id,
        servedOn: "2026-04-09",
        source: "plan",
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual(
      expect.objectContaining({
        mealId: meal.id,
        servedOn: "2026-04-09",
        source: "plan",
      }),
    );
  });
});
