import { API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export interface TouristRegistryItem {
  id: string; // mongo _id
  touristId: string;
  name: string;
  phone: string;
  nationality: string;
  tripStart: string;
  tripEnd: string;
  safetyScore: number;
  status: "ACTIVE" | "EXPIRED";
  regTxHash: string;
  itinerary?: any[];
}

export interface ExpiredTouristItem {
  touristId: string;
  name?: string;
  nationality?: string;
  safetyScore?: number;
  expiresAt: string;
  startedAt?: string;
  lastKnownLocation?: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  blockchainDetails: {
    regTxHash?: string;
    completedTxHash?: string;
    [key: string]: any;
  };
  sosAlerts: {
    status: string;
    timestamp: string;
    reason: string; // Mapped to 'type' in UI if needed, or use reason directly
    type?: string;
    location?: string;
    details?: string;
    safetyScoreAtAlert: number;
  }[];
}

export interface TouristManagementData {
  totalTourists: number;
  activeIDs: number;
  expiredIDs: number;
  averageSafetyScore: number;
  registry: TouristRegistryItem[];
}

export async function fetchExpiredTourists(
  search?: string,
): Promise<ExpiredTouristItem[]> {
  const params = new URLSearchParams();
  if (search) params.append("search", search);

  const res = await fetch(
    `${API_BASE}/api/authority/expired-tourists?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {}),
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch expired tourists: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as ExpiredTouristItem[];
  }

  throw new Error("Invalid response format");
}

export async function fetchTouristManagementData(
  status?: string,
  search?: string,
): Promise<TouristManagementData> {
  const params = new URLSearchParams();
  if (status && status !== "all") params.append("status", status);
  if (search) params.append("search", search);

  const res = await fetch(
    `${API_BASE}/api/authority/tourist-management?${params.toString()}`,
    {
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("token")
          ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
          : {}),
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch tourist management data: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as TouristManagementData;
  }

  throw new Error("Invalid response format");
}

export async function revokeTourist(id: string, reason: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/authority/revoke/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("token")
        ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
        : {}),
    },
    body: JSON.stringify({ reason }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.message || `Failed to revoke tourist: ${res.status}`);
  }
}
