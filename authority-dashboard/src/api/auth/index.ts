/*
  Auth API client
  - Separate base URL for auth-related endpoints (do not mix with other API endpoints)
  - Exports: signup, login, getCurrentUser
*/

import type { User } from "../../types";
import { API_BASE_URL } from "../../config";

const AUTH_BASE = import.meta.env.VITE_AUTH_API_BASE_URL || API_BASE_URL;

export type SignupPayload = {
  username: string;
  email: string;
  password: string;
  fullName: string;
  authorityId: string;
  role:
    | "Police Officer"
    | "Tourism Officer"
    | "Emergency Responder"
    | "System Administrator";
};

export type AuthResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: User | undefined;
  error?: string;
};

export type VerifyTouristRecordResponse = {
  verified: boolean;
  touristId: string;
  payloadHashUsed?: string;
  payloadHashRecomputed?: string;
  regHashInDb?: string;
  hashesMatchInDb?: boolean;
  recomputeVariantUsed?: string;
  blockchain?: {
    eventId?: string;
    regTxHash?: string;
    contractAddressChecked?: string;
    contractAddressFromTx?: string;
  };
  message?: string;
  error?: string;
};

function mapBackendUser(backendUser: any): User | undefined {
  if (!backendUser || typeof backendUser !== "object") {
    return undefined;
  }

  const rawRole =
    typeof backendUser.role === "string" ? backendUser.role.toLowerCase() : "";

  const mappedRole: User["role"] = rawRole.includes("police")
    ? "police"
    : rawRole.includes("tourism")
      ? "tourism"
      : "admin";

  return {
    id: String(backendUser.id || backendUser._id || ""),
    name:
      backendUser.fullName || backendUser.username || backendUser.name || "",
    email: backendUser.email || "",
    role: mappedRole,
    department: backendUser.authorityId || backendUser.department || "",
  };
}

// Fetch the current authenticated user using token/cookie auth
export async function getCurrentUser(): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = `${AUTH_BASE}/api/auth/me`;
    console.debug("getCurrentUser: fetching", url);
    const token = localStorage.getItem("token");
    const headers: HeadersInit = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn("getCurrentUser: server responded not ok", res.status, data);
      return {
        success: false,
        message:
          data?.message || data?.error || `Auth check failed: ${res.status}`,
        error: data?.error,
      };
    }

    return { success: true, user: mapBackendUser(data?.user) } as AuthResponse;
  } catch (err: any) {
    if (err?.name === "AbortError") {
      console.error("getCurrentUser: request timed out");
      return { success: false, message: "Auth request timed out" };
    }
    console.error("getCurrentUser: fetch error", err);
    return { success: false, message: err?.message || "Network error" };
  } finally {
    clearTimeout(timeout);
  }
}

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: data?.message || data?.error || `Signup failed: ${res.status}`,
      error: data?.error,
    };
  }
  return {
    success: true,
    ...data,
    user: mapBackendUser(data?.user),
  } as AuthResponse;
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await fetch(`${AUTH_BASE}/api/auth/login-authority`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      success: false,
      message: data?.message || data?.error || `Login failed: ${res.status}`,
      error: data?.error,
    };
  }
  return {
    success: true,
    ...data,
    user: mapBackendUser(data?.user),
  } as AuthResponse;
}

export async function verifyTouristRecord(
  touristId: string,
): Promise<VerifyTouristRecordResponse> {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${AUTH_BASE}/api/auth/verify/${encodeURIComponent(touristId)}`,
    {
      method: "GET",
      headers,
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.message || data?.error || `Verification failed: ${res.status}`,
    );
  }

  return data as VerifyTouristRecordResponse;
}
