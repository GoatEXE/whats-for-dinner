const path = require("node:path");
const { createTestContext } = require(
  path.join(__dirname, "..", "..", "test", "helpers", "test-app"),
);
const { seedDatabase } = require(
  path.join(__dirname, "..", "..", "src", "db", "seed"),
);

async function startTestServer() {
  const context = createTestContext();
  seedDatabase(context.db);

  try {
    const server = await new Promise((resolve, reject) => {
      const appServer = context.app.listen(0, "127.0.0.1");
      appServer.once("error", reject);
      appServer.once("listening", () => resolve(appServer));
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Test server did not expose a TCP port");
    }

    return {
      baseURL: `http://127.0.0.1:${address.port}`,
      async cleanup() {
        await new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
          server.closeIdleConnections?.();
          server.closeAllConnections?.();
        });
        context.cleanup();
      },
    };
  } catch (error) {
    context.cleanup();
    throw error;
  }
}

module.exports = {
  startTestServer,
};
