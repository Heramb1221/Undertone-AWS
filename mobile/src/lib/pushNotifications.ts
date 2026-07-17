/**
 * Push notification registration via Expo's push service (per your decision —
 * not AWS SNS, since Android push requires FCM credentials regardless of
 * provider, and you chose to avoid that setup for now).
 *
 * IMPORTANT — verified against current Expo docs, not assumed: as of Expo SDK 53,
 * remote push notifications are NOT supported in Expo Go on Android at all
 * (removed due to Google policy changes forcing per-app FCM credentials). We're
 * on SDK 57. This means testing this feature requires a development build
 * (`npx expo install expo-dev-client` + `npx expo run:android`, or an EAS Build),
 * not just `npx expo start` + Expo Go like every previous mobile phase. Also
 * requires a real EAS project ID (from expo.dev — free to create, but an
 * account I can't create from this sandbox) in app.json's `extra.eas.projectId`.
 *
 * None of this can be exercised from this sandbox — no dev build tooling, no
 * physical device, no EAS account. Code is written carefully against the
 * documented API; you are the first to actually run it.
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications require a physical device — skipping on simulator/emulator.");
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    console.warn("Push notification permission denied.");
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  if (!projectId) {
    console.warn("No EAS projectId configured in app.json — can't request an Expo push token. See app.json's extra.eas.projectId.");
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (err) {
    console.warn("Failed to get Expo push token:", err);
    return null;
  }
}
