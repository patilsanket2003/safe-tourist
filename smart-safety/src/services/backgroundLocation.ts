import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import io from "socket.io-client";

import { SERVER_URL } from "../config";
import { pathDeviationService, type GPSPoint } from "./pathDeviationService";

type PersistedAppState = "active" | "background" | "inactive" | "unknown";

export type BackgroundTrackingAppState = "active" | "background" | "inactive";

const STORAGE_KEYS = {
  appState: "bg:appState",
  touristId: "bg:touristId",
  journeyId: "bg:journeyId",
  pendingTouristLocations: "bg:pendingTouristLocations",
} as const;

const TASKS = {
  tourist: "TOURIST_BG_LOCATION_TASK",
  journey: "JOURNEY_BG_LOCATION_TASK",
} as const;

const PENDING_TOURIST_MAX = 100;

export async function setAppStateForBackgroundTasks(
  appState: BackgroundTrackingAppState,
) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.appState, appState);
  } catch {
    // best-effort
  }
}

async function getPersistedAppState(): Promise<PersistedAppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.appState);
    if (raw === "active" || raw === "background" || raw === "inactive") return raw;
    return "unknown";
  } catch {
    return "unknown";
  }
}

async function ensureForegroundLocationPermissionAsync(): Promise<boolean> {
  try {
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status === "granted") return true;
    const req = await Location.requestForegroundPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

async function ensureBackgroundLocationPermissionAsync(): Promise<boolean> {
  try {
    const bg = await Location.getBackgroundPermissionsAsync();
    if (bg.status === "granted") return true;
    const req = await Location.requestBackgroundPermissionsAsync();
    return req.status === "granted";
  } catch {
    return false;
  }
}

async function appendPendingTouristLocation(coords: { lat: number; lng: number }) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.pendingTouristLocations);
    const list = raw ? (JSON.parse(raw) as Array<{ lat: number; lng: number }>) : [];
    list.push(coords);
    const capped = list.slice(-PENDING_TOURIST_MAX);
    await AsyncStorage.setItem(
      STORAGE_KEYS.pendingTouristLocations,
      JSON.stringify(capped),
    );
  } catch {
    // best-effort
  }
}

export async function drainPendingTouristLocations(): Promise<
  Array<{ lat: number; lng: number }>
> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.pendingTouristLocations);
    await AsyncStorage.removeItem(STORAGE_KEYS.pendingTouristLocations);
    return raw ? (JSON.parse(raw) as Array<{ lat: number; lng: number }>) : [];
  } catch {
    return [];
  }
}

function sendTouristLocationOnce(params: {
  touristId: string;
  coords: { lat: number; lng: number };
}): Promise<void> {
  const { touristId, coords } = params;

  return new Promise((resolve, reject) => {
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: false,
      timeout: 8000,
      forceNew: true,
      autoConnect: true,
    });

    const finish = (err?: unknown) => {
      try {
        socket.removeAllListeners();
        socket.disconnect();
      } catch {
        // ignore
      }
      if (err) reject(err);
      else resolve();
    };

    const timeout = setTimeout(() => {
      finish(new Error("timeout"));
    }, 9000);

    socket.on("connect", () => {
      try {
        socket.emit("registerTourist", {
          role: "tourist",
          touristId,
          location: coords,
        });
        socket.emit("updateTouristLocation", { location: coords });
        socket.emit("requestSafetyScoreUpdate");
      } catch (e) {
        clearTimeout(timeout);
        finish(e);
        return;
      }

      // Give the socket a short window to flush packets before closing.
      setTimeout(() => {
        clearTimeout(timeout);
        finish();
      }, 500);
    });

    socket.on("connect_error", (e: unknown) => {
      clearTimeout(timeout);
      finish(e);
    });

    socket.on("error", (e: unknown) => {
      clearTimeout(timeout);
      finish(e);
    });
  });
}

