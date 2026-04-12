const {
  expoRouterBabelPlugin,
} = require("babel-preset-expo/build/expo-router-plugin");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // In this workspace, `expo-router` is installed under apps/mobile/node_modules
    // while `babel-preset-expo` is hoisted to the repo root. The preset's internal
    // `hasModule('expo-router')` check therefore misses it and skips the router
    // env-var transform. Explicitly add the real router plugin here so
    // `process.env.EXPO_ROUTER_APP_ROOT` gets inlined for `_ctx.*.js`.
    plugins: [expoRouterBabelPlugin],
  };
};
