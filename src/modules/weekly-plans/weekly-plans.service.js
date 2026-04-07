const Database = require("better-sqlite3");
const { HttpError } = require("../../lib/errors");

function hasOwnKey(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createWeeklyPlansService(
  weeklyPlansRepo,
  mealsRepo,
  historyService,
  suggestionsService,
) {
  function getPlanById(planId) {
    const plan = weeklyPlansRepo.getPlanById(planId);

    if (!plan) {
      throw new HttpError(404, "Weekly plan not found");
    }

    return plan;
  }

  function getCurrentPlan() {
    const plan = weeklyPlansRepo.getActivePlan();

    if (!plan) {
      throw new HttpError(404, "No active weekly plan found");
    }

    return plan;
  }

  function getCurrentSlot(planId, day) {
    const slot = weeklyPlansRepo.getSlot(planId, day);

    if (!slot) {
      throw new HttpError(404, "Weekly plan slot not found");
    }

    return slot;
  }

  function withCreatePlanConflictHandling(operation) {
    try {
      return operation();
    } catch (error) {
      if (
        error instanceof Database.SqliteError &&
        error.code === "SQLITE_CONSTRAINT_UNIQUE"
      ) {
        throw new HttpError(409, "A conflicting weekly plan already exists");
      }

      throw error;
    }
  }

  function createPlan(weekStart) {
    const activePlan = weeklyPlansRepo.getActivePlan();

    if (activePlan?.weekStart === weekStart) {
      throw new HttpError(409, "A weekly plan for that week already exists");
    }

    return withCreatePlanConflictHandling(() => {
      if (!activePlan) {
        return weeklyPlansRepo.createPlan(weekStart);
      }

      return weeklyPlansRepo.replaceActivePlan(weekStart);
    });
  }

  function createPlanFromSource(sourcePlanId, weekStart) {
    getPlanById(sourcePlanId);

    const activePlan = weeklyPlansRepo.getActivePlan();

    if (activePlan?.weekStart === weekStart) {
      throw new HttpError(409, "A weekly plan for that week already exists");
    }

    const sourceSlots = weeklyPlansRepo.listSlotAssignments(sourcePlanId);
    const newPlanId = withCreatePlanConflictHandling(() => {
      if (!activePlan) {
        return weeklyPlansRepo.createPlanFromSource(weekStart, sourceSlots);
      }

      return weeklyPlansRepo.replaceActivePlanFromSource(weekStart, sourceSlots);
    });

    return getPlanById(newPlanId);
  }

  function updateSlot(day, data) {
    const plan = getCurrentPlan();
    const currentSlot = getCurrentSlot(plan.id, day);

    if (data.mealId !== null && !mealsRepo.exists(data.mealId)) {
      throw new HttpError(404, "Meal not found");
    }

    let nextNotes;

    if (hasOwnKey(data, "notes")) {
      nextNotes = data.notes;
    } else if (data.mealId === null) {
      nextNotes = null;
    } else {
      nextNotes = currentSlot.notes;
    }

    return weeklyPlansRepo.updateSlot(plan.id, day, data.mealId, nextNotes);
  }

  function fillSlotRandom(day, filters) {
    const plan = getCurrentPlan();
    const currentSlot = getCurrentSlot(plan.id, day);
    const plannedMealIds = weeklyPlansRepo.listPlannedMealIds(plan.id);

    let excludeMealIds;

    if (filters.excludePlannedMeals) {
      excludeMealIds = plannedMealIds;

      if (currentSlot.meal?.id != null) {
        const sameMealPlannedElsewhere = plan.slots.some(
          (slot) => slot.day !== day && slot.meal?.id === currentSlot.meal.id,
        );

        if (!sameMealPlannedElsewhere) {
          excludeMealIds = plannedMealIds.filter(
            (mealId) => mealId !== currentSlot.meal.id,
          );
        }
      }
    }

    const randomResult = suggestionsService.pickRandomMeal({
      favoritesOnly: filters.favoritesOnly,
      fullMatchOnly: filters.fullMatchOnly,
      excludeServedWithinDays: filters.excludeServedWithinDays,
      excludeMealIds,
    });

    return weeklyPlansRepo.updateSlot(
      plan.id,
      day,
      randomResult.meal.id,
      currentSlot.notes,
    );
  }

  function autofillEmptySlots(filters) {
    const plan = getCurrentPlan();
    const emptySlots = [...plan.slots]
      .filter((slot) => slot.meal == null)
      .sort((left, right) => left.day - right.day);

    if (emptySlots.length === 0) {
      return {
        plan,
        autofillResult: {
          filledCount: 0,
          skippedCount: 0,
          emptyBeforeCount: 0,
          noMoreCandidates: false,
        },
      };
    }

    const excludeMealIds = new Set(weeklyPlansRepo.listPlannedMealIds(plan.id));
    let filledCount = 0;
    let skippedCount = 0;
    let noMoreCandidates = false;

    for (let index = 0; index < emptySlots.length; index += 1) {
      const slot = emptySlots[index];

      try {
        const randomResult = suggestionsService.pickRandomMeal({
          favoritesOnly: filters.favoritesOnly,
          fullMatchOnly: filters.fullMatchOnly,
          excludeServedWithinDays: filters.excludeServedWithinDays,
          excludeMealIds: [...excludeMealIds],
        });

        weeklyPlansRepo.updateSlot(
          plan.id,
          slot.day,
          randomResult.meal.id,
          slot.notes,
        );
        excludeMealIds.add(randomResult.meal.id);
        filledCount += 1;
      } catch (error) {
        if (error instanceof HttpError && error.statusCode === 404) {
          noMoreCandidates = true;
          skippedCount = emptySlots.length - index;
          break;
        }

        throw error;
      }
    }

    return {
      plan: getCurrentPlan(),
      autofillResult: {
        filledCount,
        skippedCount,
        emptyBeforeCount: emptySlots.length,
        noMoreCandidates,
      },
    };
  }

  function serveSlot(day) {
    const plan = getCurrentPlan();
    const slot = getCurrentSlot(plan.id, day);

    if (!slot.meal) {
      throw new HttpError(400, "Cannot serve an empty plan slot");
    }

    if (slot.served) {
      return plan;
    }

    historyService.addHistory({
      mealId: slot.meal.id,
      servedOn: slot.date,
      source: "plan",
    });

    return getCurrentPlan();
  }

  function listArchivedPlans(limit) {
    return weeklyPlansRepo.listArchivedPlans(limit);
  }

  return {
    createPlan,
    createPlanFromSource,
    getPlanById,
    getCurrentPlan,
    updateSlot,
    fillSlotRandom,
    autofillEmptySlots,
    serveSlot,
    listArchivedPlans,
  };
}

module.exports = {
  createWeeklyPlansService,
};
