CREATE TABLE IF NOT EXISTS weekly_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_start TEXT NOT NULL,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now')),
  updated_at TEXT NOT NULL DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'now'))
);

CREATE TABLE IF NOT EXISTS weekly_plan_slots (
  plan_id INTEGER NOT NULL,
  day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
  meal_id INTEGER,
  notes TEXT,
  PRIMARY KEY (plan_id, day),
  FOREIGN KEY (plan_id) REFERENCES weekly_plans(id) ON DELETE CASCADE,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_plans_active_week_start
  ON weekly_plans(week_start)
  WHERE is_archived = 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_plans_single_active
  ON weekly_plans(is_archived)
  WHERE is_archived = 0;

CREATE INDEX IF NOT EXISTS idx_weekly_plans_is_archived_week_start
  ON weekly_plans(is_archived, week_start DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_plan_slots_meal_id
  ON weekly_plan_slots(meal_id);

CREATE TRIGGER IF NOT EXISTS trg_weekly_plans_updated_at
AFTER UPDATE ON weekly_plans
FOR EACH ROW
BEGIN
  UPDATE weekly_plans
  SET updated_at = CASE
    WHEN STRFTIME('%Y-%m-%d %H:%M:%f', 'now') > OLD.updated_at
      THEN STRFTIME('%Y-%m-%d %H:%M:%f', 'now')
    ELSE STRFTIME(
      '%Y-%m-%d %H:%M:%f',
      julianday(OLD.updated_at) + (1.0 / 86400000.0)
    )
  END
  WHERE id = NEW.id;
END;
