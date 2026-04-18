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

// Force single copies of the React runtime packages so Metro does not mix a
// hoisted workspace copy with a nested app copy. Resolve from the mobile app
// first, but allow Node to fall back to the hoisted workspace package when the
// dependency lives at the repo root.
const resolveFromMobileApp = (packageName) =>
  path.dirname(
    require.resolve(`${packageName}/package.json`, { paths: [projectRoot] }),
  );

config.resolver.extraNodeModules = {
  react: resolveFromMobileApp("react"),
  "react-dom": resolveFromMobileApp("react-dom"),
  "react-native": resolveFromMobileApp("react-native"),
  "react-native-gesture-handler": resolveFromMobileApp(
    "react-native-gesture-handler",
  ),
  "react-native-reanimated": resolveFromMobileApp("react-native-reanimated"),
  "react-native-safe-area-context": resolveFromMobileApp(
    "react-native-safe-area-context",
  ),
  "react-native-screens": resolveFromMobileApp("react-native-screens"),
};

module.exports = config;
