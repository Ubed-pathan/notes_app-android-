export function isExpoGo(): boolean {
  try {
    const Constants = require('expo-constants').default;
    const { ExecutionEnvironment } = require('expo-constants');
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch {
    return false;
  }
}
