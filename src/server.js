const { createApp } = require("./app");
const { loadConfig } = require("./config/env");
const { createDatabase } = require("./db/connection");
const { runMigrations } = require("./db/migrate");
const { seedDatabase } = require("./db/seed");

const config = loadConfig();
const db = createDatabase(config);

runMigrations(db);

if (config.seedOnEmpty) {
  seedDatabase(db);
}

const app = createApp({ db, config });
const server = app.listen(config.port, () => {
  console.log(`What's for Dinner listening on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
