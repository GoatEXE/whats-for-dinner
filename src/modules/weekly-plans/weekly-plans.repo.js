const DAY_LABELS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SQLITE_PRECISE_TIMESTAMP_SQL = "STRFTIME('%Y-%m-%d %H:%M:%f', 'now')";
const SQLITE_ONE_MILLISECOND_IN_DAYS = "(1.0 / 86400000.0)";

function buildMonotonicUpdatedAtSql(previousValueSql) {
  return `CASE
    WHEN ${SQLITE_PRECISE_TIMESTAMP_SQL} > ${previousValueSql}
      THEN ${SQLITE_PRECISE_TIMESTAMP_SQL}
    ELSE STRFTIME(
      '%Y-%m-%d %H:%M:%f',
      julianday(${previousValueSql}) + ${SQLITE_ONE_MILLISECOND_IN_DAYS}
    )
  END`;
}

function addDaysToIsoDate(isoDate, dayOffset) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return date.toISOString().slice(0, 10);
}

function mapSlotRowToSlot(slotRow, weekStart, servedLookup) {
  const date = addDaysToIsoDate(weekStart, slotRow.day);
  const servedKey = `${slotRow.mealId ?? "none"}:${date}`;

  return {
    day: slotRow.day,
    date,
    label: DAY_LABELS[slotRow.day],
    meal:
      slotRow.mealSummaryId == null
        ? null
        : {
            id: slotRow.mealSummaryId,
            name: slotRow.mealName,
            isFavorite: Boolean(slotRow.isFavorite),
            isArchived: Boolean(slotRow.mealIsArchived),
          },
    notes: slotRow.notes,
    served: slotRow.mealSummaryId == null ? false : servedLookup.has(servedKey),
  };
}

