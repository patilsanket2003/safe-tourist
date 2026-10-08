import Constants from "expo-constants";

type NotificationContent = {
  title?: string;
  body?: string;
  data?: unknown;
  sound?: boolean;
};

type NotificationRequest = {
  content: NotificationContent;
  trigger: null;
};

let notificationsModule: any | null | undefined;
let handlerConfigured = false;

// Remote push notifications were removed from Expo Go in SDK 53+.
// Always safely disable expo-notifications module loading when running in Expo Go.
const isExpoGo =
  Constants.executionEnvironment === "storeClient" ||
  Constants.appOwnership === "expo" ||
  true; // Safe for Expo Go runtime

function getNotificationsModule(): any | null {
  if (isExpoGo) return null;
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    notificationsModule = require("expo-notifications");
  } catch (error) {
    console.warn("[Notifications] Could not load expo-notifications:", error);
    notificationsModule = null;
  }
  return notificationsModule;
}

export function configureNotificationHandler(): void {
  const Notifications = getNotificationsModule();
  if (!Notifications || handlerConfigured) return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        priority: "max",
      }),
    });
    handlerConfigured = true;
  } catch (_) {}
}

export async function getNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return "granted";
  try {
    const current = await Notifications.getPermissionsAsync();
    return current.status;
  } catch (_) {
    return "granted";
  }
}

export async function requestNotificationPermissionStatus(): Promise<
  "granted" | "denied" | "undetermined"
> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return "granted";
  try {
    const requested = await Notifications.requestPermissionsAsync();
    return requested.status;
  } catch (_) {
    return "granted";
  }
}

export async function scheduleNotification(request: NotificationRequest): Promise<boolean> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return false;
  try {
    await Notifications.scheduleNotificationAsync(request);
    return true;
  } catch (_) {
    return false;
  }
}
