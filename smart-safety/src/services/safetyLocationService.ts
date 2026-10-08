import Constants from "expo-constants";

const DEFAULT_SAFETY_API_BASE = "https://path-deviation.onrender.com/api";

const SAFETY_API_BASE =
  Constants.expoConfig?.extra?.PATH_DEVIATION_API_URL ||
  process.env.PATH_DEVIATION_API_URL ||
  DEFAULT_SAFETY_API_BASE;

export interface SafetyLocationPayload {
  userId: string;
  touristName?: string;
  mobileNumber?: string;
  role?: string;
  groupId?: string;
  emergencyContact?: { name?: string; phone?: string };
  dayWiseItinerary?: Array<{
    dayNumber: number;
    date: string;
    nodes: Array<{
      type?: string;
      name?: string;
      locationName?: string;
      scheduledTime?: string;
      activityDetails?: string;
    }>;
  }>;
  latitude: number;
  longitude: number;
  timestamp: string;
  safetyScore: number;
}

export interface SafetyEvent {
  zoneKey: string;
  zoneId: string;
  zoneType: "geofence" | "risk_grid" | "danger_zone";
  zoneName: string;
  state: "approaching" | "entering" | "staying" | "leaving";
  thresholdMeters?: number | null;
  message: string;
  occurredAt: string;
}

export interface SafetyLocationResponse {
  status: string;
  userId: string;
  locationStoredAt: string;
  events: SafetyEvent[];
}

export async function sendSafetyLocationUpdate(
  payload: SafetyLocationPayload,
): Promise<SafetyLocationResponse | null> {
  try {
    const endpoint = `${SAFETY_API_BASE}/safety/location`;
    console.info(
      '[SafetyTracking] 📍 Sending location update',
      `userId=${payload.userId}`,
      `lat=${payload.latitude.toFixed(5)}, lng=${payload.longitude.toFixed(5)}`,
      `→ ${endpoint}`,
    );
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        '[SafetyTracking] ⚠️ Location update failed:',
        response.status,
        body,
      );
      return null;
    }

    const result = (await response.json()) as SafetyLocationResponse;
    console.info(
      '[SafetyTracking] ✅ Location accepted. Events:', result.events?.length ?? 0,
    );
    return result;
  } catch (error) {
    console.warn("[SafetyTracking] ❌ Location update network error:", error);
    return null;
  }
}

