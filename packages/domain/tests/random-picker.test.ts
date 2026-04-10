import { HttpError } from "../src/errors";
import {
  listRandomMealCandidates,
  pickRandomMeal,
  type RandomPickerFilters,
} from "../src/random-picker";
import type { SuggestionMeal } from "../src/suggestions";

function createMeal(
  id: number,
  name = `Meal ${id}`,
  overrides: Partial<SuggestionMeal> = {},
): SuggestionMeal {
  return {
    id,
    name,
    notes: null,
    prepMinutes: null,
    isFavorite: false,
    tags: [],
    ingredients: [],
    ...overrides,
  };
}

function createFilters(overrides: Partial<RandomPickerFilters> = {}): RandomPickerFilters {
  return {
    favoritesOnly: false,
    fullMatchOnly: false,
    excludeServedWithinDays: 0,
    ...overrides,
  };
}

describe("random-picker domain helpers", () => {
  describe("listRandomMealCandidates", () => {
    it("excludes recent meals, explicitly blocked meals, and non-favorites when requested", () => {
      const meals = [
        createMeal(1, "Recent Favorite", { isFavorite: true }),
        createMeal(2, "Blocked Favorite", { isFavorite: true }),
        createMeal(3, "Eligible Favorite", { isFavorite: true }),
        createMeal(4, "Eligible Non-Favorite", { isFavorite: false }),
      ];

      const result = listRandomMealCandidates({
        meals,
        recentMealIds: [1],
        filters: createFilters({
          favoritesOnly: true,
          excludeMealIds: [2],
        }),
      });

      expect(result.map((meal) => meal.id)).toEqual([3]);
    });

    it("filters down to full pantry matches while preserving the filtered meal order", () => {
      const meals = [
        createMeal(1, "Favorite Full Match", {
          isFavorite: true,
          ingredients: [{ ingredientId: 10, name: "Rice", isOptional: false }],
        }),
        createMeal(2, "Partial Match", {
          isFavorite: true,
          ingredients: [
            { ingredientId: 10, name: "Rice", isOptional: false },
            { ingredientId: 11, name: "Beans", isOptional: false },
          ],
        }),
        createMeal(3, "Non-Favorite Full Match", {
          isFavorite: false,
          ingredients: [{ ingredientId: 10, name: "Rice", isOptional: false }],
        }),
      ];

      expect(
        listRandomMealCandidates({
          meals,
          availableIngredients: [{ ingredientId: 10, name: "Rice" }],
          filters: createFilters({ fullMatchOnly: true }),
        }).map((meal) => meal.id),
      ).toEqual([1, 3]);

      expect(
        listRandomMealCandidates({
          meals,
          availableIngredients: [{ ingredientId: 10, name: "Rice" }],
          filters: createFilters({
            favoritesOnly: true,
            fullMatchOnly: true,
          }),
        }).map((meal) => meal.id),
      ).toEqual([1]);
    });
  });

  describe("pickRandomMeal", () => {
    it("uses the provided random function to select among the remaining candidates", () => {
      const filters = createFilters({ excludeMealIds: [1] });

      const result = pickRandomMeal({
        meals: [
          createMeal(1, "Blocked Meal"),
          createMeal(2, "First Candidate"),
          createMeal(3, "Second Candidate"),
        ],
        recentMealIds: [],
        availableIngredients: [],
        filters,
        random: () => 0.99,
      });

      expect(result.meal.id).toBe(3);
      expect(result.candidateCount).toBe(2);
      expect(result.filtersApplied).toBe(filters);
    });

    it("throws a 404 when every meal is excluded by the applied filters", () => {
      expect(() =>
        pickRandomMeal({
          meals: [createMeal(1, "Only Meal", { isFavorite: true })],
          recentMealIds: [1],
          filters: createFilters({ favoritesOnly: true }),
        }),
      ).toThrow(HttpError);

      try {
        pickRandomMeal({
          meals: [createMeal(1, "Only Meal", { isFavorite: true })],
          recentMealIds: [1],
          filters: createFilters({ favoritesOnly: true }),
        });
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect((error as HttpError).statusCode).toBe(404);
        expect((error as HttpError).message).toBe(
          "No meals matched the random selection filters",
        );
      }
    });
  });
});
