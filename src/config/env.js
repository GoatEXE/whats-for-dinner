const path = require("node:path");
const { existsSync, mkdirSync } = require("node:fs");
const dotenv = require("dotenv");
const { z } = require("zod");

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_PATH: z
    .string()
    .default(path.resolve(process.cwd(), "data", "whats-for-dinner.sqlite")),
  SEED_ON_EMPTY: z
    .preprocess((value) => {
      if (typeof value === "boolean") {
        return value;
      }

      if (typeof value === "string") {
        return value.toLowerCase() === "true";
      }

      return value ?? true;
    }, z.boolean())
    .default(true),
});

function loadConfig(overrides = {}) {
  const parsed = envSchema.parse({ ...process.env, ...overrides });
  const dbPath =
    parsed.DB_PATH === ":memory:" ? ":memory:" : path.resolve(parsed.DB_PATH);

  if (dbPath !== ":memory:") {
    const dbDir = path.dirname(dbPath);

    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
  }

  return {
    nodeEnv: parsed.NODE_ENV,
    port: parsed.PORT,
    dbPath,
    seedOnEmpty: parsed.SEED_ON_EMPTY,
    isTest: parsed.NODE_ENV === "test",
  };
}

module.exports = {
  loadConfig,
};
