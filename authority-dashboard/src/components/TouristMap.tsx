import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Map, {
  Source,
  Layer,
  Popup,
  NavigationControl,
  FullscreenControl,
  ScaleControl,
  GeolocateControl,
} from "react-map-gl/maplibre";
// Import MapRef as a type
import type { MapRef } from "react-map-gl/maplibre";
import type { GeoJSONSource } from "maplibre-gl";
import {
  RefreshCw,
  Plus,
  AlertTriangle,
  Layers,
  X,
  MapPin,
  Wifi,
  WifiOff,
  Trash2,
  Search,
  Shield,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import * as maplibregl from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

// Ensure MapLibre Web Worker is loaded via Vite bundled worker
if (typeof window !== "undefined") {
  try {
    (maplibregl as any).setWorkerUrl?.(maplibreWorkerUrl);
  } catch (e) {
    console.warn("Failed to set MapLibre workerUrl:", e);
  }
}

import {
  fetchMapOverview,
  MapOverviewResponse,
  fetchStyledZones,
  StyledZonesResponse,
  DangerZone,
  RiskGrid,
  fetchLatestSafetyUsers,
  createDangerZone,
  deleteDangerZone,
} from "../api/map";
import {
  onAuthorityEvent,
  offAuthorityEvent,
  getAuthoritySocket,
  createAuthoritySocket,
} from "../utils/socketClient";
import { useToast } from "../components/ToastProvider";
import { fetchPendingAlerts } from "../api/alerts";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN || "").trim();

const EFFECTIVE_TOKEN =
  MAPBOX_TOKEN && MAPBOX_TOKEN.startsWith("pk.")
    ? MAPBOX_TOKEN
    : "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M29iazA2Z2gycXA4N2pmbDZmangifQ.-g_vE53SD2WrJ6tFX7QHmA";