async function shouldSendNetworkFromTask(): Promise<boolean> {
  const appState = await getPersistedAppState();
  return appState !== "active";
}

if (!TaskManager.isTaskDefined(TASKS.tourist)) {
  TaskManager.defineTask(TASKS.tourist, async ({ data, error }) => {
    if (error) {
      console.warn("[BGLocation] Tourist task error:", error);
      return;
    }
    if (!(await shouldSendNetworkFromTask())) return;

    const touristId = await AsyncStorage.getItem(STORAGE_KEYS.touristId);
    if (!touristId) return;

    const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
    const loc = locations?.[0];
    if (!loc?.coords) return;

    const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };

    try {
      await sendTouristLocationOnce({ touristId, coords });
    } catch (e) {
      console.warn("[BGLocation] Tourist send failed, queueing:", e);
      await appendPendingTouristLocation(coords);
    }
  });
}

if (!TaskManager.isTaskDefined(TASKS.journey)) {
  TaskManager.defineTask(TASKS.journey, async ({ data, error }) => {
    if (error) {
      console.warn("[BGLocation] Journey task error:", error);
      return;
    }
    if (!(await shouldSendNetworkFromTask())) return;

    const journeyId = await AsyncStorage.getItem(STORAGE_KEYS.journeyId);
    if (!journeyId) return;

    const locations = (data as any)?.locations as Location.LocationObject[] | undefined;
    const loc = locations?.[0];
    if (!loc?.coords) return;

    const gpsPoint: GPSPoint = {
      lat: loc.coords.latitude,
      lng: loc.coords.longitude,
      timestamp: new Date(loc.timestamp).toISOString(),
      speed: loc.coords.speed ?? undefined,
      bearing: loc.coords.heading ?? undefined,
      accuracy: loc.coords.accuracy ?? undefined,
    };

    await pathDeviationService.sendGPSPoint(journeyId, gpsPoint);
  });
}

export async function startTouristBackgroundTrackingAsync(touristId: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.touristId, touristId);

  const fgOk = await ensureForegroundLocationPermissionAsync();
  if (!fgOk) throw new Error("foreground_location_denied");

  const bgOk = await ensureBackgroundLocationPermissionAsync();
  if (!bgOk) throw new Error("background_location_denied");

  const started = await Location.hasStartedLocationUpdatesAsync(TASKS.tourist);
  if (started) return;

  await Location.startLocationUpdatesAsync(TASKS.tourist, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10000,
    distanceInterval: 50,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Smart Safety is tracking location",
      notificationBody: "Location tracking is active for safety alerts.",
    },
  });
}

export async function stopTouristBackgroundTrackingAsync() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.touristId);
  } catch {
    // ignore
  }
  const started = await Location.hasStartedLocationUpdatesAsync(TASKS.tourist);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(TASKS.tourist);
}

export async function startJourneyBackgroundTrackingAsync(journeyId: string) {
  await AsyncStorage.setItem(STORAGE_KEYS.journeyId, journeyId);

  const fgOk = await ensureForegroundLocationPermissionAsync();
  if (!fgOk) throw new Error("foreground_location_denied");

  const bgOk = await ensureBackgroundLocationPermissionAsync();
  if (!bgOk) throw new Error("background_location_denied");

  const started = await Location.hasStartedLocationUpdatesAsync(TASKS.journey);
  if (started) return;

  await Location.startLocationUpdatesAsync(TASKS.journey, {
    accuracy: Location.Accuracy.High,
    timeInterval: 3000,
    distanceInterval: 10,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Journey tracking is active",
      notificationBody: "Tracking your route in background for deviation alerts.",
    },
  });
}

export async function stopJourneyBackgroundTrackingAsync() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.journeyId);
  } catch {
    // ignore
  }
  const started = await Location.hasStartedLocationUpdatesAsync(TASKS.journey);
  if (!started) return;
  await Location.stopLocationUpdatesAsync(TASKS.journey);
}

