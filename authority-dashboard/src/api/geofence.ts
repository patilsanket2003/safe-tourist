/*
  Geofence API client
  - createZone(zone): Promise<Zone> -- POST /api/geofence/zone
  - getZones(): Promise<Zone[]> -- GET /api/geofence/
  - getZoneById(id): Promise<Zone | null> -- GET /api/geofence/:id

  Behavior:
  - Uses VITE_API_BASE_URL env var (fallback to https://smart-tourist-safety-backend.onrender.com).
  - Normalizes responses and throws on network/HTTP errors.
*/

import { API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export type Zone = {
  id: string;
  name: string;
  type?: string;
  coords?: [number, number];
  radiusKm?: number;
  category?: string;
  state?: string;
  riskLevel?: string;
  source?: string;
  raw?: any;
};

export async function createZone(zone: Partial<Zone>): Promise<Zone> {
  const res = await fetch(`${API_BASE}/api/geofence/zone`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(zone),
  });
  if (!res.ok) throw new Error(`Failed to create zone: ${res.status}`);
  const data = await res.json();
  // API docs show response contains { success: true, message, zone: { ... } }
  if (data && data.zone) return data.zone as Zone;
  if (data && data.id) return data as Zone;
  throw new Error("Unexpected response shape from createZone");
}

export async function getZones(): Promise<Zone[]> {
  const res = await fetch(`${API_BASE}/api/geofence/`);
  if (!res.ok) throw new Error(`Failed to get zones: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data)) return data as Zone[];
  if (data && Array.isArray(data.zones)) return data.zones as Zone[];
  if (data && Array.isArray(data.items)) return data.items as Zone[];
  // fallback: try alerts-style normalization
  if (data && typeof data === "object") {
    const possible = data.zones || data.data || data.items;
    if (Array.isArray(possible)) return possible as Zone[];
  }
  return [];
}

export async function getZoneById(id: string): Promise<Zone | null> {
  const res = await fetch(`${API_BASE}/api/geofence/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to get zone ${id}: ${res.status}`);
  const data = await res.json();
  // docs show single object returned
  if (data && typeof data === "object") return data as Zone;
  return null;
}

export async function getHighRiskZoneCount(): Promise<number> {
  const res = await fetch(`${API_BASE}/api/geofence/count`);
  if (!res.ok)
    throw new Error(`Failed to get high risk zone count: ${res.status}`);
  const data = await res.json();
  if (data && typeof data.highRiskZones === "number") return data.highRiskZones;
  return 0;
}

export default {
  createZone,
  getZones,
  getZoneById,
  getHighRiskZoneCount,
};
