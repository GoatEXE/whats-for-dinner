const { createDatabase } = require("./connection");
const { loadConfig } = require("../config/env");
const { runMigrations } = require("./migrate");
const { normalizeName, normalizeTag } = require("../lib/normalize");

const sampleMeals = [
  {
    name: "Spaghetti Tacos",
    notes: "Family favorite mash-up. Serve with crunchy shells and parmesan.",
    prepMinutes: 30,
    isFavorite: true,
    tags: ["quick", "kid-friendly"],
    ingredients: [
      { name: "Spaghetti noodles", quantityText: "8 oz" },
      { name: "Ground beef", quantityText: "1 lb" },
      { name: "Taco shells", quantityText: "8 shells" },
      { name: "Marinara sauce", quantityText: "1 jar" },
      { name: "Parmesan", quantityText: "to taste", isOptional: true },
    ],
  },
  {
    name: "Chicken Stir-Fry",
    notes: "Great for using extra vegetables. Serve with rice.",
    prepMinutes: 25,
    isFavorite: false,
    tags: ["quick", "one-pan"],
    ingredients: [
      { name: "Chicken breast", quantityText: "1 lb" },
      { name: "Soy sauce", quantityText: "3 tbsp" },
      { name: "Frozen stir-fry vegetables", quantityText: "1 bag" },
      { name: "Rice", quantityText: "2 cups cooked" },
      { name: "Sesame oil", quantityText: "1 tsp", isOptional: true },
    ],
  },
  {
    name: "Black Bean Quesadillas",
    notes: "Easy pantry meal with salsa on the side.",
    prepMinutes: 15,
    isFavorite: true,
    tags: ["vegetarian", "quick"],
    ingredients: [
      { name: "Flour tortillas", quantityText: "4 large" },
      { name: "Black beans", quantityText: "1 can" },
      { name: "Shredded cheese", quantityText: "2 cups" },
      { name: "Salsa", quantityText: "for serving", isOptional: true },
    ],
  },
];

const samplePantry = [
  { name: "Ground beef", quantityText: "1 lb" },
  { name: "Marinara sauce", quantityText: "1 jar" },
  { name: "Spaghetti noodles", quantityText: "8 oz" },
  { name: "Flour tortillas", quantityText: "1 pack" },
  { name: "Black beans", quantityText: "2 cans" },
  { name: "Shredded cheese", quantityText: "1 bag" },
  { name: "Rice", quantityText: "1 bag" },
  { name: "Soy sauce", quantityText: "1 bottle" },
];

function ensureIngredient(db, ingredient) {
  const normalizedName = normalizeName(ingredient.name);
  const existing = db
    .prepare("SELECT id FROM ingredients WHERE normalized_name = ?")
    .get(normalizedName);

  if (existing) {
    return existing.id;
  }

  const result = db
    .prepare("INSERT INTO ingredients (name, normalized_name) VALUES (?, ?)")
    .run(ingredient.name.trim(), normalizedName);

  return Number(result.lastInsertRowid);
}

function ensureTag(db, tagName) {
  const normalizedName = normalizeTag(tagName);
  const existing = db
    .prepare("SELECT id FROM tags WHERE normalized_name = ?")
    .get(normalizedName);

  if (existing) {
    return existing.id;
  }

  const result = db
    .prepare("INSERT INTO tags (name, normalized_name) VALUES (?, ?)")
    .run(tagName.trim(), normalizedName);
  return Number(result.lastInsertRowid);
}

function seedDatabase(db) {
  const mealCount = Number(
    db.prepare("SELECT COUNT(*) AS count FROM meals").get().count,
  );

  if (mealCount > 0) {
    return { seeded: false, reason: "Meals already exist" };
  }

  const insertMeal = db.prepare(
    "INSERT INTO meals (name, normalized_name, notes, prep_minutes, is_favorite) VALUES (?, ?, ?, ?, ?)",
  );
  const insertMealIngredient = db.prepare(
    "INSERT INTO meal_ingredients (meal_id, ingredient_id, quantity_text, is_optional, sort_order) VALUES (?, ?, ?, ?, ?)",
  );
  const insertMealTag = db.prepare(
    "INSERT INTO meal_tags (meal_id, tag_id) VALUES (?, ?)",
  );
  const insertPantryItem = db.prepare(
    `INSERT INTO pantry_items (ingredient_id, quantity_text, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(ingredient_id) DO UPDATE SET quantity_text = excluded.quantity_text, updated_at = CURRENT_TIMESTAMP`,
  );

  const transaction = db.transaction(() => {
    for (const meal of sampleMeals) {
      const mealResult = insertMeal.run(
        meal.name.trim(),
        normalizeName(meal.name),
        meal.notes ?? null,
        meal.prepMinutes ?? null,
        meal.isFavorite ? 1 : 0,
      );
      const mealId = Number(mealResult.lastInsertRowid);

      meal.ingredients.forEach((ingredient, index) => {
        const ingredientId = ensureIngredient(db, ingredient);
        insertMealIngredient.run(
          mealId,
          ingredientId,
          ingredient.quantityText ?? null,
          ingredient.isOptional ? 1 : 0,
          index,
        );
      });

      for (const tag of meal.tags) {
        const tagId = ensureTag(db, tag);
        insertMealTag.run(mealId, tagId);
      }
    }

    for (const pantryItem of samplePantry) {
      const ingredientId = ensureIngredient(db, pantryItem);
      insertPantryItem.run(ingredientId, pantryItem.quantityText ?? null);
    }
  });

  transaction();
  return { seeded: true };
}

if (require.main === module) {
  const config = loadConfig();
  const db = createDatabase(config);
  runMigrations(db);
  const result = seedDatabase(db);
  db.close();
  console.log(result.seeded ? "Seeded sample data" : result.reason);
}

module.exports = {
  seedDatabase,
  sampleMeals,
};
