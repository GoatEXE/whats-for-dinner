import { Redirect } from "expo-router";

/**
 * Root entry: send users straight into the tab group, defaulting to the
 * Plan tab. Without this, hitting "/" (the web root or Expo Go's initial
 * route) produces an "unmatched route" because expo-router does not auto-
 * descend into route groups.
 */
export default function Index() {
  return <Redirect href="/(tabs)/plan" />;
}
