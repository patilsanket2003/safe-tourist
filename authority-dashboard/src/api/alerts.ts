/*
  Alerts API client
  - fetchAlerts(): Promise<Alert[]> -- fetch current alerts via REST
  - subscribeToAlerts(callback): string -- subscribe to SSE stream; returns subscription id
  - unsubscribe(id): void -- unsubscribe the SSE or polling

  Behavior:
  - Uses VITE_API_BASE_URL env var (fallback to provided base URL).
  - Tries to open an EventSource to /api/authority/alerts/stream
  - If EventSource isn't available or fails, falls back to polling GET /api/authority/alerts

  Types are lightweight and tailored for the frontend consumption.
*/

import { API_BASE_URL } from "../config";
const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

import {
  getAuthoritySocket,
  onAuthorityEvent,
  offAuthorityEvent,
} from "../utils/socketClient";

export type Alert = {
  id: string;
  touristId?: string;
  status?: string;
  location?: any;
  safetyScore?: number;
  sosReason?: any;
  emergencyContact?: any;
  timestamp?: string;
  isLoggedOnChain?: boolean;
  blockchainTxHash?: string;
};

type Subscriber = {
  id: string;
  callback: (alerts: Alert[]) => void;
};

let subscribers: Subscriber[] = [];
let pollingTimer: number | null = null;
const POLL_INTERVAL = Number(import.meta.env.VITE_SOS_POLL_INTERVAL) || 5000;

// handler reference for socket listener so we can remove it when unsubscribing
let socketHandler: ((data: any) => void) | null = null;

export async function fetchAlerts(): Promise<Alert[]> {
  // Include auth token when available (backend likely requires auth)
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const fetchOptions: RequestInit = { headers };
  // If your backend uses cookie-based sessions, enable credentials: 'include'
  if (import.meta.env.VITE_API_USE_COOKIES === "true") {
    // @ts-ignore
    fetchOptions.credentials = "include";
  }

  const res = await fetch(`${API_BASE}/api/authority/alerts`, fetchOptions);
  if (!res.ok) {
    let body: any = null;
    try {
      body = await res.json();
    } catch (e) {
      // ignore JSON parse errors
    }
    const msg =
      body && body.message
        ? body.message
        : `Failed to fetch alerts: ${res.status}`;
    throw new Error(msg);
  }
  const data = await res.json();
  // backend may return { success: true, count: N, alerts: [ ... ] }
  if (data && Array.isArray(data)) return data as Alert[];
  if (data && Array.isArray(data.alerts)) return data.alerts as Alert[];
  // if the API returned a single object or unexpected format, try to normalize
  if (data && typeof data === "object") {
    // attempt to find array-like property
    const possible = data.alerts || data.data || data.items;
    if (Array.isArray(possible)) return possible as Alert[];
  }
  // fallback: return empty array
  return [];
}

export async function fetchRespondingAlerts(): Promise<Alert[]> {
  const token =
    typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/authority/alerts/responding`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch responding alerts: ${res.status}`);
  }
  const data = await res.json();
  if (data && Array.isArray(data.alerts)) return data.alerts as Alert[];
  if (data && Array.isArray(data)) return data as Alert[];
  return [];
}

