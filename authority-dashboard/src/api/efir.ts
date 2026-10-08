import { API_BASE_URL } from "../config";

const API_BASE = import.meta.env.VITE_API_BASE_URL || API_BASE_URL;

export interface EFIRPayload {
  touristId: string;
  touristName: string;
  govIdHash: string;
  country: string;
  countryOfOrigin?: string;
  phoneNumber: string;
  emergencyContact: string;
  lastKnownLocation: string;
  lastSeenDate: string;
  lastSeenTime: string;
  incidentType: string;
  incidentDescription: string;
  reportingOfficer: string;
  reportingUnit: string;
  reportDate: string;
  reportTime: string;
  witnesses?: string;
  additionalInfo?: string;
}

export interface EFIRSummary {
  id: string;
  touristId: string;
  touristName: string;
  countryOfOrigin: string;
  incidentType: string;
  status: string;
  filedAt: string;
  submittedBy?: {
    authorityId?: string;
    fullName?: string;
  };
}

export interface EFIRSummariesResponse {
  success: boolean;
  count?: number;
  data?: EFIRSummary[];
  message?: string;
}

export interface EFIRResponse {
  success: boolean;
  message?: string;
  data?: {
    firNumber?: string;
    [key: string]: unknown;
  };
}

const buildHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const getEFIREndpoints = () => [
  `${API_BASE}/api/authority/efir`,
  `${API_BASE}/efir`,
];

export async function createEFIR(payload: EFIRPayload): Promise<EFIRResponse> {
  const headers = buildHeaders();
  const endpoints = getEFIREndpoints();
  let lastError = "Failed to submit E-FIR";

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (res.status === 404) {
      continue;
    }

    const json = await res.json().catch(() => ({}) as EFIRResponse);

    if (!res.ok || json.success === false) {
      lastError =
        (json as EFIRResponse).message ||
        `Failed to submit E-FIR: ${res.status}`;
      throw new Error(lastError);
    }

    return (json as EFIRResponse) || { success: true };
  }

  throw new Error(lastError);
}

export async function getEFIRSummaries(): Promise<EFIRSummary[]> {
  const headers = buildHeaders();
  const endpoints = getEFIREndpoints();
  let lastError = "Failed to fetch E-FIR summaries";

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: "GET",
      headers,
    });

    if (res.status === 404) {
      continue;
    }

    const json = (await res.json().catch(() => ({}))) as EFIRSummariesResponse;

    if (!res.ok || json.success === false) {
      lastError =
        json.message || `Failed to fetch E-FIR summaries: ${res.status}`;
      throw new Error(lastError);
    }

    return Array.isArray(json.data) ? json.data : [];
  }

  throw new Error(lastError);
}
