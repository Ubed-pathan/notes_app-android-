let cached: boolean | undefined;

/** True when running inside the Expo Go store client (not a dev/release build). */
export function isExpoGo(): boolean {
  if (cached !== undefined) return cached;

  try {
    const { default: Constants, ExecutionEnvironment } = require('expo-constants');
    cached = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    cached = false;
  }

  return cached;
}
