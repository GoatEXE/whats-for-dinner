UPDATE weekly_plans
SET is_archived = 1
WHERE is_archived = 0
  AND id NOT IN (
    SELECT id
    FROM weekly_plans
    WHERE is_archived = 0
    ORDER BY week_start DESC, created_at DESC, id DESC
    LIMIT 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_plans_single_active
  ON weekly_plans(is_archived)
  WHERE is_archived = 0;

DROP TRIGGER IF EXISTS trg_weekly_plans_updated_at;

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
