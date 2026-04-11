const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo root for shared packages
config.watchFolders = [monorepoRoot];

// Resolve modules from both the mobile app and the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// ---------------------------------------------------------------------------
// Web support for expo-sqlite
// ---------------------------------------------------------------------------
// expo-sqlite on web uses wa-sqlite (WebAssembly SQLite) which requires
// SharedArrayBuffer. Browsers only expose SharedArrayBuffer to pages that
// are cross-origin isolated, which requires these two response headers on
// every dev server response:
//   Cross-Origin-Opener-Policy:   same-origin
//   Cross-Origin-Embedder-Policy: require-corp
//
// Without them, localhost:8081 shows our "Storage unavailable" gate because
// SQLite init throws synchronously inside the DatabaseProvider.
// ---------------------------------------------------------------------------
const baseEnhanceMiddleware = config.server?.enhanceMiddleware;
let headerLogCount = 0;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, metroServer) => {
    const wrappedBase = baseEnhanceMiddleware
      ? baseEnhanceMiddleware(middleware, metroServer)
      : middleware;

    return (req, res, next) => {
      res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
      // `credentialless` is a more permissive alternative to `require-corp`
      // that does not require CORP headers on every subresource. It is
      // supported in Chrome 96+ and Firefox 110+, which covers all modern
      // development environments.
      res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      // Log the first few requests so we can confirm the middleware is
      // actually wired into the Metro server (helps debug web SQLite
      // cross-origin isolation issues).
      if (headerLogCount < 5) {
        headerLogCount += 1;
        // eslint-disable-next-line no-console
        console.log(`[web-coop-coep] ${req.method} ${req.url}`);
      }

      return wrappedBase(req, res, next);
    };
  },
};

module.exports = config;
