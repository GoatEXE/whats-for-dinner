CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  notes TEXT,
  prep_minutes INTEGER,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  meal_id INTEGER NOT NULL,
  ingredient_id INTEGER NOT NULL,
  quantity_text TEXT,
  is_optional INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (meal_id, ingredient_id),
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS pantry_items (
  ingredient_id INTEGER PRIMARY KEY,
  quantity_text TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meal_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL,
  served_on TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS meal_tags (
  meal_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (meal_id, tag_id),
  FOREIGN KEY (meal_id) REFERENCES meals(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_meals_archived_favorite ON meals(is_archived, is_favorite);
CREATE INDEX IF NOT EXISTS idx_ingredients_normalized_name ON ingredients(normalized_name);
CREATE INDEX IF NOT EXISTS idx_pantry_updated_at ON pantry_items(updated_at);
CREATE INDEX IF NOT EXISTS idx_history_served_on ON meal_history(served_on);
CREATE INDEX IF NOT EXISTS idx_meal_tags_tag_id ON meal_tags(tag_id);

CREATE TRIGGER IF NOT EXISTS trg_meals_updated_at
AFTER UPDATE ON meals
FOR EACH ROW
BEGIN
  UPDATE meals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
