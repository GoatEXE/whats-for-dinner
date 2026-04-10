import { normalizeName } from "@whats-for-dinner/domain";

import type { DatabaseHandle, MealWriteInput } from "./types";
import * as mealsRepo from "./repos/meals-repo";
import * as pantryRepo from "./repos/pantry-repo";
import * as historyRepo from "./repos/history-repo";
import * as weeklyPlansRepo from "./repos/weekly-plans-repo";

interface SeedMeal extends MealWriteInput {
  // Explicit shape for the sample catalog. All fields required for clarity.
  name: string;
  notes: string | null;
  prepMinutes: number;
  isFavorite: boolean;
  tags: string[];
}

const SAMPLE_MEALS: SeedMeal[] = [
  {
    name: "Taco Tuesday",
    notes: "Family favorite — set out toppings so everyone builds their own.",
    prepMinutes: 20,
    isFavorite: true,
    tags: ["Family Favorite", "Kid Friendly"],
    ingredients: [
      { name: "Ground Beef", quantityText: "1 lb" },
      { name: "Taco Seasoning", quantityText: "1 packet" },
      { name: "Taco Shells", quantityText: "12" },
      { name: "Shredded Cheddar", quantityText: "1 cup" },
      { name: "Lettuce", quantityText: "1 head" },
      { name: "Tomato", quantityText: "2" },
      { name: "Sour Cream", quantityText: "1 cup", isOptional: true },
    ],
  },
  {
    name: "Chicken Stir Fry",
    notes: null,
    prepMinutes: 25,
    isFavorite: false,
    tags: ["Quick", "One Pan"],
    ingredients: [
      { name: "Chicken Breast", quantityText: "1.5 lbs" },
      { name: "Broccoli", quantityText: "2 cups" },
      { name: "Bell Pepper", quantityText: "2" },
      { name: "Soy Sauce", quantityText: "1/4 cup" },
      { name: "Garlic", quantityText: "3 cloves" },
      { name: "Ginger", quantityText: "1 tbsp" },
      { name: "Rice", quantityText: "2 cups" },
      { name: "Olive Oil", quantityText: "2 tbsp" },
    ],
  },
  {
    name: "Spaghetti Bolognese",
    notes: "Double the sauce and freeze half for next week.",
    prepMinutes: 40,
    isFavorite: true,
    tags: ["Pasta", "Family Favorite"],
    ingredients: [
      { name: "Spaghetti", quantityText: "1 lb" },
      { name: "Ground Beef", quantityText: "1 lb" },
      { name: "Marinara Sauce", quantityText: "24 oz" },
      { name: "Yellow Onion", quantityText: "1" },
      { name: "Garlic", quantityText: "4 cloves" },
      { name: "Parmesan Cheese", quantityText: "1/2 cup" },
      { name: "Olive Oil", quantityText: "2 tbsp" },
      { name: "Italian Herbs", quantityText: "1 tbsp" },
    ],
  },
  {
    name: "Grilled Cheese and Tomato Soup",
    notes: null,
    prepMinutes: 15,
    isFavorite: false,
    tags: ["Quick", "Kid Friendly", "Vegetarian"],
    ingredients: [
      { name: "Sourdough Bread", quantityText: "8 slices" },
      { name: "Cheddar Cheese", quantityText: "8 slices" },
      { name: "Butter", quantityText: "4 tbsp" },
      { name: "Tomato Soup", quantityText: "32 oz" },
    ],
  },
  {
    name: "Chicken Curry",
    notes: "Serve over basmati rice with naan bread.",
    prepMinutes: 35,
    isFavorite: false,
    tags: ["One Pan"],
    ingredients: [
      { name: "Chicken Thighs", quantityText: "2 lbs" },
      { name: "Coconut Milk", quantityText: "14 oz" },
      { name: "Curry Powder", quantityText: "2 tbsp" },
      { name: "Yellow Onion", quantityText: "1" },
      { name: "Garlic", quantityText: "4 cloves" },
      { name: "Ginger", quantityText: "1 tbsp" },
      { name: "Basmati Rice", quantityText: "2 cups" },
      { name: "Cilantro", quantityText: "1/4 cup", isOptional: true },
    ],
  },
  {
    name: "Pepperoni Pizza",
    notes: null,
    prepMinutes: 25,
    isFavorite: true,
    tags: ["Family Favorite", "Kid Friendly"],
    ingredients: [
      { name: "Pizza Dough", quantityText: "1 lb" },
      { name: "Pizza Sauce", quantityText: "1 cup" },
      { name: "Mozzarella Cheese", quantityText: "2 cups" },
      { name: "Pepperoni", quantityText: "6 oz" },
      { name: "Italian Herbs", quantityText: "1 tsp" },
    ],
  },
  {
    name: "Baked Ziti",
    notes: null,
    prepMinutes: 45,
    isFavorite: false,
    tags: ["Pasta", "Family Favorite"],
    ingredients: [
      { name: "Ziti", quantityText: "1 lb" },
      { name: "Marinara Sauce", quantityText: "24 oz" },
      { name: "Ricotta Cheese", quantityText: "15 oz" },
      { name: "Mozzarella Cheese", quantityText: "2 cups" },
      { name: "Parmesan Cheese", quantityText: "1/2 cup" },
      { name: "Italian Sausage", quantityText: "1 lb", isOptional: true },
    ],
  },
  {
    name: "Sheet Pan Chicken and Veggies",
    notes: "Use whatever vegetables are on hand.",
    prepMinutes: 35,
    isFavorite: false,
    tags: ["One Pan", "Quick"],
    ingredients: [
      { name: "Chicken Thighs", quantityText: "6" },
      { name: "Baby Potatoes", quantityText: "1.5 lbs" },
      { name: "Carrots", quantityText: "4" },
      { name: "Olive Oil", quantityText: "3 tbsp" },
      { name: "Garlic", quantityText: "4 cloves" },
      { name: "Rosemary", quantityText: "2 tbsp" },
    ],
  },
  {
    name: "Pancakes and Bacon",
    notes: "Breakfast for dinner is always a win.",
    prepMinutes: 20,
    isFavorite: true,
    tags: ["Breakfast", "Kid Friendly"],
    ingredients: [
      { name: "Pancake Mix", quantityText: "2 cups" },
      { name: "Milk", quantityText: "1.5 cups" },
      { name: "Eggs", quantityText: "2" },
      { name: "Butter", quantityText: "2 tbsp" },
      { name: "Maple Syrup", quantityText: "1/2 cup" },
      { name: "Bacon", quantityText: "1 lb" },
    ],
  },
  {
    name: "Slow Cooker Pulled Pork",
    notes: "Low and slow — start in the morning, ready for dinner.",
    prepMinutes: 15,
    isFavorite: false,
    tags: ["Slow Cooker"],
    ingredients: [
      { name: "Pork Shoulder", quantityText: "4 lbs" },
      { name: "BBQ Sauce", quantityText: "1.5 cups" },
      { name: "Brown Sugar", quantityText: "1/4 cup" },
      { name: "Yellow Onion", quantityText: "1" },
      { name: "Garlic", quantityText: "4 cloves" },
      { name: "Hamburger Buns", quantityText: "8" },
      { name: "Coleslaw", quantityText: "2 cups", isOptional: true },
    ],
  },
  {
    name: "Teriyaki Chicken Bowls",
    notes: null,
    prepMinutes: 30,
    isFavorite: false,
    tags: ["Quick"],
    ingredients: [
      { name: "Chicken Breast", quantityText: "1.5 lbs" },
      { name: "Teriyaki Sauce", quantityText: "1/2 cup" },
      { name: "Rice", quantityText: "2 cups" },
      { name: "Broccoli", quantityText: "2 cups" },
      { name: "Carrots", quantityText: "2" },
      { name: "Sesame Seeds", quantityText: "1 tbsp", isOptional: true },
    ],
  },
  {
    name: "Veggie Fried Rice",
    notes: "Great way to use leftover rice.",
    prepMinutes: 20,
    isFavorite: false,
    tags: ["Quick", "Vegetarian", "One Pan"],
    ingredients: [
      { name: "Rice", quantityText: "3 cups cooked" },
      { name: "Eggs", quantityText: "3" },
      { name: "Peas", quantityText: "1 cup" },
      { name: "Carrots", quantityText: "2" },
      { name: "Soy Sauce", quantityText: "3 tbsp" },
      { name: "Sesame Oil", quantityText: "1 tbsp" },
      { name: "Garlic", quantityText: "3 cloves" },
      { name: "Green Onion", quantityText: "4" },
    ],
  },
];

