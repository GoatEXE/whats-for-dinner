export const initialMigration = {
  version: 1,
  name: "001-initial",
  sql: `
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      notes TEXT DEFAULT '',
      prep_minutes INTEGER,
      is_favorite INTEGER NOT NULL DEFAULT 0,
      is_archived INTEGER NOT NULL DEFAULT 0,
      source_url TEXT,
      source_host TEXT,
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS meal_ingredients (
      meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
      quantity_text TEXT DEFAULT '',
      is_optional INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (meal_id, ingredient_id)
    );

    CREATE TABLE IF NOT EXISTS meal_tags (
      meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id),
      PRIMARY KEY (meal_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS pantry_items (
      ingredient_id TEXT PRIMARY KEY REFERENCES ingredients(id),
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_history (
      id TEXT PRIMARY KEY,
      meal_id TEXT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      served_on TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_plans (
      id TEXT PRIMARY KEY,
      week_start TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS weekly_plan_slots (
      plan_id TEXT NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
      day INTEGER NOT NULL CHECK (day BETWEEN 0 AND 6),
      meal_id TEXT REFERENCES meals(id) ON DELETE SET NULL,
      custom_name TEXT,
      notes TEXT,
      served_at TEXT,
      PRIMARY KEY (plan_id, day)
    );

    CREATE INDEX IF NOT EXISTS idx_meals_normalized_name
      ON meals(normalized_name);
    CREATE INDEX IF NOT EXISTS idx_meals_archived_favorite_name
      ON meals(is_archived, is_favorite, name COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_meal_ingredients_ingredient_id
      ON meal_ingredients(ingredient_id);
    CREATE INDEX IF NOT EXISTS idx_meal_tags_tag_id
      ON meal_tags(tag_id);
    CREATE INDEX IF NOT EXISTS idx_pantry_items_added_at
      ON pantry_items(added_at);
    CREATE INDEX IF NOT EXISTS idx_meal_history_meal_id
      ON meal_history(meal_id);
    CREATE INDEX IF NOT EXISTS idx_meal_history_served_on
      ON meal_history(served_on DESC);
    CREATE INDEX IF NOT EXISTS idx_weekly_plans_week_start
      ON weekly_plans(week_start);
    CREATE INDEX IF NOT EXISTS idx_weekly_plans_archived_week_start
      ON weekly_plans(is_archived, week_start DESC);
    CREATE INDEX IF NOT EXISTS idx_weekly_plan_slots_meal_id
      ON weekly_plan_slots(meal_id);

    CREATE TRIGGER IF NOT EXISTS ingredients_touch_updated_at
      AFTER UPDATE ON ingredients
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE ingredients
      SET updated_at = datetime('now')
      WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS tags_touch_updated_at
      AFTER UPDATE ON tags
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE tags
      SET updated_at = datetime('now')
      WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS meals_touch_updated_at
      AFTER UPDATE ON meals
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE meals
      SET updated_at = datetime('now')
      WHERE id = OLD.id;
    END;

    CREATE TRIGGER IF NOT EXISTS weekly_plans_touch_updated_at
      AFTER UPDATE ON weekly_plans
      FOR EACH ROW
      WHEN NEW.updated_at = OLD.updated_at
    BEGIN
      UPDATE weekly_plans
      SET updated_at = datetime('now')
      WHERE id = OLD.id;
    END;
  `,
} as const;

export type MigrationDefinition = typeof initialMigration;
