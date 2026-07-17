import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import type { RootStackParamList } from "./RootNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Callable from any screen, regardless of nesting depth, without parent-chain lookups. */
export function resetToLogin() {
  if (!navigationRef.isReady()) return;
  navigationRef.dispatch(CommonActions.reset({ index: 0, routes: [{ name: "Login" }] }));
}