const SAMPLE_PANTRY = [
  "Salt",
  "Black Pepper",
  "Olive Oil",
  "Rice",
  "Pasta",
  "Eggs",
  "Butter",
  "Flour",
  "Yellow Onion",
  "Garlic",
];

/**
 * Populate the database with realistic sample data for a demo-ready
 * first-launch experience. Safe to call multiple times — existing meals
 * are deduped by normalized name inside the repo layer.
 */
export function seedSampleData(db: DatabaseHandle): {
  meals: number;
  pantry: number;
  planSlots: number;
  history: number;
} {
  // Build a set of normalized names that already exist so re-seeding is a
  // no-op (the meals table has no UNIQUE constraint on normalized_name,
  // so dedup has to happen here).
  const existingMeals = mealsRepo.getAll(db);
  const existingNormalized = new Set(
    existingMeals.map((m) => normalizeName(m.name)),
  );

  // 1. Create meals that are not already present
  const createdMeals: Array<{ id: string; name: string }> = [];
  for (const meal of SAMPLE_MEALS) {
    const normalized = normalizeName(meal.name);
    if (existingNormalized.has(normalized)) {
      // Already seeded previously; reuse existing meal for wiring below.
      const existing = existingMeals.find(
        (m) => normalizeName(m.name) === normalized,
      );
      if (existing) {
        createdMeals.push({ id: existing.id, name: existing.name });
      }
      continue;
    }
    try {
      const created = mealsRepo.create(db, meal);
      createdMeals.push({ id: created.id, name: created.name });
      existingNormalized.add(normalized);
    } catch (err) {
      // Ignore validation errors on re-seed; skip silently.
    }
  }

  // 2. Fill pantry with staples
  let pantryAdded = 0;
  for (const name of SAMPLE_PANTRY) {
    try {
      pantryRepo.addItem(db, { name });
      pantryAdded += 1;
    } catch {
      // already present
    }
  }

  // 3. Build a current weekly plan with 4 slots assigned
  let planSlotsFilled = 0;
  if (createdMeals.length >= 4) {
    const plan = weeklyPlansRepo.getOrCreateCurrent(db);
    const slotAssignments: Array<[number, number]> = [
      [0, 0], // Mon -> meal 0
      [1, 1], // Tue -> meal 1
      [3, 4], // Thu -> meal 4
      [5, 8], // Sat -> meal 8
    ];
    for (const [day, mealIndex] of slotAssignments) {
      const meal = createdMeals[mealIndex];
      if (meal) {
        try {
          weeklyPlansRepo.assignSlot(db, plan.id, day, meal.id);
          planSlotsFilled += 1;
        } catch {
          // ignore
        }
      }
    }
  }

  // 4. Record recent meal history so random picker has exclusion signal
  let historyAdded = 0;
  const today = new Date();
  const historyEntries: Array<{ mealIndex: number; daysAgo: number }> = [
    { mealIndex: 2, daysAgo: 1 }, // Spaghetti 1 day ago
    { mealIndex: 5, daysAgo: 3 }, // Pizza 3 days ago
    { mealIndex: 7, daysAgo: 5 }, // Sheet pan 5 days ago
    { mealIndex: 10, daysAgo: 7 }, // Teriyaki 1 week ago
    { mealIndex: 3, daysAgo: 10 }, // Grilled cheese 10 days ago
  ];
  for (const entry of historyEntries) {
    const meal = createdMeals[entry.mealIndex];
    if (!meal) continue;
    const servedDate = new Date(today);
    servedDate.setDate(today.getDate() - entry.daysAgo);
    const servedOn = servedDate.toISOString().slice(0, 10);
    try {
      historyRepo.record(db, { mealId: meal.id, servedOn });
      historyAdded += 1;
    } catch {
      // ignore
    }
  }

  return {
    meals: createdMeals.length,
    pantry: pantryAdded,
    planSlots: planSlotsFilled,
    history: historyAdded,
  };
}
