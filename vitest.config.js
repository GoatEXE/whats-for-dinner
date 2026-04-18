const { defineConfig } = require("vitest/config");

module.exports = defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: ["apps/**", "node_modules/**"],
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