const CARTO_RASTER_STYLE = {
  version: 8 as const,
  sources: {
    "carto-raster-tiles": {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-raster-layer",
      type: "raster" as const,
      source: "carto-raster-tiles",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

const DEFAULT_MAP_STYLE = CARTO_RASTER_STYLE;

const getCircleCoordinates = (
  lat: number,
  lng: number,
  radiusKm: number,
  points = 64,
) => {
  const coordinates = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i++) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coordinates.push([lng + x, lat + y]);
  }
  coordinates.push(coordinates[0]); // Close loop
  return [coordinates];
};

// Pattern overlays are intentionally disabled because Mapbox GL JS does not
// support SVG in loadImage, and unsupported pattern assets break rendering logs.
const ENABLE_PATTERN_OVERLAYS = false;
const COLOCATED_COORD_TOLERANCE = 0.00005;

type LayerVisibility = {
  sos: boolean;
  incidents: boolean;
  zones: boolean;
  militaryZones: boolean;
  activeTourists: boolean;
  inactiveTourists: boolean;
};

export const isMilitaryZone = (zone: any): boolean => {
  if (!zone) return false;
  const text = [
    zone.name,
    zone.category,
    zone.source,
    zone.visualStyle?.zoneType,
    zone.raw?.Category,
    zone.raw?.Source,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("military") ||
    text.includes("airbase") ||
    text.includes("air force") ||
    text.includes("cantonment") ||
    text.includes("airstrip") ||
    text.includes("army") ||
    text.includes("navy") ||
    text.includes("naval") ||
    text.includes("defense") ||
    text.includes("defence") ||
    text.includes("siachen") ||
    text.includes("daulat beg") ||
    text.includes("point 5353")
  );
};

type DangerZoneFormState = {
  name: string;
  type: "circle";
  lat: string;
  lng: string;
  radiusKm: string;
  riskLevel: string;
  category: string;
  state: string;
  source: string;
};

const TouristMap: React.FC = () => {
  const { showToast } = useToast();
  const [data, setData] = useState<MapOverviewResponse | null>(null);
  const [styledZones, setStyledZones] = useState<StyledZonesResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<{
    id: string;
    type: "tourist" | "zone" | "alert" | "incident" | "danger" | "risk_grid";
  } | null>(null);
  const [coLocatedTouristIds, setCoLocatedTouristIds] = useState<string[]>([]);

  const [isConnected, setIsConnected] = useState(false);

  const [layers, setLayers] = useState<LayerVisibility>({
    sos: false,
    incidents: false,
    zones: false,
    militaryZones: false,
    activeTourists: true,
    inactiveTourists: false,
  });

  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [isManageZonesOpen, setIsManageZonesOpen] = useState(false);
  const [isDeletingZoneId, setIsDeletingZoneId] = useState<string | null>(null);
  const [confirmingZoneId, setConfirmingZoneId] = useState<string | null>(null);
  const [zoneSearchQuery, setZoneSearchQuery] = useState("");
  const [zoneTypeFilter, setZoneTypeFilter] = useState<"all" | "civilian" | "military">("all");
  const [isSubmittingZone, setIsSubmittingZone] = useState(false);
  const [addZoneError, setAddZoneError] = useState<string | null>(null);
  const [dangerZoneForm, setDangerZoneForm] = useState<DangerZoneFormState>({
    name: "",
    type: "circle",
    lat: "",
    lng: "",
    radiusKm: "1.2",
    riskLevel: "High",
    category: "",
    state: "",
    source: "Authority Manual Entry",
  });

  const mapRef = useRef<MapRef>(null);
  const prevConnectionRef = useRef<boolean>(false);
  const hasAutoFitTouristsRef = useRef<boolean>(false);
  const [isMapReady, setIsMapReady] = useState(false);

  const onMapLoad = useCallback(() => {
    setIsMapReady(true);
  }, []);


  const mergeSafetyUsers = useCallback(
    (
      mapResult: MapOverviewResponse,
      safetyUsers: Array<{
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
        safetyScore: number;
      }>,
    ): MapOverviewResponse => {
      const baseTourists = mapResult?.mapData?.tourists || [];
      const existingById = new globalThis.Map(
        baseTourists.map((tourist) => [tourist.id, tourist]),
      );

      const updatedBySafety = new globalThis.Map<string, any>();

      (safetyUsers || []).forEach((row) => {
        const existing = existingById.get(row.userId);
        updatedBySafety.set(row.userId, {
          id: row.userId,
          name: existing?.name || row.touristName || row.userId,
          mobileNumber: row.mobileNumber ?? existing?.mobileNumber,
          role: row.role ?? existing?.role,
          groupId: row.groupId ?? existing?.groupId,
          emergencyContact: row.emergencyContact ?? existing?.emergencyContact,
          dayWiseItinerary: row.dayWiseItinerary ?? existing?.dayWiseItinerary,
          status: existing?.status || ("active" as const),
          safetyScore: row.safetyScore ?? existing?.safetyScore ?? 0,
          location: {
            lat: row.location?.lat ?? 19.2714,
            lng: row.location?.lng ?? 72.9691,
          },
          type: "tourist" as const,
        });
      });

      // Preserve existing map-overview tourists if they are not present
      // in safety latest feed, and overwrite with safety feed where available.
      const mergedTourists = baseTourists
        .map((tourist) => updatedBySafety.get(tourist.id) || tourist)
        .concat(
          Array.from(updatedBySafety.values()).filter(
            (tourist) =>
              !baseTourists.some(
                (existingTourist) => existingTourist.id === tourist.id,
              ),
          ),
        );

      return {
        ...mapResult,
        mapData: {
          ...mapResult?.mapData,
          tourists: mergedTourists,
          zones: mapResult?.mapData?.zones || [],
          activeAlerts: mapResult?.mapData?.activeAlerts || [],
          riskGrids: mapResult?.mapData?.riskGrids || [],
          incidents: mapResult?.mapData?.incidents || [],
        },
      };
    },
    [],
  );

  const fetchData = async () => {
    setLoading(true);
    try {
      const emptyMapResult: MapOverviewResponse = {
        stats: {
          totalTourists: 0,
          activeAlerts: 0,
          highRiskZones: 0,
          responseUnits: 0,
        },
        mapData: {
          tourists: [],
          zones: [],
          activeAlerts: [],
          riskGrids: [],
          incidents: [],
        },
      };

      const [mapResult, zonesResult, latestUsers] = await Promise.all([
        fetchMapOverview().catch((e) => {
          console.warn("[Map] fetchMapOverview failed, using empty:", e);
          return emptyMapResult;
        }),
        fetchStyledZones().catch((e) => {
          console.warn("[Map] fetchStyledZones failed:", e);
          return null;
        }),
        fetchLatestSafetyUsers().catch((e) => {
          console.warn("[Map] fetchLatestSafetyUsers failed:", e);
          return [] as Awaited<ReturnType<typeof fetchLatestSafetyUsers>>;
        }),
      ]);

      const baseTourists = mapResult?.mapData?.tourists || [];
      console.log(
        "[Map] Source counts:",
        "mapOverviewTourists=",
        baseTourists.length,
        "latestSafetyUsers=",
        (latestUsers || []).length,
      );
      const mergedMapResult =
        (latestUsers || []).length > 0
          ? mergeSafetyUsers(mapResult, latestUsers)
          : mapResult;
      const finalTourists = mergedMapResult?.mapData?.tourists || [];
      console.log(
        "[Map] Render tourists count:",
        finalTourists.length,
      );
      setData(mergedMapResult);
      if (zonesResult) setStyledZones(zonesResult);
    } catch (e) {
      console.error("Failed to load map data", e);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch and process pending alerts
  const fetchAndProcessPendingAlerts = async () => {
    try {
      console.log("🔄 [Map] Fetching pending alerts...");
      const pendingAlerts = await fetchPendingAlerts();

      if (pendingAlerts.length > 0) {
        console.log(`📥 [Map] Found ${pendingAlerts.length} pending alert(s)`);
        showToast(`📥 Syncing ${pendingAlerts.length} missed alert(s)`, "info");

        // Process each pending alert
        pendingAlerts.forEach((alertData: any) => {
          const locationName =
            alertData.location?.locationName || "Unknown Location";

          setData((prevData) => {
            if (!prevData) return null;

            // Check for duplicate
            if (
              prevData.mapData.activeAlerts.some(
                (a) => a.id === (alertData.id || alertData.alertId),
              )
            )
              return prevData;

            const newAlert = {
              id: alertData.id || alertData.alertId,
              type: "alert" as const,
              status: "active",
              priority: (alertData.severity || "high") as
                | "critical"
                | "high"
                | "medium",
              location: {
                lat:
                  alertData.location?.coordinates?.[1] ||
                  alertData.location?.lat,
                lng:
                  alertData.location?.coordinates?.[0] ||
                  alertData.location?.lng,
              },
              locationName: locationName,
              timestamp: alertData.timestamp,
            };

            return {
              ...prevData,
              mapData: {
                ...prevData.mapData,
                activeAlerts: [newAlert, ...prevData.mapData.activeAlerts],
              },
              stats: {
                ...prevData.stats,
                activeAlerts: prevData.stats.activeAlerts + 1,
              },
            };
          });
        });
      } else {
        console.log("✅ [Map] No pending alerts");
      }
    } catch (error) {
      console.error("❌ [Map] Failed to fetch pending alerts:", error);
    }
  };

  useEffect(() => {
    fetchData();

    const refreshSafetyUsers = async () => {
      try {
        const latestUsers = await fetchLatestSafetyUsers();
        console.log("[Map] Safety poll: latestUsers =", latestUsers.length);
        if (!latestUsers.length) return;

        setData((prev) => {
          const base: MapOverviewResponse = prev ?? {
            stats: {
              totalTourists: 0,
              activeAlerts: 0,
              highRiskZones: 0,
              responseUnits: 0,
            },
            mapData: {
              tourists: [],
              zones: [],
              activeAlerts: [],
              riskGrids: [],
              incidents: [],
            },
          };
          const merged = mergeSafetyUsers(base, latestUsers);
          console.log(
            "[Map] Safety merge: tourists =",
            merged.mapData.tourists.length,
          );
          return merged;
        });
      } catch (error) {
        console.warn("Failed to refresh safety latest users", error);
      }
    };

    // Immediately re-poll safety users after 3s in case the app emits its first
    // GPS point slightly after the dashboard finishes its initial load.
    const earlyPollTimer = setTimeout(() => {
      console.info("[Map] Early safety re-poll (3s after load)...");
      refreshSafetyUsers();
    }, 3000);

    const safetyPollingInterval = setInterval(refreshSafetyUsers, 10000); // 10s poll

    // Socket Connection Status
    const checkConnection = () => {
      let socket = getAuthoritySocket();
      if (!socket || !socket.connected) {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            const uid = payload.id || payload.userId || "authority-admin";
            socket = createAuthoritySocket(uid);
          } catch (e) {}
        }
      }
      const currentlyConnected = socket?.connected || false;

      // Detect reconnection: was disconnected, now connected
      if (!prevConnectionRef.current && currentlyConnected) {
        console.log(
          "🔌 [Map] Connection re-established! Fetching pending alerts...",
        );
        fetchAndProcessPendingAlerts();
      }

      prevConnectionRef.current = currentlyConnected;
      setIsConnected(currentlyConnected);
    };

    // Initial check
    checkConnection();
    const interval = setInterval(checkConnection, 2000); // Poll status every 2s

    // Real-time SOS Listener
    const handleNewSOSAlert = (alertData: any) => {
      console.log("🆘 [Map] New SOS Alert received:", alertData);

      // 1. Toast Notification
      const locationName =
        alertData.location?.locationName || "Unknown Location";
      showToast(`🆘 New SOS Alert! - ${locationName}`, "error");

      // 2. Update Map Data
      setData((prevData) => {
        if (!prevData) return null;

        // Check for duplicate
        if (
          prevData.mapData.activeAlerts.some((a) => a.id === alertData.alertId)
        )
          return prevData;

        const newAlert = {
          id: alertData.alertId,
          type: "alert" as const, // Added this line to fix type error
          status: "active",
          priority: (alertData.severity || "high") as
            | "critical"
            | "high"
            | "medium",
          location: {
            lat: alertData.location.coordinates[1],
            lng: alertData.location.coordinates[0],
          },
          locationName: alertData.location.locationName || "Unknown",
          timestamp: alertData.timestamp,
        };

        return {
          ...prevData,
          mapData: {
            ...prevData.mapData,
            activeAlerts: [newAlert, ...prevData.mapData.activeAlerts],
            // Increment stats
          },
          stats: {
            ...prevData.stats,
            activeAlerts: prevData.stats.activeAlerts + 1,
          },
        };
      });
    };

    onAuthorityEvent("newSOSAlert", handleNewSOSAlert);

    // Real-time Risk Grid Update Listener
    const handleRiskGridUpdate = (gridData: any) => {
      console.log("📍 [Map] Risk Grid Updated:", gridData);

      showToast(
        `📍 Risk Grid updated: ${gridData.gridName || gridData.gridId}`,
        "warning",
      );

      setStyledZones((prevZones) => {
        if (!prevZones) return null;

        const existingIndex = prevZones.riskGrids.findIndex(
          (g) => g.gridId === gridData.gridId,
        );

        if (existingIndex !== -1) {
          // Update existing grid
          const updatedGrids = [...prevZones.riskGrids];
          updatedGrids[existingIndex] = {
            ...updatedGrids[existingIndex],
            riskLevel: gridData.riskLevel,
            riskScore: gridData.riskScore,
            lastUpdated: gridData.lastUpdated,
            gridName: gridData.gridName || updatedGrids[existingIndex].gridName,
          };

          return {
            ...prevZones,
            riskGrids: updatedGrids,
          };
        } else {
          // Add new grid with default visual style
          const newGrid: RiskGrid = {
            _id: gridData.gridId,
            gridId: gridData.gridId,
            gridName: gridData.gridName || `Grid ${gridData.gridId}`,
            location: gridData.location,
            riskScore: gridData.riskScore,
            riskLevel: gridData.riskLevel,
            lastUpdated: gridData.lastUpdated,
            reasons: [],
            visualStyle: {
              zoneType: "risk_grid",
              borderStyle: "dashed",
              borderWidth: 2,
              fillOpacity: 0.4,
              fillPattern: "dots",
              iconType: "incident-marker",
              renderPriority: 2,
              gridSize: 2000,
            },
          };

          return {
            ...prevZones,
            riskGrids: [newGrid, ...prevZones.riskGrids],
          };
        }
      });
    };

    // Real-time Incident Reported Listener
    const handleIncidentReported = (incidentData: any) => {
      console.log("⚠️ [Map] Incident Reported:", incidentData);

      showToast(`⚠️ New Incident: ${incidentData.title}`, "warning");

      setData((prevData) => {
        if (!prevData) return null;

        // Check for duplicate
        if (prevData.mapData.incidents.some((i) => i.id === incidentData.id))
          return prevData;

        const newIncident = {
          id: incidentData.id,
          title: incidentData.title,
          type: "incident" as const,
          category: incidentData.type || "other",
          location: {
            lat: incidentData.location.lat,
            lng: incidentData.location.lng,
          },
        };

        return {
          ...prevData,
          mapData: {
            ...prevData.mapData,
            incidents: [newIncident, ...prevData.mapData.incidents],
          },
        };
      });
    };

    // Real-time Tourist Location Update Listener
    const handleLocationUpdate = (locationData: any) => {
      const touristId = String(
        locationData?.touristId || locationData?.userId || "",
      );
      const lat = Number(
        locationData?.location?.lat ??
          locationData?.location?.latitude ??
          locationData?.lat ??
          locationData?.latitude,
      );
      const lng = Number(
        locationData?.location?.lng ??
          locationData?.location?.longitude ??
          locationData?.lng ??
          locationData?.longitude,
      );

      if (!touristId || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      setData((prevData) => {
        const base: MapOverviewResponse = prevData ?? {
          stats: {
            totalTourists: 0,
            activeAlerts: 0,
            highRiskZones: 0,
            responseUnits: 0,
          },
          mapData: {
            tourists: [],
            zones: [],
            activeAlerts: [],
            riskGrids: [],
            incidents: [],
          },
        };

        let found = false;
        const updatedTourists = base.mapData.tourists.map((tourist) => {
          if (String(tourist.id) !== touristId) {
            return tourist;
          }

          found = true;
          return {
            ...tourist,
            location: { lat, lng },
            safetyScore:
              Number(locationData?.safetyScore) || tourist.safetyScore || 0,
            status: "active" as const,
          };
        });

        if (!found) {
          updatedTourists.push({
            id: touristId,
            name: touristId,
            status: "active",
            safetyScore: Number(locationData?.safetyScore) || 0,
            location: { lat, lng },
            type: "tourist",
          });
        }

        const activeCount = updatedTourists.filter((t) => t.status === "active").length;
        const inactiveCount = updatedTourists.filter((t) => t.status !== "active").length;

        return {
          ...base,
          stats: {
            ...base.stats,
            totalTourists: Math.max(
              base.stats.totalTourists,
              updatedTourists.length,
            ),
            activeTourists: activeCount,
            inactiveTourists: inactiveCount,
          },
          mapData: {
            ...base.mapData,
            tourists: updatedTourists,
          },
        };
      });
    };

    // Real-time Tourist Online / Offline Status Changed Listener
    const handleTouristStatusChanged = (statusData: any) => {
      const touristId = String(statusData?.touristId || statusData?.id || "");
      if (!touristId) return;
      console.log("🔄 [Map] Tourist status changed:", touristId, statusData.status);

      setData((prev) => {
        if (!prev) return prev;
        const updatedTourists = prev.mapData.tourists.map((t) => {
          if (String(t.id) === touristId) {
            return {
              ...t,
              status: (statusData.status === "active" ? "active" : "inactive") as any,
              isOnline: Boolean(statusData.isOnline),
              location: statusData.location || t.location,
            };
          }
          return t;
        });

        const activeCount = updatedTourists.filter((t) => t.status === "active").length;
        const inactiveCount = updatedTourists.filter((t) => t.status !== "active").length;

        return {
          ...prev,
          stats: {
            ...prev.stats,
            activeTourists: activeCount,
            inactiveTourists: inactiveCount,
          },
          mapData: {
            ...prev.mapData,
            tourists: updatedTourists,
          },
        };
      });
    };

    // Real-time Danger Zone Added Listener
    const handleDangerZoneAdded = (zoneData: any) => {
      console.log("🚨 [Map] Danger Zone Added:", zoneData);

      showToast(`🚨 New Danger Zone: ${zoneData.name}`, "error");

      setStyledZones((prevZones) => {
        if (!prevZones) return null;

        // Check for duplicate
        if (prevZones.dangerZones.some((z) => z._id === zoneData.id))
          return prevZones;

        const newDangerZone: DangerZone = {
          _id: zoneData.id,
          name: zoneData.name,
          type: zoneData.shape || "circle",
          coords: zoneData.coordinates,
          radiusKm: zoneData.radius ? zoneData.radius / 1000 : undefined,
          riskLevel: zoneData.riskLevel,
          visualStyle: {
            zoneType: "danger_zone",
            borderStyle: "solid",
            borderWidth: 3,
            fillOpacity: 0.25,
            fillPattern: "diagonal-stripes",
            iconType: "warning-triangle",
            renderPriority: 1,
          },
        };

        return {
          ...prevZones,
          dangerZones: [newDangerZone, ...prevZones.dangerZones],
        };
      });
    };

    // Real-time Danger Zone Removed Listener
    const handleDangerZoneRemoved = (zoneData: any) => {
      const removedId = zoneData?.id || zoneData?._id || zoneData;
      console.log("🗑️ [Map] Danger Zone Removed:", removedId);
      showToast(`🗑️ Danger zone removed: ${zoneData?.name || removedId}`, "info");

      setStyledZones((prevZones) => {
        if (!prevZones) return null;
        return {
          ...prevZones,
          dangerZones: prevZones.dangerZones.filter(
            (z) => z._id !== removedId && (z as any).id !== removedId
          ),
        };
      });

      setSelectedEntity((prev) => {
        if (prev?.id === removedId) return null;
        return prev;
      });
    };

    onAuthorityEvent("riskGridUpdated", handleRiskGridUpdate);
    onAuthorityEvent("incidentReported", handleIncidentReported);
    onAuthorityEvent("dangerZoneAdded", handleDangerZoneAdded);
    onAuthorityEvent("dangerZoneRemoved", handleDangerZoneRemoved);
    onAuthorityEvent("locationUpdate", handleLocationUpdate);
    onAuthorityEvent("touristStatusChanged", handleTouristStatusChanged);

    return () => {
      clearTimeout(earlyPollTimer);
      clearInterval(interval);
      clearInterval(safetyPollingInterval);
      offAuthorityEvent("newSOSAlert", handleNewSOSAlert);
      offAuthorityEvent("riskGridUpdated", handleRiskGridUpdate);
      offAuthorityEvent("incidentReported", handleIncidentReported);
      offAuthorityEvent("dangerZoneAdded", handleDangerZoneAdded);
      offAuthorityEvent("dangerZoneRemoved", handleDangerZoneRemoved);
      offAuthorityEvent("locationUpdate", handleLocationUpdate);
      offAuthorityEvent("touristStatusChanged", handleTouristStatusChanged);
    };
  }, [mergeSafetyUsers]);

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDangerZoneInputChange = (
    key: keyof DangerZoneFormState,
    value: string,
  ) => {
    setDangerZoneForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetDangerZoneForm = () => {
    setDangerZoneForm({
      name: "",
      type: "circle",
      lat: "",
      lng: "",
      radiusKm: "1.2",
      riskLevel: "High",
      category: "",
      state: "",
      source: "Authority Manual Entry",
    });
    setAddZoneError(null);
  };

  const handleCreateDangerZone = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddZoneError(null);

    const lat = Number(dangerZoneForm.lat);
    const lng = Number(dangerZoneForm.lng);
    const radiusKm = Number(dangerZoneForm.radiusKm);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setAddZoneError("Latitude and Longitude must be valid numbers.");
      return;
    }

    if (!Number.isFinite(radiusKm) || radiusKm <= 0) {
      setAddZoneError("Radius (km) must be a number greater than 0.");
      return;
    }

    try {
      setIsSubmittingZone(true);
      await createDangerZone({
        name: dangerZoneForm.name.trim(),
        type: "circle",
        coords: [lat, lng],
        radiusKm,
        riskLevel: dangerZoneForm.riskLevel.trim(),
        category: dangerZoneForm.category.trim(),
        state: dangerZoneForm.state.trim(),
        source: dangerZoneForm.source.trim(),
      });

      showToast(`🚨 Danger zone created: ${dangerZoneForm.name}`, "success");
      setIsAddZoneOpen(false);
      resetDangerZoneForm();
      await fetchData();
    } catch (error: any) {
      setAddZoneError(error?.message || "Failed to create danger zone.");
    } finally {
      setIsSubmittingZone(false);
    }
  };

  const handleDeleteDangerZone = async (
    zoneId: string,
    zoneName?: string,
  ) => {
    const displayName = zoneName || zoneId;
    setIsDeletingZoneId(zoneId);
    setConfirmingZoneId(null);
    try {
      await deleteDangerZone(zoneId);
      showToast(`🗑️ Danger zone "${displayName}" removed successfully`, "success");

      setStyledZones((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dangerZones: prev.dangerZones.filter(
            (z) => z._id !== zoneId && (z as any).id !== zoneId,
          ),
        };
      });

      setSelectedEntity((prev) => {
        if (prev?.id === zoneId) return null;
        return prev;
      });
    } catch (err: any) {
      console.error("Failed to delete danger zone:", err);
      showToast(err.message || "Failed to remove danger zone", "error");
    } finally {
      setIsDeletingZoneId(null);
    }
  };

  const handleFlyToZone = (zone: DangerZone) => {
    if (!mapRef.current) return;
    const coords = zone.coords;
    if (coords && coords.length === 2) {
      mapRef.current.flyTo({
        center: [coords[1], coords[0]],
        zoom: 14,
        essential: true,
      });
      setSelectedEntity({ id: zone._id || (zone as any).id, type: "danger" });
      setIsManageZonesOpen(false);
    }
  };

  // -- GeoJSON Transformations --

  const EMPTY_FC = useMemo(
    () => ({ type: "FeatureCollection" as const, features: [] as any[] }),
    [],
  );

  const touristSource = useMemo(() => {
    if (!data?.mapData?.tourists || !Array.isArray(data.mapData.tourists)) return EMPTY_FC;
    const validTourists = data.mapData.tourists.filter((tourist) => {
      const lat = Number(tourist?.location?.lat);
      const lng = Number(tourist?.location?.lng);
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        !(lat === 0 && lng === 0) &&
        !(Math.abs(lat - 19.0760) < 0.001 && Math.abs(lng - 72.8777) < 0.001) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });
    return {
      type: "FeatureCollection" as const,
      features: validTourists.map((t) => ({
        type: "Feature",
        properties: {
          id: t.id,
          type: "tourist",
          status: t.status,
          name: t.name,
          safetyScore: t.safetyScore,
        },
        geometry: {
          type: "Point",
          coordinates: [t.location?.lng ?? 0, t.location?.lat ?? 0],
        },
      })),
    };
  }, [data]);

  useEffect(() => {
    if (!isMapReady) return;
    if (!data?.mapData?.tourists?.length) return;
    if (hasAutoFitTouristsRef.current) return;
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    const tourists = data.mapData.tourists
      .map((tourist) => ({
        lat: Number(tourist.location?.lat),
        lng: Number(tourist.location?.lng),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng) &&
          point.lat >= -90 &&
          point.lat <= 90 &&
          point.lng >= -180 &&
          point.lng <= 180,
      );

    if (!tourists.length) return;

    const lats = tourists.map((point) => point.lat);
    const lngs = tourists.map((point) => point.lng);
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ];

    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 13,
      duration: 800,
    });
    hasAutoFitTouristsRef.current = true;
  }, [data, isMapReady]);


  const alertSource = useMemo(() => {
    if (!data?.mapData?.activeAlerts || !Array.isArray(data.mapData.activeAlerts)) return null;
    const validAlerts = data.mapData.activeAlerts.filter(
      (a) => a && a.location && Number.isFinite(a.location.lat) && Number.isFinite(a.location.lng),
    );
    return {
      type: "FeatureCollection",
      features: validAlerts.map((a) => ({
        type: "Feature",
        properties: {
          id: a.id,
          type: "alert",
          status: a.status || "active",
          priority: a.priority || "high",
          locationName: a.locationName || "Alert Location",
        },
        geometry: {
          type: "Point",
          coordinates: [a.location.lng, a.location.lat],
        },
      })),
    };
  }, [data]);

  const incidentSource = useMemo(() => {
    if (!data?.mapData?.incidents || !Array.isArray(data.mapData.incidents)) return null;
    const validIncidents = data.mapData.incidents.filter((incident) => {
      const lat = Number(incident?.location?.lat);
      const lng = Number(incident?.location?.lng);
      return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
      );
    });

    return {
      type: "FeatureCollection",
      features: validIncidents.map((i) => ({
        type: "Feature",
        properties: {
          id: i.id,
          type: "incident",
          title: i.title || "Incident",
          category: i.category || "General",
        },
        geometry: {
          type: "Point",
          coordinates: [i.location.lng, i.location.lat],
        },
      })),
    };
  }, [data]);

  // Helper function to calculate radius based on risk level
  const getRadiusForRiskLevel = (riskLevel: string): number => {
    const normalizedLevel = riskLevel.toLowerCase();
    switch (normalizedLevel) {
      case "critical":
      case "very high":
        return 5000; // 5km for critical/very high risk
      case "high":
        return 3000; // 3km for high risk
      case "medium":
        return 2000; // 2km for medium risk
      case "low":
        return 1000; // 1km for low risk
      default:
        return 2000; // 2km default
    }
  };

  // Danger Zones Source (solid borders, diagonal stripes pattern)
  const dangerZoneSource = useMemo(() => {
    if (!styledZones || !Array.isArray(styledZones.dangerZones)) return null;

    // Filter zones based on layer toggles
    const visibleZones = styledZones.dangerZones.filter((z) => {
      const isMil = isMilitaryZone(z);
      if (isMil) {
        return layers.militaryZones;
      }
      return layers.zones;
    });

    return {
      type: "FeatureCollection",
      features: visibleZones
        .filter((z) => (z.polygonCoords && z.polygonCoords.length > 0) || (Array.isArray(z.coords) && z.coords.length >= 2))
        .map((z) => {
        const isMil = isMilitaryZone(z);
        // Calculate radius in KM
        const radiusKm =
          z.radiusKm || getRadiusForRiskLevel(z.riskLevel || "Medium") / 1000;

        // Polygon zones
        if (z.polygonCoords && z.polygonCoords.length > 0) {
          return {
            type: "Feature",
            properties: {
              id: z._id || (z as any).id,
              type: "danger",
              zoneType: isMil ? "military_zone" : "danger_zone",
              isMilitary: isMil,
              riskLevel: z.riskLevel || "Medium",
              name: z.name || "Danger Zone",
              category: z.category || "General",
              state: z.state || "",
              radius: radiusKm * 1000,
              borderStyle: z.visualStyle?.borderStyle || "solid",
              borderWidth: z.visualStyle?.borderWidth || 3,
              fillOpacity: z.visualStyle?.fillOpacity || 0.25,
              fillPattern: z.visualStyle?.fillPattern || "diagonal-stripes",
            },
            geometry: {
              type: "Polygon",
              coordinates: [z.polygonCoords],
            },
          };
        }

        // Circle zones (converted to Polygon for size persistence)
        const lat = Array.isArray(z.coords) ? Number(z.coords[0]) : 0;
        const lng = Array.isArray(z.coords) ? Number(z.coords[1]) : 0;
        const coordinates = getCircleCoordinates(
          lat,
          lng,
          radiusKm,
        );

        return {
          type: "Feature",
          properties: {
            id: z._id || (z as any).id,
            type: "danger",
            zoneType: isMil ? "military_zone" : "danger_zone",
            isMilitary: isMil,
            riskLevel: z.riskLevel || "Medium",
            name: z.name || "Danger Zone",
            category: z.category || "General",
            state: z.state || "",
            radius: radiusKm * 1000,
            borderStyle: z.visualStyle?.borderStyle || "solid",
            borderWidth: z.visualStyle?.borderWidth || 3,
            fillOpacity: z.visualStyle?.fillOpacity || 0.25,
            fillPattern: z.visualStyle?.fillPattern || "diagonal-stripes",
          },
          geometry: {
            type: "Polygon",
            coordinates: coordinates,
          },
        };
      }),
    };
  }, [styledZones, layers.zones, layers.militaryZones]);

  // Risk Grids Source (dashed borders, dots pattern, circular grids)
  const riskGridSource = useMemo(() => {
    if (!styledZones || !Array.isArray(styledZones.riskGrids)) return null;
    return {
      type: "FeatureCollection",
      features: styledZones.riskGrids
        .filter((grid) => grid?.location?.coordinates && Array.isArray(grid.location.coordinates) && grid.location.coordinates.length >= 2)
        .map((grid) => {
        const [lng, lat] = grid.location.coordinates;
        // User requested 1km circle for risk grids
        const radiusKm = 1;

        // Generate circular polygon (approx 1km radius)
        const coordinates = getCircleCoordinates(Number(lat) || 0, Number(lng) || 0, radiusKm);

        return {
          type: "Feature",
          properties: {
            id: grid._id,
            type: "risk_grid",
            zoneType: "risk_grid",
            riskLevel: grid.riskLevel || "Medium",
            name: grid.gridName || "Risk Grid",
            gridId: grid.gridId || "",
            riskScore: grid.riskScore || 0,
            lastUpdated: grid.lastUpdated || new Date().toISOString(),
            borderStyle: grid.visualStyle?.borderStyle || "dashed",
            borderWidth: grid.visualStyle?.borderWidth || 2,
            fillOpacity: grid.visualStyle?.fillOpacity || 0.4,
            fillPattern: grid.visualStyle?.fillPattern || "dots",
            reasons: JSON.stringify(grid.reasons || []),
          },
          geometry: {
            type: "Polygon",
            coordinates: coordinates,
          },
        };
      }),
    };
  }, [styledZones]);

  // -- Colors & Styles --
  // Using expressions directly in layers below

  const onMapClick = useCallback((event: any) => {
    const getCoLocatedTouristIds = (touristId: string): string[] => {
      if (!data) return [touristId];

      const anchor = data.mapData.tourists.find((tourist) => tourist.id === touristId);
      if (!anchor) return [touristId];

      const anchorLat = Number(anchor.location?.lat);
      const anchorLng = Number(anchor.location?.lng);
      if (!Number.isFinite(anchorLat) || !Number.isFinite(anchorLng)) {
        return [touristId];
      }

      const coLocatedIds = data.mapData.tourists
        .filter((tourist) => {
          const lat = Number(tourist.location?.lat);
          const lng = Number(tourist.location?.lng);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
          return (
            Math.abs(lat - anchorLat) <= COLOCATED_COORD_TOLERANCE &&
            Math.abs(lng - anchorLng) <= COLOCATED_COORD_TOLERANCE
          );
        })
        .map((tourist) => tourist.id);

      return coLocatedIds.length ? Array.from(new Set(coLocatedIds)) : [touristId];
    };

    const clickedFeatures = event.features || [];
    const touristFeatures = clickedFeatures.filter(
      (candidate: any) =>
        candidate?.properties?.type === "tourist" &&
        !candidate?.properties?.cluster,
    );

    if (touristFeatures.length > 0) {
      const uniqueTouristIds: string[] = Array.from(
        new Set<string>(
          touristFeatures
            .map((candidate: any) => String(candidate?.properties?.id || ""))
            .filter((id: string): id is string => Boolean(id)),
        ),
      );

      const fallbackCoLocatedIds =
        uniqueTouristIds.length > 1
          ? uniqueTouristIds
          : getCoLocatedTouristIds(uniqueTouristIds[0]);

      // Keep all co-located tourists accessible from the side panel.
      setCoLocatedTouristIds(
        fallbackCoLocatedIds.length > 1 ? fallbackCoLocatedIds : [],
      );

      setSelectedEntity({ id: uniqueTouristIds[0], type: "tourist" });
      return;
    }

    // 1. Check if clicked on another feature type
    const feature = clickedFeatures[0];

    if (feature && !feature.properties.cluster) {
      // It's a marker/entity - Open Details Panel Directly
      const { id, type } = feature.properties;
      setCoLocatedTouristIds([]);
      setSelectedEntity({ id, type });
    } else if (feature && feature.properties.cluster) {
      // Cluster expansion logic
      const clusterId = feature.properties.cluster_id;
      let sourceId = "tourists";
      if (feature.layer.id.includes("alert")) sourceId = "alerts";

      setCoLocatedTouristIds([]);

      const source = mapRef.current?.getSource(sourceId) as GeoJSONSource;

      source?.getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (err) return;
        mapRef.current?.easeTo({
          center: feature.geometry.coordinates,
          zoom: zoom || 14,
        });
      });
    } else {
      // Clicked empty space - Close Panel
      setCoLocatedTouristIds([]);
      setSelectedEntity(null);
    }
  }, [data]);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Live Situation Map
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-gray-600">
              Real-time monitoring of alerts, zones, and tourists
            </p>
            <span className="text-gray-300">|</span>
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${isConnected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
            >
              {isConnected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {isConnected ? "LIVE FEED ACTIVE" : "DISCONNECTED"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => setIsAddZoneOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            <span>Add Danger Zone</span>
          </button>
          <button
            onClick={() => setIsManageZonesOpen(true)}
            className="bg-white hover:bg-red-50 text-red-700 border border-red-300 hover:border-red-400 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-medium"
            title="View, locate, and remove danger zones"
          >
            <Trash2 className="h-4 w-4 text-red-600" />
            <span>Remove Danger Zone ({styledZones?.dangerZones?.length || 0})</span>
          </button>
          <button
            onClick={fetchData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-[950px]">
        {/* Main Map Area */}
        <div className="xl:col-span-2 relative h-full rounded-xl shadow-lg border border-gray-200 overflow-hidden bg-[#e5e3df]">
          <Map
            ref={mapRef}
            mapLib={maplibregl as any}
            workerUrl={maplibreWorkerUrl}
            initialViewState={{
              longitude: 72.9691,
              latitude: 19.2714,
              zoom: 13,
            }}
            style={{ width: "100%", height: "100%" }}
            mapStyle={DEFAULT_MAP_STYLE as any}
            onLoad={onMapLoad}
            interactiveLayerIds={[
              ...(touristSource?.features?.length > 0 &&
              (layers.activeTourists || layers.inactiveTourists)
                ? ["tourist-circles"]
                : []),
              ...(alertSource && layers.sos
                ? ["alert-points", "alert-clusters"]
                : []),
              ...(incidentSource && layers.incidents
                ? ["incident-points"]
                : []),
              ...(dangerZoneSource && (layers.zones || layers.militaryZones)
                ? ["danger-zone-polygons"]
                : []),
              ...(riskGridSource && layers.zones ? ["risk-grid-fill"] : []),
            ]}
            onClick={onMapClick}
            cursor="pointer"
          >
            <NavigationControl position="top-right" showCompass={false} />
            <FullscreenControl position="top-right" />
            <ScaleControl position="bottom-left" />
            <GeolocateControl position="top-right" />

            {/* --- MAPPED DATA SOURCES --- */}

            {/* DANGER ZONES & MILITARY ZONES (Solid borders, 25% opacity) */}
            {dangerZoneSource && (layers.zones || layers.militaryZones) && (
              <Source
                id="danger-zones"
                type="geojson"
                data={dangerZoneSource as any}
              >
                {/* 1. Base Color Layer */}
                <Layer
                  id="danger-zone-polygons"
                  type="fill"
                  paint={{
                    "fill-color": [
                      "case",
                      ["get", "isMilitary"],
                      "#4f46e5",
                      [
                        "match",
                        ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                        "critical",
                        "#dc2626",
                        "very high",
                        "#ef4444",
                        "high",
                        "#f97316",
                        "medium",
                        "#eab308",
                        "low",
                        "#22c55e",
                        "#22c55e",
                      ],
                    ],
                    "fill-opacity": ["get", "fillOpacity"],
                  }}
                />

                {ENABLE_PATTERN_OVERLAYS && (
                  <Layer
                    id="danger-zone-pattern"
                    type="fill"
                    filter={["has", "fillPattern"]}
                    paint={{
                      "fill-pattern": ["get", "fillPattern"],
                      "fill-opacity": ["get", "fillOpacity"],
                    }}
                  />
                )}

                <Layer
                  id="danger-zone-border-solid"
                  type="line"
                  filter={[
                    "match",
                    ["get", "borderStyle"],
                    ["dashed", "dotted"],
                    false,
                    true,
                  ]}
                  paint={{
                    "line-color": [
                      "case",
                      ["get", "isMilitary"],
                      "#3730a3",
                      [
                        "match",
                        ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                        "critical",
                        "#991b1b",
                        "very high",
                        "#dc2626",
                        "high",
                        "#ea580c",
                        "medium",
                        "#ca8a04",
                        "low",
                        "#16a34a",
                        "#16a34a",
                      ],
                    ],
                    "line-width": ["get", "borderWidth"],
                  }}
                />
                <Layer
                  id="danger-zone-border-dashed"
                  type="line"
                  filter={["==", ["get", "borderStyle"], "dashed"]}
                  paint={{
                    "line-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#991b1b",
                      "very high",
                      "#dc2626",
                      "high",
                      "#ea580c",
                      "medium",
                      "#ca8a04",
                      "low",
                      "#16a34a",
                      "#16a34a",
                    ],
                    "line-width": ["get", "borderWidth"],
                    "line-dasharray": [2, 2],
                  }}
                />
                <Layer
                  id="danger-zone-border-dotted"
                  type="line"
                  filter={["==", ["get", "borderStyle"], "dotted"]}
                  paint={{
                    "line-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#991b1b",
                      "very high",
                      "#dc2626",
                      "high",
                      "#ea580c",
                      "medium",
                      "#ca8a04",
                      "low",
                      "#16a34a",
                      "#16a34a",
                    ],
                    "line-width": ["get", "borderWidth"],
                    "line-dasharray": [0.5, 1.5],
                  }}
                />
              </Source>
            )}

            {/* RISK GRIDS (Dashed borders, user visual style) */}
            {riskGridSource && layers.zones && (
              <Source
                id="risk-grids"
                type="geojson"
                data={riskGridSource as any}
              >
                {/* 1. Base Color Layer */}
                <Layer
                  id="risk-grid-fill"
                  type="fill"
                  paint={{
                    "fill-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#dc2626",
                      "very high",
                      "#ef4444",
                      "high",
                      "#f97316",
                      "medium",
                      "#eab308",
                      "low",
                      "#22c55e",
                      "#22c55e",
                    ],
                    "fill-opacity": ["get", "fillOpacity"],
                  }}
                />

                {ENABLE_PATTERN_OVERLAYS && (
                  <Layer
                    id="risk-grid-pattern"
                    type="fill"
                    filter={["has", "fillPattern"]}
                    paint={{
                      "fill-pattern": ["get", "fillPattern"],
                      "fill-opacity": ["get", "fillOpacity"],
                    }}
                  />
                )}

                {/* Risk Grid Borders - Solid */}
                <Layer
                  id="risk-grid-border-solid"
                  type="line"
                  filter={[
                    "match",
                    ["get", "borderStyle"],
                    "solid",
                    true,
                    false,
                  ]}
                  paint={{
                    "line-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#991b1b",
                      "very high",
                      "#dc2626",
                      "high",
                      "#ea580c",
                      "medium",
                      "#ca8a04",
                      "low",
                      "#16a34a",
                      "#16a34a",
                    ],
                    "line-width": ["get", "borderWidth"],
                  }}
                />

                {/* Risk Grid Borders - Dashed (Default for risk grid) */}
                <Layer
                  id="risk-grid-border-dashed"
                  type="line"
                  filter={[
                    "match",
                    ["get", "borderStyle"],
                    "dashed",
                    true,
                    false,
                  ]}
                  paint={{
                    "line-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#991b1b",
                      "very high",
                      "#dc2626",
                      "high",
                      "#ea580c",
                      "medium",
                      "#ca8a04",
                      "low",
                      "#16a34a",
                      "#16a34a",
                    ],
                    "line-width": ["get", "borderWidth"],
                    "line-dasharray": [2, 2],
                  }}
                />

                {/* Risk Grid Borders - Dotted */}
                <Layer
                  id="risk-grid-border-dotted"
                  type="line"
                  filter={[
                    "match",
                    ["get", "borderStyle"],
                    "dotted",
                    true,
                    false,
                  ]}
                  paint={{
                    "line-color": [
                      "match",
                      ["downcase", ["coalesce", ["get", "riskLevel"], "medium"]],
                      "critical",
                      "#991b1b",
                      "very high",
                      "#dc2626",
                      "high",
                      "#ea580c",
                      "medium",
                      "#ca8a04",
                      "low",
                      "#16a34a",
                      "#16a34a",
                    ],
                    "line-width": ["get", "borderWidth"],
                    "line-dasharray": [0.5, 1.5],
                  }}
                />
              </Source>
            )}

            {/* TOURISTS – Source AND Layers are always mounted to avoid
                Mapbox "missing required property source" timing errors.
                Visibility is controlled via layout.visibility instead. */}
            <Source
              id="tourists"
              type="geojson"
              data={touristSource as any}
              cluster={false}
            >
              {/* Filter Active/Inactive based on Layer State */}
              <Layer
                id="tourist-circles"
                type="circle"
                filter={
                  !(
                    touristSource.features.length > 0 &&
                    (layers.activeTourists || layers.inactiveTourists)
                  )
                    ? ["==", ["get", "status"], "__never_match__"]
                    : layers.activeTourists && layers.inactiveTourists
                      ? ["has", "id"]
                      : layers.activeTourists
                        ? ["==", ["get", "status"], "active"]
                        : layers.inactiveTourists
                          ? ["!=", ["get", "status"], "active"]
                          : ["==", ["get", "id"], "__none__"]
                }
                paint={{
                  "circle-color": [
                    "match",
                    ["get", "status"],
                    "active",
                    "#10b981", // GREEN for active (live)
                    "#3b82f6", // BLUE for inactive (offline)
                  ],
                  "circle-radius": 11,
                  "circle-stroke-width": 3,
                  "circle-stroke-color": "#ffffff",
                }}
              />
              <Layer
                id="tourist-labels"
                type="symbol"
                filter={
                  touristSource.features.length > 0 &&
                  (layers.activeTourists || layers.inactiveTourists)
                    ? layers.activeTourists && !layers.inactiveTourists
                      ? ["==", ["get", "status"], "active"]
                      : ["has", "id"]
                    : ["==", ["get", "status"], "__never_match__"]
                }
                layout={{
                  "text-field": ["coalesce", ["get", "name"], ["get", "id"]],
                  "text-font": ["Open Sans Regular", "Arial Unicode MS Bold"],
                  "text-size": 12,
                  "text-offset": [0, 1.4],
                  "text-anchor": "top",
                }}
                paint={{
                  "text-color": "#0f172a",
                  "text-halo-color": "#ffffff",
                  "text-halo-width": 2,
                }}
              />
            </Source>

            {/* INCIDENTS */}
            {incidentSource && layers.incidents && (
              <Source
                id="incidents"
                type="geojson"
                data={incidentSource as any}
              >
                <Layer
                  id="incident-points"
                  type="circle"
                  paint={{
                    "circle-color": "#f97316",
                    "circle-radius": 9,
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff",
                  }}
                />
              </Source>
            )}

            {/* SOS ALERTS */}
            {alertSource && layers.sos && (
              <Source
                id="alerts"
                type="geojson"
                data={alertSource as any}
                cluster={true}
                clusterMaxZoom={14}
                clusterRadius={40}
              >
                <Layer
                  id="alert-clusters"
                  type="circle"
                  filter={["has", "point_count"]}
                  paint={{
                    "circle-color": "#dc2626",
                    "circle-radius": [
                      "step",
                      ["get", "point_count"],
                      18,
                      5,
                      24,
                      20,
                      30,
                    ],
                    "circle-opacity": 0.9,
                    "circle-stroke-width": 3,
                    "circle-stroke-color": "#fee2e2",
                  }}
                />
                <Layer
                  id="alert-cluster-count"
                  type="symbol"
                  filter={["has", "point_count"]}
                  layout={{
                    "text-field": "{point_count_abbreviated}",
                    "text-font": [
                      "Open Sans Regular",
                      "Arial Unicode MS Bold",
                    ],
                    "text-size": 14,
                  }}
                  paint={{ "text-color": "#ffffff" }}
                />

                {/* Unclustered Alerts - Sized by Priority */}
                <Layer
                  id="alert-points"
                  type="circle"
                  filter={["!", ["has", "point_count"]]}
                  paint={{
                    "circle-color": "#ef4444",
                    "circle-radius": [
                      "match",
                      ["downcase", ["coalesce", ["get", "priority"], "medium"]],
                      "critical",
                      14,
                      "high",
                      11,
                      9, // medium
                    ],
                    "circle-stroke-width": 2,
                    "circle-stroke-color": "#fff",
                    // Pulse effect simulation: Use a Halo or Opacity ramp (not animated here but visually distinct)
                    "circle-opacity": 1,
                  }}
                />
                {/* Optional formatting for SOS label */}
                <Layer
                  id="alert-labels"
                  type="symbol"
                  filter={["!", ["has", "point_count"]]}
                  layout={{
                    "text-field": "SOS",
                    "text-font": [
                      "Open Sans Regular",
                      "Arial Unicode MS Bold",
                    ],
                    "text-size": 10,
                    "text-offset": [0, -2], // Above marker
                  }}
                  paint={{
                    "text-color": "#b91c1c",
                    "text-halo-color": "#fff",
                    "text-halo-width": 1,
                  }}
                />
              </Source>
            )}

            {/* CLICKED TOURIST POPUP */}
            {selectedEntity?.type === "tourist" && (() => {
              const t = data?.mapData.tourists.find((row) => row.id === selectedEntity.id);
              if (!t || !t.location) return null;
              const isAct = t.status === "active";
              return (
                <Popup
                  latitude={t.location.lat}
                  longitude={t.location.lng}
                  offset={[0, -14]}
                  closeButton={true}
                  closeOnClick={false}
                  onClose={() => setSelectedEntity(null)}
                  className="z-20 font-sans"
                >
                  <div className="p-1 min-w-[170px] space-y-1">
                    <div className="flex items-center justify-between gap-2 border-b pb-1">
                      <span className="font-bold text-gray-900 text-sm truncate">{t.name || t.id}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isAct ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                        {isAct ? 'Active (Live)' : 'Inactive (Offline)'}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-600 font-mono">
                      {Number(t.location.lat).toFixed(5)}, {Number(t.location.lng).toFixed(5)}
                    </div>
                    <div className="text-[10px] font-medium text-gray-500 flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`}></span>
                      {isAct ? 'Streaming Live Location' : 'Stopped at Last Location'}
                    </div>
                  </div>
                </Popup>
              );
            })()}
          </Map>

          {/* FLOATING LEGEND (Bottom Right) */}
          <div className="absolute bottom-6 right-12 bg-white/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-gray-200 text-xs z-10 max-w-[200px]">
            <h4 className="font-bold text-gray-700 mb-2">Map Legend</h4>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm animate-pulse"></div>{" "}
                <span className="font-medium text-gray-700">SOS Alert</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-md bg-red-200 border-2 border-red-600"></div>{" "}
                <span className="flex flex-col">
                  <span className="font-medium text-gray-700">Danger Zone</span>
                  <span className="text-[10px] text-gray-500">
                    Solid • Monitored
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>{" "}
                <span className="font-medium text-emerald-800">Active Tourist (Live)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>{" "}
                <span className="font-medium text-blue-800">Inactive Tourist (Offline)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Panel - Details */}
        <div className="flex flex-col space-y-6 h-full">
          {/* Details Panel - Content same as before but driven by selectedEntity */}
          {selectedEntity ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-in slide-in-from-right duration-200 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedEntity(null);
                  setCoLocatedTouristIds([]);
                }}
                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedEntity.type === "tourist" &&
                (() => {
                  const tourist = data?.mapData.tourists.find(
                    (t) => t.id === selectedEntity.id,
                  );
                  if (!tourist)
                    return (
                      <div className="p-4 text-gray-500">Tourist not found</div>
                    );
                  return (
                    <>
                      <div className="p-4 bg-blue-50 border-b border-gray-200 rounded-t-xl">
                        <h3 className="font-semibold text-gray-900">
                          Tourist Details
                        </h3>
                        {coLocatedTouristIds.length > 1 && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 mb-2">
                              Multiple tourists at this location. Select one:
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {coLocatedTouristIds.map((touristId) => {
                                const candidate = data?.mapData.tourists.find(
                                  (row) => row.id === touristId,
                                );
                                return (
                                  <button
                                    key={touristId}
                                    onClick={() =>
                                      setSelectedEntity({
                                        id: touristId,
                                        type: "tourist",
                                      })
                                    }
                                    className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${selectedEntity.id === touristId ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-700 border-blue-200 hover:bg-blue-50"}`}
                                  >
                                    {candidate?.name || touristId}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-lg text-gray-900">
                            {tourist.name}
                          </span>
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border shadow-sm ${
                              tourist.status === "active"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-blue-50 text-blue-800 border-blue-300"
                            }`}
                          >
                            {tourist.status === "active" ? "ACTIVE (LIVE)" : "INACTIVE (OFFLINE)"}
                          </span>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Tracking Status:</span>
                            <span className={`font-semibold flex items-center gap-1.5 ${tourist.status === "active" ? "text-emerald-700" : "text-blue-700"}`}>
                              <span className={`w-2 h-2 rounded-full ${tourist.status === "active" ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`}></span>
                              {tourist.status === "active" ? "Active (GPS Live Streaming)" : "Inactive (Stopped at Last Location)"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-mono text-[11px] text-gray-600">
                            <span>Coordinates:</span>
                            <span>
                              {tourist.location?.lat
                                ? `${Number(tourist.location.lat).toFixed(5)}, ${Number(tourist.location.lng).toFixed(5)}`
                                : "No GPS data"}
                            </span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-2">
                          <p className="flex justify-between">
                            <span>Digital ID:</span>{" "}
                            <span className="font-mono text-xs bg-gray-50 p-1 rounded">
                              {tourist.id.substring(0, 8)}...
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Mobile:</span>{" "}
                            <span className="font-medium">
                              {tourist.mobileNumber || "N/A"}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Role:</span>{" "}
                            <span className="font-medium">
                              {tourist.role || "N/A"}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Group ID:</span>{" "}
                            <span className="font-medium">
                              {tourist.groupId || "N/A"}
                            </span>
                          </p>
                          <p className="flex justify-between">
                            <span>Emergency:</span>{" "}
                            <span className="font-medium text-right max-w-[60%]">
                              {tourist.emergencyContact?.name &&
                              tourist.emergencyContact?.phone
                                ? `${tourist.emergencyContact.name} (${tourist.emergencyContact.phone})`
                                : "N/A"}
                            </span>
                          </p>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs uppercase text-gray-500 mb-1">
                              Day-Wise Itinerary
                            </p>
                            {Array.isArray(tourist.dayWiseItinerary) &&
                            tourist.dayWiseItinerary.length > 0 ? (
                              <div className="space-y-2">
                                <p className="text-xs text-gray-700">
                                  Days:{" "}
                                  <strong>
                                    {tourist.dayWiseItinerary.length}
                                  </strong>
                                </p>
                                <p className="text-xs text-gray-700">
                                  Next stop:{" "}
                                  <strong>
                                    {tourist.dayWiseItinerary[0]?.nodes?.[0]
                                      ?.name || "N/A"}
                                  </strong>
                                </p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500">
                                No itinerary shared
                              </p>
                            )}
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <p className="text-xs uppercase text-gray-500 mb-1">
                              Safety Score
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${tourist.safetyScore}%` }}
                                ></div>
                              </div>
                              <span className="font-bold text-blue-700">
                                {tourist.safetyScore}
                              </span>
                            </div>
                          </div>
                          <p>
                            <strong>Location:</strong>{" "}
                            {tourist.location.lat.toFixed(5)},{" "}
                            {tourist.location.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}

              {selectedEntity.type === "alert" &&
                (() => {
                  const alert = data?.mapData.activeAlerts.find(
                    (a) => a.id === selectedEntity.id,
                  );
                  if (!alert)
                    return (
                      <div className="p-4 text-gray-500">Alert not found</div>
                    );
                  return (
                    <>
                      <div className="p-4 bg-red-50 border-b border-red-100 rounded-t-xl">
                        <h3 className="font-bold text-red-700 flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5" /> SOS ALERT
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-gray-500">Status</span>
                            <span className="capitalize font-medium px-2 py-0.5 bg-red-100 text-red-800 rounded">
                              {alert.status}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                            <span className="text-gray-500">Priority</span>
                            <span
                              className={`font-black ${alert.priority === "high" ? "text-red-600" : "text-orange-600"}`}
                            >
                              {alert.priority.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500 block mb-1">
                              Location
                            </span>
                            <p className="font-medium text-gray-900">
                              {alert.locationName || "Unknown Location"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {alert.location.lat.toFixed(5)},{" "}
                              {alert.location.lng.toFixed(5)}
                            </p>
                          </div>
                        </div>
                        <button className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2.5 rounded-lg text-sm transition-colors font-bold shadow-md flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4" /> Dispatch Response
                          Unit
                        </button>
                      </div>
                    </>
                  );
                })()}

              {selectedEntity.type === "incident" &&
                (() => {
                  const incident = data?.mapData.incidents.find(
                    (i) => i.id === selectedEntity.id,
                  );
                  if (!incident)
                    return (
                      <div className="p-4 text-gray-500">
                        Incident not found
                      </div>
                    );
                  return (
                    <>
                      <div className="p-4 bg-orange-50 border-b border-orange-100 rounded-t-xl">
                        <h3 className="font-semibold text-orange-800 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-2" /> Incident
                          Report
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <h4 className="font-bold text-lg text-gray-900 leading-tight">
                          {incident.title}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-2 mt-2">
                          <div className="inline-block px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-bold uppercase tracking-wider mb-2">
                            {incident.category}
                          </div>
                          <p className="text-gray-500">
                            Location coordinates: <br />
                            {incident.location.lat.toFixed(5)},{" "}
                            {incident.location.lng.toFixed(5)}
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}

              {(selectedEntity.type === "danger" ||
                selectedEntity.type === "zone") &&
                (() => {
                  const dangerZone = styledZones?.dangerZones?.find(
                    (z) => z._id === selectedEntity.id || (z as any).id === selectedEntity.id,
                  );
                  if (!dangerZone)
                    return (
                      <div className="p-4 text-gray-500">Zone not found</div>
                    );
                  const zoneKey = dangerZone._id || (dangerZone as any).id;
                    const isMil = isMilitaryZone(dangerZone);
                    return (
                      <>
                        <div
                          className={`p-4 border-b rounded-t-xl ${
                            isMil
                              ? "bg-indigo-50 border-indigo-100"
                              : "bg-red-50 border-red-100"
                          }`}
                        >
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            {isMil ? (
                              <>
                                <Shield className="w-5 h-5 text-indigo-700" />
                                <span>Military & Strategic Zone</span>
                              </>
                            ) : (
                              <>
                                <span className="text-xl">⚠️</span>
                                <span>Civilian Danger Zone</span>
                              </>
                            )}
                          </h3>
                        </div>
                        <div className="p-4 space-y-3">
                          <h4 className="font-bold text-lg">{dangerZone.name}</h4>
                          <div className="text-sm text-gray-600 space-y-2">
                            <p>
                              <strong>Classification:</strong>{" "}
                              {isMil ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  DEFENSE RESTRICTED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                  CIVILIAN HAZARD
                                </span>
                              )}
                            </p>
                            <p>
                              <strong>Risk Level:</strong>{" "}
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-bold ${
                                  dangerZone.riskLevel
                                    .toLowerCase()
                                    .includes("high")
                                    ? "bg-red-100 text-red-800"
                                    : dangerZone.riskLevel.toLowerCase() ===
                                        "medium"
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-green-100 text-green-800"
                                }`}
                              >
                                {dangerZone.riskLevel.toUpperCase()}
                              </span>
                            </p>
                            {dangerZone.category && (
                              <p>
                                <strong>Category:</strong> {dangerZone.category}
                              </p>
                            )}
                            {dangerZone.state && (
                              <p>
                                <strong>State:</strong> {dangerZone.state}
                              </p>
                            )}
                            {dangerZone.radiusKm && (
                              <p>
                                <strong>Radius:</strong> {dangerZone.radiusKm} km
                              </p>
                            )}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs text-gray-500">
                                <strong>Visual Style:</strong>{" "}
                                {isMil
                                  ? "Solid indigo boundary • Strategic Defense Area"
                                  : "Solid red boundary • Pre-seeded civilian zone"}
                              </p>
                            </div>
                          <div className="pt-2">
                            {confirmingZoneId === zoneKey ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDangerZone(zoneKey, dangerZone.name)}
                                  disabled={isDeletingZoneId === zoneKey}
                                  className="flex-1 bg-red-700 hover:bg-red-800 disabled:bg-red-300 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs transition-colors shadow-sm"
                                >
                                  {isDeletingZoneId === zoneKey ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                  <span>{isDeletingZoneId === zoneKey ? "Removing..." : "Yes, Confirm Delete"}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmingZoneId(null)}
                                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingZoneId(zoneKey)}
                                disabled={isDeletingZoneId === zoneKey}
                                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm transition-colors shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Remove Danger Zone</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}

              {selectedEntity.type === "risk_grid" &&
                (() => {
                  const riskGrid = styledZones?.riskGrids?.find(
                    (g) => g._id === selectedEntity.id,
                  );
                  if (!riskGrid)
                    return (
                      <div className="p-4 text-gray-500">
                        Risk Grid not found
                      </div>
                    );
                  return (
                    <>
                      <div className="p-4 bg-orange-50 border-b border-orange-100 rounded-t-xl">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                          <span className="text-xl">📍</span>
                          Risk Grid Zone
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <h4 className="font-bold text-lg">
                          {riskGrid.gridName}
                        </h4>
                        <div className="text-sm text-gray-600 space-y-2">
                          <p>
                            <strong>Risk Level:</strong>{" "}
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-bold ${
                                riskGrid.riskLevel
                                  .toLowerCase()
                                  .includes("high")
                                  ? "bg-red-100 text-red-800"
                                  : riskGrid.riskLevel.toLowerCase() ===
                                      "medium"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-green-100 text-green-800"
                              }`}
                            >
                              {riskGrid.riskLevel.toUpperCase()}
                            </span>
                          </p>
                          <p>
                            <strong>Grid ID:</strong> {riskGrid.gridId}
                          </p>
                          <p>
                            <strong>Risk Score:</strong>{" "}
                            {(riskGrid.riskScore * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">
                            <strong>Last Updated:</strong>{" "}
                            {new Date(
                              riskGrid.lastUpdated,
                            ).toLocaleDateString()}{" "}
                            at{" "}
                            {new Date(
                              riskGrid.lastUpdated,
                            ).toLocaleTimeString()}
                          </p>

                          {riskGrid.reasons && riskGrid.reasons.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="font-semibold text-xs text-gray-700 mb-2">
                                Recent Events ({riskGrid.reasons.length}):
                              </p>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {riskGrid.reasons.map((reason, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-gray-50 p-2 rounded text-xs border-l-2"
                                    style={{
                                      borderLeftColor:
                                        reason.severity > 70
                                          ? "#ef4444"
                                          : reason.severity > 40
                                            ? "#f97316"
                                            : "#22c55e",
                                    }}
                                  >
                                    <div className="flex justify-between items-start">
                                      <span className="font-medium">
                                        {reason.type === "sos_alert"
                                          ? "🚨"
                                          : "⚠️"}{" "}
                                        {reason.title}
                                      </span>
                                      <span className="text-gray-500">
                                        {reason.severity}%
                                      </span>
                                    </div>
                                    <div className="text-gray-500 mt-1">
                                      {new Date(
                                        reason.timestamp,
                                      ).toLocaleDateString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              <strong>Visual Style:</strong> Dashed border •
                              Dynamic zone (7 days) • 2km grid
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center flex-shrink-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                <MapPin className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-1">
                No Item Selected
              </h3>
              <p className="text-sm text-gray-500 px-4">
                Click on a map marker to view detailed information and take
                action.
              </p>
            </div>
          )}

          {/* Stats Cards and Map Layers - Scrollable Container */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Stats Cards (Below Details) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-shrink-0">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Live Statistics</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {data && (() => {
                  const activeCount = data.mapData?.tourists?.filter((t) => t.status === "active").length || 0;
                  const inactiveCount = data.mapData?.tourists?.filter((t) => t.status !== "active").length || 0;
                  const totalCount = data.stats?.totalTourists || data.mapData?.tourists?.length || 0;

                  return (
                    <>
                      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-gray-700">
                          Total Tourists
                        </span>
                        <span className="font-bold text-gray-900 text-lg">
                          {totalCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>
                          Active Tourists (Live)
                        </span>
                        <span className="font-bold text-emerald-600 text-lg">
                          {activeCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                        <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></span>
                          Inactive Tourists (Offline)
                        </span>
                        <span className="font-bold text-blue-600 text-lg">
                          {inactiveCount}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Map Layers (Moved to Right Side) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Map Layers</h3>
              </div>
              <div className="p-4 space-y-3">
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors border border-transparent hover:border-gray-100">
                  <input
                    type="checkbox"
                    checked={layers.sos}
                    onChange={() => toggleLayer("sos")}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="flex-1 font-medium text-gray-800">SOS Alerts</span>
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm animate-pulse"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-emerald-50/50 p-2 rounded transition-colors border border-transparent hover:border-emerald-100">
                  <input
                    type="checkbox"
                    checked={layers.activeTourists}
                    onChange={() => toggleLayer("activeTourists")}
                    className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                  />
                  <span className="flex-1 font-medium text-emerald-900">Active Tourists (Live)</span>
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm"></div>
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer hover:bg-blue-50/50 p-2 rounded transition-colors border border-transparent hover:border-blue-100">
                  <input
                    type="checkbox"
                    checked={layers.inactiveTourists}
                    onChange={() => toggleLayer("inactiveTourists")}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="flex-1 font-medium text-blue-900">Inactive Tourists (Offline)</span>
                  <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddZoneOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl border border-gray-200 shadow-2xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Danger Zone
              </h2>
              <button
                onClick={() => {
                  setIsAddZoneOpen(false);
                  setAddZoneError(null);
                }}
                className="p-1 rounded hover:bg-gray-100 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDangerZone} className="p-4 space-y-4">
              {addZoneError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {addZoneError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={dangerZoneForm.name}
                    onChange={(e) =>
                      handleDangerZoneInputChange("name", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ahmedabad Riverfront High Alert"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={dangerZoneForm.lat}
                    onChange={(e) =>
                      handleDangerZoneInputChange("lat", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="23.0225"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={dangerZoneForm.lng}
                    onChange={(e) =>
                      handleDangerZoneInputChange("lng", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="72.5714"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Radius (km)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={dangerZoneForm.radiusKm}
                    onChange={(e) =>
                      handleDangerZoneInputChange("radiusKm", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Risk Level
                  </label>
                  <select
                    value={dangerZoneForm.riskLevel}
                    onChange={(e) =>
                      handleDangerZoneInputChange("riskLevel", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={dangerZoneForm.category}
                    onChange={(e) =>
                      handleDangerZoneInputChange("category", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Crowd Surge"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={dangerZoneForm.state}
                    onChange={(e) =>
                      handleDangerZoneInputChange("state", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Gujarat"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={dangerZoneForm.source}
                    onChange={(e) =>
                      handleDangerZoneInputChange("source", e.target.value)
                    }
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Authority Manual Entry"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddZoneOpen(false);
                    setAddZoneError(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingZone}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-medium inline-flex items-center gap-2"
                >
                  {isSubmittingZone && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  {isSubmittingZone ? "Adding..." : "Add Danger Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isManageZonesOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 text-red-700 rounded-xl">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Manage Danger Zones
                  </h3>
                  <p className="text-xs text-gray-500">
                    Review, locate, or remove danger zones from the map
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                  {styledZones?.dangerZones?.length || 0} Total
                </span>
                <button
                  onClick={() => setIsManageZonesOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-white/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Input & Filter Tabs */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={zoneSearchQuery}
                  onChange={(e) => setZoneSearchQuery(e.target.value)}
                  placeholder="Search by zone name, state, or category..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => setZoneTypeFilter("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    zoneTypeFilter === "all"
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  All ({styledZones?.dangerZones?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setZoneTypeFilter("civilian")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    zoneTypeFilter === "civilian"
                      ? "bg-red-600 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-red-50 border border-gray-200"
                  }`}
                >
                  Civilian Hazards (
                  {(styledZones?.dangerZones || []).filter((z) => !isMilitaryZone(z)).length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setZoneTypeFilter("military")}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                    zoneTypeFilter === "military"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-gray-600 hover:bg-indigo-50 border border-gray-200"
                  }`}
                >
                  <Shield className="w-3 h-3" />
                  <span>
                    Military (
                    {(styledZones?.dangerZones || []).filter(isMilitaryZone).length}
                    )
                  </span>
                </button>
              </div>
            </div>

            {/* Zone List */}
            <div className="overflow-y-auto p-4 space-y-3 flex-1 divide-y divide-gray-100">
              {(() => {
                const zones = (styledZones?.dangerZones || []).filter((z) => {
                  const isMil = isMilitaryZone(z);
                  if (zoneTypeFilter === "civilian" && isMil) return false;
                  if (zoneTypeFilter === "military" && !isMil) return false;

                  if (!zoneSearchQuery.trim()) return true;
                  const q = zoneSearchQuery.toLowerCase();
                  return (
                    z.name?.toLowerCase().includes(q) ||
                    z.state?.toLowerCase().includes(q) ||
                    z.category?.toLowerCase().includes(q) ||
                    z.riskLevel?.toLowerCase().includes(q)
                  );
                });

                if (zones.length === 0) {
                  return (
                    <div className="text-center py-12 text-gray-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                      <p className="text-sm font-medium">No danger zones found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {zoneSearchQuery.trim()
                          ? "Try a different search keyword"
                          : zoneTypeFilter !== "all"
                            ? `No zones under "${zoneTypeFilter}" category`
                            : "No danger zones are currently registered on the map"}
                      </p>
                    </div>
                  );
                }

                return zones.map((zone) => {
                  const zoneKey = zone._id || (zone as any).id;
                  const isDeleting = isDeletingZoneId === zoneKey;
                  const lat = zone.coords?.[0];
                  const lng = zone.coords?.[1];
                  const isMil = isMilitaryZone(zone);

                  return (
                    <div
                      key={zoneKey}
                      className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl transition-colors ${
                        isMil ? "hover:bg-indigo-50/50" : "hover:bg-gray-50/60"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-gray-900 text-sm">
                            {zone.name}
                          </h4>
                          {isMil ? (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800 flex items-center gap-1 border border-indigo-200">
                              <Shield className="w-2.5 h-2.5" /> Military
                            </span>
                          ) : null}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              zone.riskLevel?.toLowerCase().includes("high")
                                ? "bg-red-100 text-red-800"
                                : zone.riskLevel?.toLowerCase() === "medium"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-green-100 text-green-800"
                            }`}
                          >
                            {zone.riskLevel?.toUpperCase()}
                          </span>
                          {zone.category && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-600">
                              {zone.category}
                            </span>
                          )}
                          {zone.state && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700">
                              {zone.state}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {lat != null && lng != null ? (
                            <span>
                              Coords: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                            </span>
                          ) : null}
                          {zone.radiusKm != null && (
                            <span> • Radius: {zone.radiusKm} km</span>
                          )}
                          {zone.type && <span> • Shape: {zone.type}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => handleFlyToZone(zone)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-700 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                          title="Locate on map"
                        >
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>Locate</span>
                        </button>
                        {confirmingZoneId === zoneKey ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDeleteDangerZone(zoneKey, zone.name)}
                              disabled={isDeleting}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-red-700 hover:bg-red-800 disabled:bg-red-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                              title="Confirm removal"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>Confirm?</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingZoneId(null)}
                              className="px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingZoneId(zoneKey)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                            title="Remove this danger zone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                Removing a zone stops geofence warnings and map indicators for this area.
              </span>
              <button
                type="button"
                onClick={() => setIsManageZonesOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TouristMap;