export async function assignUnit(
  alertId: string,
  payload?: {
    unit?: string;
    responseTime?: string | number;
    etaMinutes?: number;
    etaArrivalAt?: string;
  },
): Promise<Alert> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE}/api/authority/alerts/${alertId}/assign`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(payload || {}),
    },
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || `Failed to assign unit: ${res.status}`);
  }
  return data.data || data;
}

export async function resolveAlertApi(alertId: string): Promise<Alert> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${API_BASE}/api/authority/alerts/${alertId}/resolve`,
    {
      method: "PUT",
      headers,
    },
  );

  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Failed to resolve alert: ${res.status}`);
  }
  return data.data || data;
}

function notifyAll(alerts: Alert[]) {
  subscribers.forEach((s) => {
    try {
      s.callback(alerts);
    } catch (e) {
      // swallow callback errors
      // eslint-disable-next-line no-console
      console.error("alerts subscriber callback error", e);
    }
  });
}

function startPolling() {
  if (pollingTimer) return;
  const run = async () => {
    try {
      const alerts = await fetchAlerts();
      notifyAll(alerts);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Polling alerts failed", e);
    }
  };
  run();
  pollingTimer = window.setInterval(run, POLL_INTERVAL) as unknown as number;
}

function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
  }
}

// No SSE: use polling-only subscription to backend GET /api/authority/alerts

export function subscribeToAlerts(callback: (alerts: Alert[]) => void): string {
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  subscribers.push({ id, callback });

  // Start socket listener when first subscriber registers; fall back to polling
  if (subscribers.length === 1) {
    // Attach socket listener for newSOSAlert
    socketHandler = (alertData: any) => {
      console.log("[alerts] ✅ Received newSOSAlert event via socket");
      console.log("[alerts] Raw payload:", JSON.stringify(alertData, null, 2));

      // If we receive a socket event, we know the socket is working.
      // We can stop polling if it's currently active.
      if (pollingTimer) {
        console.log("[alerts] Socket active, stopping polling fallback");
        stopPolling();
      }

      try {
        // Backend socket now sends complete data:
        // { alertId, touristId, touristName, emergencyContact, location, timestamp, safetyScore, sosReason, status }
        // Just map alertId to standard ID fields for compatibility

        const normalized = Array.isArray(alertData) ? alertData : [alertData];

        // Backend now provides complete data - just map IDs and ensure tourist object
        const enriched = normalized.map((item: any) => ({
          ...item,
          // Map alertId to standard ID fields
          _id: item.alertId || item._id || item.id,
          id: item.alertId || item.id || item._id,
          alertId: item.alertId || item.id || item._id,
          // Ensure tourist object exists for compatibility
          tourist: item.tourist || {
            id: item.touristId,
            name: item.touristName,
          },
        }));

        console.log(
          "[alerts] Enriched payload:",
          JSON.stringify(enriched, null, 2),
        );
        console.log(
          "[alerts] 📤 Notifying",
          subscribers.length,
          "subscriber(s)",
        );
        notifyAll(enriched as Alert[]);
      } catch (e) {
        console.error("[alerts] ❌ Error handling socket alert:", e);
      }
    };

    console.log("[alerts] Attaching socket handler for 'newSOSAlert' event");
    // We *always* try to attach the handler.
    // The previous check `if (sock)` was causing the race condition because
    // on login sock might be null for a fraction of a second.
    onAuthorityEvent("newSOSAlert", socketHandler!);

    const sock = getAuthoritySocket();
    if (sock) {
      console.log("[alerts] ✅ Socket is available for listening");
      console.log("[alerts] Socket connected:", sock.connected);
      console.log("[alerts] Socket ID:", sock.id);
    } else {
      console.log(
        "[alerts] ⚠️ Socket not immediately available, starting polling fallback",
      );
      startPolling();
    }
  }

  return id;
}

export function unsubscribe(id: string) {
  subscribers = subscribers.filter((s) => s.id !== id);
  if (subscribers.length === 0) {
    // no subscribers left: close SSE / stop polling
    // stop polling
    stopPolling();
    // remove socket listener if present (currently commented out)
    if (socketHandler) {
      console.log("[alerts] Removing socket handler (if it was attached)");
      offAuthorityEvent("newSOSAlert", socketHandler);
      socketHandler = null;
    }
  }
}

export async function fetchPendingAlerts(): Promise<Alert[]> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const parseAlerts = (data: any): Alert[] => {
    if (data && Array.isArray(data.alerts)) return data.alerts as Alert[];
    if (data && Array.isArray(data)) return data as Alert[];
    if (data && data.alert) return [data.alert] as Alert[];
    return [];
  };

  try {
    const pendingRes = await fetch(`${API_BASE}/api/authority/alerts/pending`, {
      headers,
    });

    if (pendingRes.ok) {
      const pendingData = await pendingRes.json();
      return parseAlerts(pendingData);
    }

    // Backward-compatible fallback: some deployments expose only /alerts.
    if (pendingRes.status === 404) {
      const fallbackRes = await fetch(`${API_BASE}/api/authority/alerts`, {
        headers,
      });
      if (!fallbackRes.ok) {
        console.warn(`Pending alerts fallback failed: ${fallbackRes.status}`);
        return [];
      }
      const fallbackData = await fallbackRes.json();
      const alerts = parseAlerts(fallbackData);
      return alerts.filter((a) => {
        const status = String(a.status || "").toLowerCase();
        return status === "new" || status === "pending" || status === "";
      });
    }

    console.warn(`Failed to fetch pending alerts: ${pendingRes.status}`);
    return [];
  } catch (error) {
    console.info("[fetchPendingAlerts] Network error (non-critical):", error);
    return [];
  }
}

export default {
  fetchAlerts,
  fetchRespondingAlerts,
  assignUnit,
  resolveAlertApi,
  fetchPendingAlerts,
  subscribeToAlerts,
  unsubscribe,
};
