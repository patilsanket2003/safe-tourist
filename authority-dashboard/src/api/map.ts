import { API_BASE_URL, PATH_DEVIATION_API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;
const PATH_DEVIATION_API_BASE =
  import.meta.env.VITE_PATH_DEVIATION_API_BASE || PATH_DEVIATION_API_BASE_URL;

console.info(
  "[map.ts] Using PATH_DEVIATION_API_BASE:",
  PATH_DEVIATION_API_BASE,
);

export interface MapStats {
  totalTourists: number;
  activeAlerts: number;
  highRiskZones: number;
  responseUnits: number;
}

export interface MapTourist {
  id: string; // digitalId or touristId
  name: string;
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
  status: "active" | "expired";
  safetyScore: number;
  location: { lat: number; lng: number };
  type: "tourist";
}

export interface MapZone {
  id: string;
  name: string;
  riskLevel: string;
  type: "zone";
  shape: "circle" | "polygon";
  coordinates: [number, number]; // lat, lng center
  radius: number; // in meters
}

export interface MapAlert {
  id: string;
  type: "alert";
  status: string;
  priority: "high" | "medium" | "critical";
  location: { lat: number; lng: number };
  locationName?: string;
}

export interface MapRiskGrid {
  location: { lat: number; lng: number };
  intensity: number;
}

export interface MapIncident {
  id: string;
  title: string;
  type: "incident";
  category: string;
  location: { lat: number; lng: number };
}

export interface CreateDangerZonePayload {
  name: string;
  type: "circle" | "polygon";
  coords: [number, number];
  radiusKm?: number;
  riskLevel: string;
  category: string;
  state: string;
  source: string;
}

export interface MapOverviewResponse {
  stats: MapStats;
  mapData: {
    tourists: MapTourist[];
    zones: MapZone[];
    activeAlerts: MapAlert[];
    riskGrids: MapRiskGrid[];
    incidents: MapIncident[];
  };
}

// Styled Zones Types
export interface VisualStyle {
  zoneType: "danger_zone" | "risk_grid" | "geofence";
  borderStyle: "solid" | "dashed" | "dotted";
  borderWidth: number;
  fillOpacity: number;
  fillPattern: string;
  iconType: string;
  renderPriority: number;
  gridSize?: number;
  color?: string;
}

export interface DangerZone {
  _id: string;
  name: string;
  type: string;
  coords: [number, number];
  radiusKm?: number;
  polygonCoords?: [number, number][];
  category?: string;
  state?: string;
  riskLevel: string;
  visualStyle: VisualStyle;
}

export interface RiskGrid {
  _id: string;
  gridId: string;
  gridName: string;
  location: {
    type: string;
    coordinates: [number, number];
  };
  riskScore: number;
  riskLevel: string;
  lastUpdated: string;
  reasons?: Array<{
    type: "sos_alert" | "incident";
    title: string;
    severity: number;
    timestamp: string;
  }>;
  visualStyle: VisualStyle;
}

export interface StyledZonesResponse {
  dangerZones: DangerZone[];
  riskGrids: RiskGrid[];
  geofences: any[]; // We won't use these
}

export interface SafetyLatestUser {
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
  location: { lat: number; lng: number };
  timestamp: string;
  activeZoneCount: number;
  safetyScore: number;
}

export interface SafetyLatestUsersResponse {
  users: SafetyLatestUser[];
}

export async function fetchMapOverview(): Promise<MapOverviewResponse> {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) {
    Object.assign(headers, { Authorization: `Bearer ${token}` });
  }

  const res = await fetch(`${API_BASE}/api/authority/map-overview`, {
    headers,
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch map data: ${res.status}`);
  }

  const json = await res.json();
  if (json.success) {
    const baseMapData = json?.mapData || json?.data?.mapData || {};
    const rawIncidents = Array.isArray(baseMapData?.incidents)
      ? baseMapData.incidents
      : [];

    const normalizedIncidents: MapIncident[] = rawIncidents
      .map((incident: any, index: number) => {
        const coords = incident?.location?.coordinates;
        const rawLng =
          incident?.location?.lng ??
          (Array.isArray(coords) ? coords[0] : undefined);
        const rawLat =
          incident?.location?.lat ??
          (Array.isArray(coords) ? coords[1] : undefined);

        const lng = Number(rawLng);
        const lat = Number(rawLat);

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          return null;
        }

        return {
          id: String(incident?.id || incident?._id || `incident-${index}`),
          title: String(
            incident?.title || incident?.name || "Untitled Incident",
          ),
          type: "incident",
          category: String(incident?.category || incident?.type || "other"),
          location: { lat, lng },
        } as MapIncident;
      })
      .filter((incident: MapIncident | null): incident is MapIncident =>
        Boolean(incident),
      );

    return {
      ...json,
      mapData: {
        ...baseMapData,
        tourists: Array.isArray(baseMapData?.tourists)
          ? baseMapData.tourists
          : [],
        zones: Array.isArray(baseMapData?.zones) ? baseMapData.zones : [],
        activeAlerts: Array.isArray(baseMapData?.activeAlerts)
          ? baseMapData.activeAlerts
          : [],
        riskGrids: Array.isArray(baseMapData?.riskGrids)
          ? baseMapData.riskGrids
          : [],
        incidents: normalizedIncidents,
      },
      stats: json?.stats || json?.data?.stats,
    } as MapOverviewResponse;
  }
  throw new Error(json.message || "Failed to load map overview");
}

export async function fetchStyledZones(): Promise<StyledZonesResponse> {
  const res = await fetch(`${API_BASE}/api/geofence/all-zones-styled`);

  if (!res.ok) {
    throw new Error(`Failed to fetch styled zones: ${res.status}`);
  }

  const json = await res.json();
  return json as StyledZonesResponse;
}

export async function fetchLatestSafetyUsers(): Promise<SafetyLatestUser[]> {
  const url = `${PATH_DEVIATION_API_BASE}/safety/users/latest?minutes=1440&limit=1000`;
  console.info("[fetchLatestSafetyUsers] Fetching from:", url);

  const res = await fetch(url);
  if (!res.ok) {
    console.error(
      "[fetchLatestSafetyUsers] Request failed:",
      res.status,
      res.statusText,
    );
    throw new Error(`Failed to fetch safety latest users: ${res.status}`);
  }

  const json = (await res.json()) as SafetyLatestUsersResponse & {
    users?: any[];
  };

  if (!Array.isArray(json.users)) {
    return [];
  }

  const normalized: SafetyLatestUser[] = [];

  for (const row of json.users) {
    const userId = String(row?.userId || row?.touristId || row?.id || "");
    const lat = Number(
      row?.location?.lat ?? row?.latitude ?? row?.latestLocation?.lat,
    );
    const lng = Number(
      row?.location?.lng ?? row?.longitude ?? row?.latestLocation?.lng,
    );
    const safetyScore = Number(row?.safetyScore ?? row?.score ?? 0);
    const touristName = String(
      row?.touristName ?? row?.name ?? row?.tourist?.name ?? "",
    ).trim();
    const mobileNumber = String(
      row?.mobileNumber ?? row?.phone ?? row?.tourist?.phone ?? "",
    ).trim();
    const role = String(row?.role ?? "").trim();
    const groupId = String(row?.groupId ?? "").trim();
    const emergencyContact = row?.emergencyContact ?? undefined;
    const dayWiseItinerary = Array.isArray(row?.dayWiseItinerary)
      ? row.dayWiseItinerary
      : undefined;

    if (!userId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    normalized.push({
      userId,
      touristName: touristName || undefined,
      mobileNumber: mobileNumber || undefined,
      role: role || undefined,
      groupId: groupId || undefined,
      emergencyContact,
      dayWiseItinerary,
      location: { lat, lng },
      timestamp: String(
        row?.timestamp || row?.updatedAt || new Date().toISOString(),
      ),
      activeZoneCount: Number(row?.activeZoneCount ?? row?.zones ?? 0),
      safetyScore,
    });
  }

  console.info(
    `[fetchLatestSafetyUsers] ✅ Received ${json.users.length} raw users, normalized to ${normalized.length}`,
  );
  return normalized;
}

export async function createDangerZone(
  payload: CreateDangerZonePayload,
): Promise<{ success: boolean; message?: string; data?: any }> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/api/authority/map/danger-zone`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const json = await res
    .json()
    .catch(() => ({ success: false, message: "Invalid response" }));

  if (!res.ok || json?.success === false) {
    throw new Error(
      json?.message || `Failed to create danger zone: ${res.status}`,
    );
  }

  return json;
}
