export interface User {
  id: string;
  name: string;
  email: string;
  role: "police" | "tourism" | "admin";
  department: string;
}

export interface Tourist {
  id: string;
  name: string;
  govIdHash: string;
  country: string;
  phoneNumber: string;
  emergencyContact: string;
  tripValidFrom: string;
  tripValidTo: string;
  safetyScore: number;
  status: "active" | "expired" | "revoked";
  lastKnownLocation: {
    lat: number;
    lng: number;
    address: string;
    timestamp: string;
  };
  travelItinerary: string[];
}

export interface SOSAlert {
  id: string;
  alertId?: string;
  touristId: string;
  touristName: string;
  govId?: string;
  // New fields from backend
  phone?: string | null;
  age?: number | null;
  nationality?: string | null;
  gender?: string | null;
  bloodGroup?: string | null;
  medicalConditions?: string | null;
  allergies?: string | null;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  } | null;
  location: {
    lat?: number;
    lng?: number;
    coordinates?: [number, number];
    type?: string;
    address?: string;
    locationName?: string;
  };
  locationName?: string;
  emergencyType?:
    | "medical"
    | "accident"
    | "crime"
    | "lost"
    | "natural_disaster";
  severity?: "low" | "medium" | "high" | "critical";
  safetyScore?: number;
  sosReason?:
    | {
        reason: string;
        extra?: string;
      }
    | string;
  timestamp: string;
  status: "new" | "assigned" | "in_progress" | "resolved" | "responding";
  assignedUnit?: string;
  assignedBy?: string;
  assignedTo?: (
    | string
    | { authorityId: string; fullName: string; role?: string }
  )[];
  responseTime?: string | number;
  responseDate?: string;
  etaMinutes?: number;
  etaArrivalAt?: string;
  etaUpdatedAt?: string;
  etaUpdatedBy?: string;
  contactInfo?: string;
  description?: string;
  emergencyContactName?: string;
  isLoggedOnChain?: boolean;
}

export interface DashboardMetrics {
  activeTourists: number;
  sosToday: number;
  highRiskZones: number;
  expiredIds: number;
  resolvedCases: number;
  responseTime: string;
}
