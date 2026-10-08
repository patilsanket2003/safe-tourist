import { API_BASE_URL } from "../config";
const API_BASE = API_BASE_URL;

export interface RecentAlert {
  id: string;
  touristId?: string;
  touristName?: string;
  location: string;
  status: string;
  timestamp: string;
  reason: string;
  priority: string;
  isNew: boolean;
}

export interface TouristOverview {
  id: string;
  name: string;
  safetyScore: number;
  status: string;
  regTxHash: string;
}

export interface Analytics {
  responseAnalysis: {
    avgTime: string;
    avgTimeMinutes: number;
    samples: number[];
  };
  unitUtilization: {
    percent: number;
    engaged: number;
    total: number;
    label: string;
  };
  incidentAnalysis: {
    severityBreakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    recentStream: {
      id: string;
      title: string;
      type: string;
      severity: string;
      time: string;
      location?: {
        lat: number;
        lng: number;
      };
    }[];
  };
  demographics: {
    mostSosFromAge: string;
    soloTravelersPercent: string;
    populationSoloPercent?: string;
    soloRiskInsight?: string;
    topGroup: string;
  };
  predictions: {
    crowdSurge: string;
    riskForecast: string;
    proactiveDeployment: string;
  };
  patterns: Record<string, string>;
}

export interface CrowdPredictionData {
  summary: string;
  targetDate: string;
  hotspots: string[];
}

export interface DashboardStats {
  activeTourists: {
    count: number;
    change: string;
  };
  sosAlertsToday: {
    count: number;
    change: string;
  };
  highRiskZones: {
    count: number;
  };
  resolvedCases: {
    count: number;
    change: string;
  };
  recentAlerts: RecentAlert[];
  touristOverview: TouristOverview[];
  analytics?: Analytics;
}

export interface MedicalProfile {
  summary: string;
  totalAtRisk: number;
  totalVulnerable: number;
  medicalBreakdown: {
    hasMedicalConditions: number;
    hasAllergies: number;
    bloodGroups: Record<string, number>;
    elderly: number;
  };
  vulnerableTourists: {
    touristId: string;
    zone: string;
    age: number;
    bloodGroup: string;
    conditions: string;
    allergies: string;
  }[];
}

export async function fetchMedicalProfiling(): Promise<MedicalProfile> {
  const res = await fetch(
    `${API_BASE}/api/authority/analytics/medical-profiling`,
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
    throw new Error(`Failed to fetch medical profiling: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as MedicalProfile;
  }

  throw new Error("Invalid response format");
}

export async function fetchCrowdPrediction(): Promise<CrowdPredictionData> {
  const res = await fetch(
    `${API_BASE}/api/authority/analytics/crowd-prediction`,
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
    throw new Error(`Failed to fetch crowd prediction: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as CrowdPredictionData;
  }

  throw new Error("Invalid response format");
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  // Assuming the route is mounted under /api/authority like other authority routes
  const res = await fetch(`${API_BASE}/api/authority/dashboard-stats`, {
    headers: {
      "Content-Type": "application/json",
      ...(localStorage.getItem("token")
        ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
        : {}),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard stats: ${res.status}`);
  }

  const json = await res.json();
  if (json.success && json.data) {
    return json.data as DashboardStats;
  }

  throw new Error("Invalid response format");
}