function createWeeklyPlansRepo(db) {
  const insertPlanStatement = db.prepare(
    `INSERT INTO weekly_plans (week_start, is_archived, created_at, updated_at)
     VALUES (?, 0, ${SQLITE_PRECISE_TIMESTAMP_SQL}, ${SQLITE_PRECISE_TIMESTAMP_SQL})`,
  );
  const insertSlotStatement = db.prepare(
    "INSERT INTO weekly_plan_slots (plan_id, day, meal_id, notes) VALUES (?, ?, ?, ?)",
  );
  const getPlanByIdStatement = db.prepare(
    `SELECT id, week_start AS weekStart, is_archived AS isArchived, created_at AS createdAt, updated_at AS updatedAt
     FROM weekly_plans
     WHERE id = ?`,
  );
  const getActivePlanStatement = db.prepare(
    `SELECT id, week_start AS weekStart, is_archived AS isArchived, created_at AS createdAt, updated_at AS updatedAt
     FROM weekly_plans
     WHERE is_archived = 0
     ORDER BY week_start DESC, created_at DESC
     LIMIT 1`,
  );
  const getPlanSlotsStatement = db.prepare(
    `SELECT s.plan_id AS planId, s.day, s.meal_id AS mealId, s.notes,
            m.id AS mealSummaryId, m.name AS mealName, m.is_favorite AS isFavorite,
            m.is_archived AS mealIsArchived
     FROM weekly_plan_slots s
     LEFT JOIN meals m
       ON m.id = s.meal_id
     WHERE s.plan_id = ?
     ORDER BY s.day`,
  );
  const archiveActivePlansStatement = db.prepare(
    "UPDATE weekly_plans SET is_archived = 1 WHERE is_archived = 0",
  );
  const upsertSlotStatement = db.prepare(
    `INSERT INTO weekly_plan_slots (plan_id, day, meal_id, notes)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(plan_id, day)
     DO UPDATE SET meal_id = excluded.meal_id, notes = excluded.notes`,
  );
  const touchPlanStatement = db.prepare(
    `UPDATE weekly_plans
     SET updated_at = ${buildMonotonicUpdatedAtSql("updated_at")}
     WHERE id = ?`,
  );
  const getSlotStatement = db.prepare(
    `SELECT s.plan_id AS planId, s.day, s.meal_id AS mealId, s.notes,
            p.week_start AS weekStart,
            m.id AS mealSummaryId, m.name AS mealName, m.is_favorite AS isFavorite,
            m.is_archived AS mealIsArchived
     FROM weekly_plan_slots s
     INNER JOIN weekly_plans p ON p.id = s.plan_id
     LEFT JOIN meals m
       ON m.id = s.meal_id
     WHERE s.plan_id = ? AND s.day = ?`,
  );
  const listSlotAssignmentsStatement = db.prepare(
    `SELECT s.day, s.meal_id AS mealId, s.notes
     FROM weekly_plan_slots s
     WHERE s.plan_id = ?
     ORDER BY s.day`,
  );
  const listPlanMealIdsStatement = db.prepare(
    `SELECT s.meal_id AS mealId
     FROM weekly_plan_slots s
     WHERE s.plan_id = ?
       AND s.meal_id IS NOT NULL
     ORDER BY s.day`,
  );
  const listArchivedPlansStatement = db.prepare(
    `SELECT id, week_start AS weekStart, created_at AS createdAt
     FROM weekly_plans
     WHERE is_archived = 1
     ORDER BY week_start DESC, created_at DESC
     LIMIT ?`,
  );

  function buildServedLookup(slotRows, weekStart) {
    const servedCandidates = slotRows
      .filter((slotRow) => slotRow.mealId != null)
      .map((slotRow) => ({
        mealId: slotRow.mealId,
        servedOn: addDaysToIsoDate(weekStart, slotRow.day),
      }));

    if (servedCandidates.length === 0) {
      return new Set();
    }

    const conditions = servedCandidates
      .map(() => "(meal_id = ? AND served_on = ?)")
      .join(" OR ");
    const params = servedCandidates.flatMap((candidate) => [
      candidate.mealId,
      candidate.servedOn,
    ]);
    const rows = db
      .prepare(
        `SELECT DISTINCT meal_id AS mealId, served_on AS servedOn
         FROM meal_history
         /* Tradeoff: served status is derived from (meal_id, served_on),
            so a manual/history entry for the same meal/date also marks the slot served. */
         WHERE ${conditions}`,
      )
      .all(...params);

    return new Set(rows.map((row) => `${row.mealId}:${row.servedOn}`));
  }

  function buildPlan(planRow) {
    if (!planRow) {
      return null;
    }

    const slotRows = getPlanSlotsStatement.all(planRow.id);
    const servedLookup = buildServedLookup(slotRows, planRow.weekStart);

    return {
      id: planRow.id,
      weekStart: planRow.weekStart,
      isArchived: Boolean(planRow.isArchived),
      createdAt: planRow.createdAt,
      updatedAt: planRow.updatedAt,
      slots: slotRows.map((slotRow) =>
        mapSlotRowToSlot(slotRow, planRow.weekStart, servedLookup),
      ),
    };
  }

  function normalizeSlotAssignments(slotAssignments = []) {
    const slotAssignmentMap = new Map(
      slotAssignments.map((slotAssignment) => [slotAssignment.day, slotAssignment]),
    );

    return DAY_LABELS.map((_label, day) => {
      const slotAssignment = slotAssignmentMap.get(day);

      return {
        day,
        mealId: slotAssignment?.mealId ?? null,
        notes: slotAssignment?.notes ?? null,
      };
    });
  }

  const createPlanTransaction = db.transaction((weekStart) => {
    const result = insertPlanStatement.run(weekStart);
    const planId = Number(result.lastInsertRowid);

    for (let day = 0; day < 7; day += 1) {
      insertSlotStatement.run(planId, day, null, null);
    }

    return planId;
  });

  const createPlanFromSourceTransaction = db.transaction((weekStart, sourceSlots) => {
    const result = insertPlanStatement.run(weekStart);
    const planId = Number(result.lastInsertRowid);
    const normalizedSourceSlots = normalizeSlotAssignments(sourceSlots);

    for (const sourceSlot of normalizedSourceSlots) {
      insertSlotStatement.run(
        planId,
        sourceSlot.day,
        sourceSlot.mealId,
        sourceSlot.notes,
      );
    }

    return planId;
  });

  function createPlan(weekStart) {
    const planId = createPlanTransaction(weekStart);
    return buildPlan(getPlanByIdStatement.get(planId));
  }

  function replaceActivePlan(weekStart) {
    const planId = db.transaction(() => {
      archiveActivePlansStatement.run();
      return createPlanTransaction(weekStart);
    })();

    return buildPlan(getPlanByIdStatement.get(planId));
  }

  function createPlanFromSource(weekStart, sourceSlots) {
    return createPlanFromSourceTransaction(weekStart, sourceSlots);
  }

  function replaceActivePlanFromSource(weekStart, sourceSlots) {
    return db.transaction(() => {
      archiveActivePlansStatement.run();
      return createPlanFromSourceTransaction(weekStart, sourceSlots);
    })();
  }

  function getPlanById(planId) {
    return buildPlan(getPlanByIdStatement.get(planId));
  }

  function getActivePlan() {
    return buildPlan(getActivePlanStatement.get());
  }

  function archiveActivePlan() {
    return archiveActivePlansStatement.run().changes;
  }

  function updateSlot(planId, day, mealId, notes) {
    const transaction = db.transaction(() => {
      upsertSlotStatement.run(planId, day, mealId ?? null, notes ?? null);
      touchPlanStatement.run(planId);
    });

    transaction();
    return buildPlan(getPlanByIdStatement.get(planId));
  }

  function getSlot(planId, day) {
    const slotRow = getSlotStatement.get(planId, day);

    if (!slotRow) {
      return null;
    }

    const servedLookup = buildServedLookup([slotRow], slotRow.weekStart);
    return mapSlotRowToSlot(slotRow, slotRow.weekStart, servedLookup);
  }

  function listSlotAssignments(planId) {
    return normalizeSlotAssignments(listSlotAssignmentsStatement.all(planId));
  }

  function listPlannedMealIds(planId) {
    const plannedMealIds = listPlanMealIdsStatement
      .all(planId)
      .map((row) => row.mealId);

    return [...new Set(plannedMealIds)];
  }

  function listArchivedPlans(limit) {
    return listArchivedPlansStatement.all(limit);
  }

  return {
    createPlan,
    createPlanFromSource,
    replaceActivePlan,
    replaceActivePlanFromSource,
    getPlanById,
    getActivePlan,
    archiveActivePlan,
    updateSlot,
    getSlot,
    listSlotAssignments,
    listPlannedMealIds,
    listArchivedPlans,
  };
}

module.exports = {
  createWeeklyPlansRepo,
  addDaysToIsoDate,
};
