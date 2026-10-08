import io, { Socket } from "socket.io-client";
import { Platform } from "react-native";
import { Alert } from "react-native";
import { SERVER_URL } from "../config";

// Configuration - Use centralized server URL from config
const SOCKET_URL = SERVER_URL;

export interface TouristAlert {
  alertId: string;
  type: "emergency" | "warning" | "info" | "weather" | "civil_unrest";
  title: string;
  message: string;
  priority: "critical" | "high" | "medium" | "low";
  timestamp: string;
  authorityName: string;
  authorityId: string;
  requiresAcknowledgment: boolean;
  actionRequired: string | null;
  expiresAt: string | null;
  targetArea: {
    lat: number;
    lng: number;
    radius: number;
  } | null;
  distanceFromEvent?: number;
}

export interface SafetyScoreData {
  safetyScore: number;
  timestamp: string;
  safetyLevel?: string;
  safetyColor?: string;
  description?: string;
  geofenceScore?: number;
  weatherScore?: number;
  nearestThreat?: {
    name: string;
    distance: number;
    severity: string;
    type: string;
    impact: number;
    coordinates?: any;
  };
  threats?: any[];
  totalThreats?: number;
  location?: {
    lat: number;
    lng: number;
  };
}

export interface SafetyScoreAlert {
  previousScore: number;
  newScore: number;
  changeType:
  | "significant_drop"
  | "significant_increase"
  | "critical_threshold";
  message: string;
  safetyScoreData: SafetyScoreData;
}

export interface SOSAssignedAcknowledgement {
  alertId: string;
  status: string;
  assignedUnit: string | { authorityId: string; fullName: string; role?: string };
  assignedRole?: string;
  assignedTo?: Array<{ authorityId: string; fullName: string; role?: string }>;
  acknowledgedAt: string;
  message: string;
  etaMinutes?: number;
  etaLabel?: string;
  etaArrivalAt?: string;
}

export interface SOSStatusUpdate {
  alertId: string;
  status: "new" | "acknowledged" | "responding" | "resolved" | "closed";
  assignedTo?: Array<{ authorityId: string; fullName: string; role?: string }>;
  responseDate?: string;
  responseTime?: string;
  resolvedDate?: string;
  message: string;
  etaMinutes?: number;
  etaLabel?: string;
  etaArrivalAt?: string;
}

interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: string | null;
}

class TouristSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private touristId: string | null = null;
  private role: string = 'tourist';
  private locationUpdateInterval: NodeJS.Timeout | null = null;

  private listeners: Record<string, Function[]> = {};
  private pendingListeners: Array<{ event: string; callback: Function }> = [];

  // Track all active socket listeners for reconnection
  private activeSocketListeners: Map<string, Set<Function>> = new Map();

  /**
   * Initialize and connect to the socket server
   * @param {string} touristId - Unique tourist ID from your auth system
   * @param {LocationCoords} initialLocation - { lat: number, lng: number }
   * @param {string} role - The role of the user (e.g. tourist, emergency_vehicle)
   */
  connect(touristId: string, initialLocation: LocationCoords, role: string = "tourist") {
    this.touristId = touristId;
    this.role = role;

    // If socket already exists, do not create another instance
    if (this.socket) {
      // Ensure connection attempt continues if socket exists but is not connected yet
      if (!this.isConnected && !this.socket.connected) {
        console.log("[TouristSocket] 🔄 Socket exists but disconnected, reconnecting...");
        this.socket.connect();
      }
      return;
    }

    // Create socket connection
    // Start with polling for better compatibility, then upgrade to websocket
    this.socket = io(SOCKET_URL, {
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      autoConnect: true,
    });

    // Handle connection event
    this.socket.on("connect", () => {
      console.log(
        `[TouristSocket] ✅ Connected to server with socket ID: ${this.socket?.id}`,
      );
      this.isConnected = true;

      if (role === 'emergency_vehicle') {
        console.log(`[TouristSocket] 🚨 Registering as emergency vehicle: ${this.touristId}`);
        this.socket?.emit("registerEmergencyVehicle", {
          role: "emergency_vehicle",
          vehicleId: this.touristId,
          location: initialLocation,
        });
      } else {
        console.log(`[TouristSocket] 📝 Registering as tourist: ${this.touristId}`);
        this.socket?.emit("registerTourist", {
          role: "tourist",
          touristId: this.touristId,
          location: initialLocation,
        });
      }

      // Re-attach ALL active listeners (for reconnection scenarios)
      this.reattachAllListeners();

      // Attach any pending listeners that were added before connection
      this.attachPendingListeners();
    });

    // Handle registration confirmation
    this.socket.on("registrationConfirmed", (data: any) => {
      console.log(
        "[TouristSocket] ✅ Registration confirmed by backend:",
        data,
      );
    });

    // Handle risk grid updates
    this.socket.on("riskGridUpdated", (gridData: any) => {
      console.log(`Risk grid update broadcasted: ${gridData.gridId}`);
      this.emit("riskGridUpdated", gridData);
    });

    // Handle safety score updates globally so app-level listeners always receive them
    this.socket.on("safetyScoreUpdate", (data: SafetyScoreData) => {
      this.emit("safetyScoreUpdate", data);
    });

    // Handle connection errors
    this.socket.on("connect_error", (error: any) => {
      console.error("[TouristSocket] ❌ Connection error:", error);
      console.error(
        "[TouristSocket] ❌ Error details:",
        error.message,
        error.description,
      );
      console.error(
        `[TouristSocket] ❌ Attempting to connect to: ${SOCKET_URL}`,
      );
      this.isConnected = false;
    });

    // Handle disconnection
    this.socket.on("disconnect", (reason: any) => {
      console.warn(`[TouristSocket] ⚠️ Disconnected from server. Reason: ${reason}`);
      this.isConnected = false;

      // Auto-reconnect if server disconnected
      if (reason === "io server disconnect") {
        console.log("[TouristSocket] 🔄 Server disconnected, attempting to reconnect...");
        this.socket?.connect();
      }
    });
  }

  /**
   * Listen for authority alerts
   * @param {function} callback - Function to handle incoming alerts
   */
  onAuthorityAlert(callback: (alert: TouristAlert) => void) {
    if (!this.socket) {
      // Queue the listener to be attached when socket connects
      this.pendingListeners.push({ event: "authorityAlert", callback });
      return;
    }

    this.socket?.off("authorityAlert");
    this.socket?.on("authorityAlert", (alertData: TouristAlert) => {
      callback(alertData);
    });
  }

  /**
   * Listen for restricted zone alerts
   * @param {function} callback - Function to handle incoming alerts
   */
  onRestrictedZoneAlert(callback: (alert: any) => void) {
    if (!this.socket) {
      this.pendingListeners.push({ event: "restrictedZoneAlert", callback });
      return;
    }

    this.socket?.off("restrictedZoneAlert");
    this.socket?.on("restrictedZoneAlert", (alertData: any) => {
      callback(alertData);
    });
  }

  /**
   * Listen for safety score updates from backend
   * @param {function} callback - Function to handle safety score updates
   * @returns {function} - Cleanup function to remove the listener
   */
  onSafetyScoreUpdate(callback: (data: SafetyScoreData) => void) {
    if (!this.socket) {
      console.warn(
        "[TouristSocket] ⚠️ Socket not initialized, queuing safetyScoreUpdate listener",
      );
      // Queue the listener to be attached when socket connects
      this.pendingListeners.push({ event: "safetyScoreUpdate", callback });

      // Return cleanup function that will work even if queued
      return () => {
        this.pendingListeners = this.pendingListeners.filter(
          (l) => !(l.event === "safetyScoreUpdate" && l.callback === callback)
        );
      };
    }

    console.log(
      "[TouristSocket] ✅ Attaching safetyScoreUpdate listener to socket",
    );

    // Define the wrapper function to call callback
    const listener = (data: SafetyScoreData) => {
      console.log(
        "[TouristSocket] 📥 safetyScoreUpdate event received from backend:",
        data,
      );
      callback(data);
    };

    // Add new listener (supports multiple listeners now)
    this.socket.on("safetyScoreUpdate", listener);

    // Track this listener for reconnection
    if (!this.activeSocketListeners.has("safetyScoreUpdate")) {
      this.activeSocketListeners.set("safetyScoreUpdate", new Set());
    }
    this.activeSocketListeners.get("safetyScoreUpdate")!.add(listener);
    console.log(
      `[TouristSocket] 📌 Tracking safetyScoreUpdate listener (total: ${this.activeSocketListeners.get("safetyScoreUpdate")!.size})`,
    );

    // Return cleanup function
    return () => {
      if (this.socket) {
        this.socket.off("safetyScoreUpdate", listener);
        // Remove from active listeners tracking
        this.activeSocketListeners.get("safetyScoreUpdate")?.delete(listener);
        console.log(
          "[TouristSocket] 🧹 Removed safetyScoreUpdate listener",
        );
      }
    };
  }

  /**
   * Listen for critical safety score alerts
   * @param {function} callback - Function to handle safety score alerts
   */
  onSafetyScoreAlert(callback: (alert: SafetyScoreAlert) => void) {
    if (!this.socket) {
      // Queue the listener to be attached when socket connects
      this.pendingListeners.push({ event: "safetyScoreAlert", callback });
      return;
    }

    this.socket?.off("safetyScoreAlert");
    this.socket?.on("safetyScoreAlert", (alert: SafetyScoreAlert) => {
      callback(alert);
    });
  }

  /**
   * Listen for SOS assigned acknowledgement from authority
   * Fires when an authority assigns a unit to the tourist's SOS alert
   * @param {function} callback - Function to handle the acknowledgement
   */
  onSOSAssignedAcknowledgement(callback: (data: SOSAssignedAcknowledgement) => void) {
    if (!this.socket) {
      this.pendingListeners.push({ event: "sosAssignedAcknowledgement", callback });
      return;
    }

    this.socket.off("sosAssignedAcknowledgement");
    this.activeSocketListeners.delete("sosAssignedAcknowledgement");

    const listener = (data: SOSAssignedAcknowledgement) => {
      callback(data);
    };

    this.socket.on("sosAssignedAcknowledgement", listener);

    if (!this.activeSocketListeners.has("sosAssignedAcknowledgement")) {
      this.activeSocketListeners.set("sosAssignedAcknowledgement", new Set());
    }
    this.activeSocketListeners.get("sosAssignedAcknowledgement")!.add(listener);
  }

  /**
   * Listen for SOS status updates (e.g. resolved)
   * @param {function} callback - Function to handle status updates
   */
  onSOSStatusUpdate(callback: (data: SOSStatusUpdate) => void) {
    if (!this.socket) {
      this.pendingListeners.push({ event: "sosStatusUpdate", callback });
      return;
    }

    this.socket.off("sosStatusUpdate");
    this.activeSocketListeners.delete("sosStatusUpdate");

    const listener = (data: SOSStatusUpdate) => {
      callback(data);
    };

    this.socket.on("sosStatusUpdate", listener);

    if (!this.activeSocketListeners.has("sosStatusUpdate")) {
      this.activeSocketListeners.set("sosStatusUpdate", new Set());
    }
    this.activeSocketListeners.get("sosStatusUpdate")!.add(listener);
  }

  /**
   * Listen for emergency vehicle updates
   */
  onEmergencyVehicleUpdate(callback: (data: any) => void) {
    if (!this.socket) {
      this.pendingListeners.push({ event: "emergencyVehicleUpdate", callback });
      return;
    }

    this.socket.off("emergencyVehicleUpdate");
    this.activeSocketListeners.delete("emergencyVehicleUpdate");

    const listener = (data: any) => {
      callback(data);
    };

    this.socket.on("emergencyVehicleUpdate", listener);

    if (!this.activeSocketListeners.has("emergencyVehicleUpdate")) {
      this.activeSocketListeners.set("emergencyVehicleUpdate", new Set());
    }
    this.activeSocketListeners.get("emergencyVehicleUpdate")!.add(listener);
  }

  /**
   * Update tourist location in real-time
   * @param {LocationCoords} location - { lat: number, lng: number }
   */
  updateLocation(location: LocationCoords) {
    if (!this.socket) {
      console.warn(
        "[TouristSocket] ⚠️ Socket not initialized, cannot update location",
      );
      return;
    }

    if (!this.isConnected) {
      console.warn(
        "[TouristSocket] ⚠️ Socket not connected, queueing location update",
      );
    }

    console.log(
      `[TouristSocket] 📍 Updating location: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`,
    );
    // We don't have the role stored easily, but we can assume if it's an emergency_vehicle based on ID or similar.
    // However, the easiest way is to add a `role` property to the class. Let me check if I can just emit `updateTouristLocation`. Wait, I need to emit `updateEmergencyVehicleLocation` if role is emergency vehicle.
    // I will add a private role property and check it here.

    const payload: any = {
      location: location,
      lat: location.lat,
      lng: location.lng,
      latitude: location.lat,
      longitude: location.lng,
      accuracy: location.accuracy ?? null,
      speed: location.speed ?? null,
      heading: location.heading ?? null,
      timestamp: location.timestamp || new Date().toISOString(),
    };

    if (this.role === 'emergency_vehicle') {
      payload.vehicleId = this.touristId;

      // Determine type from ID (e.g. ambulance-123 -> ambulance)
      let vType = 'police';
      if (this.touristId.toLowerCase().includes('ambulance')) vType = 'ambulance';
      else if (this.touristId.toLowerCase().includes('fire')) vType = 'fire';

      payload.type = vType;
      this.socket.emit("updateEmergencyVehicleLocation", payload);
    } else {
      payload.touristId = this.touristId || "T001";
      payload.userId = this.touristId || "T001";
      this.socket.emit("updateTouristLocation", payload);
    }
  }

  /**
   * Start periodic location updates (every 45 seconds)
   * @param {function} getLocationFunc - Async function that returns current location coords
   */
  startPeriodicLocationUpdates(
    getLocationFunc: () => Promise<LocationCoords | null>,
  ) {
    // Clear any existing interval
    this.stopPeriodicLocationUpdates();

    // Send initial update
    getLocationFunc().then((coords) => {
      if (coords) this.updateLocation(coords);
    });

    // Set up periodic updates every 45 seconds
    this.locationUpdateInterval = setInterval(async () => {
      const coords = await getLocationFunc();
      if (coords) {
        this.updateLocation(coords);
      }
    }, 45000); // 45 seconds
  }

  /**
   * Stop periodic location updates
   */
  stopPeriodicLocationUpdates() {
    if (this.locationUpdateInterval) {
      clearInterval(this.locationUpdateInterval);
      this.locationUpdateInterval = null;
    }
  }

  /**
   * Disconnect from socket server
   */
  disconnect() {
    this.stopPeriodicLocationUpdates();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      // Clear active listeners tracking on explicit disconnect
      this.activeSocketListeners.clear();
      this.pendingListeners = [];
    }
  }
  requestSafetyScoreUpdate() {
    if (!this.socket) {
      console.error(
        "[TouristSocket] ❌ Socket not initialized, cannot request safety score update",
      );
      return;
    }

    if (!this.isConnected) {
      console.warn(
        "[TouristSocket] ⚠️ Socket not connected yet, cannot request safety score update",
      );
      return;
    }

    console.log(
      "[TouristSocket] 🔄 Requesting immediate safety score update from backend",
    );
    this.socket.emit("requestSafetyScoreUpdate");
    console.log("[TouristSocket] ✅ requestSafetyScoreUpdate event emitted");
  }

  /**
   * Check if socket is connected
   */
  getConnectionStatus() {
    return this.isConnected;
  }

  /**
   * Check if socket is initialized (connect has been called)
   */
  isInitialized() {
    return this.socket !== null;
  }

  /**
   * Re-attach all active listeners (called on reconnect)
   */
  private reattachAllListeners() {
    if (!this.socket || this.activeSocketListeners.size === 0) {
      return;
    }

    console.log(`📡 Re-attaching ${this.activeSocketListeners.size} active listener type(s) after reconnect`);

    for (const [event, listeners] of this.activeSocketListeners.entries()) {
      // Remove existing listeners for this event first to avoid stacking
      this.socket.off(event);
      console.log(`📡 Re-attaching ${listeners.size} listener(s) for event: ${event}`);
      for (const listener of listeners) {
        this.socket.on(event, listener as any);
      }
    }
  }

  /**
   * Attach any listeners that were added before socket was connected
   */
  private attachPendingListeners() {
    if (!this.socket || this.pendingListeners.length === 0) {
      return;
    }

    console.log(`📡 Attaching ${this.pendingListeners.length} pending listener(s)`);

    // Attach each pending listener
    for (const { event, callback } of this.pendingListeners) {
      if (event === "authorityAlert") {
        this.socket.off("authorityAlert");
        this.socket.on("authorityAlert", callback as any);
        // Track for reconnection
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "safetyScoreUpdate") {
        this.socket.on("safetyScoreUpdate", callback as any);
        // Track for reconnection
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "safetyScoreAlert") {
        this.socket.off("safetyScoreAlert");
        this.socket.on("safetyScoreAlert", callback as any);
        // Track for reconnection
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "restrictedZoneAlert") {
        this.socket.off("restrictedZoneAlert");
        this.socket.on("restrictedZoneAlert", callback as any);
        // Track for reconnection
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "sosAssignedAcknowledgement") {
        this.socket.off("sosAssignedAcknowledgement");
        this.socket.on("sosAssignedAcknowledgement", callback as any);
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "sosStatusUpdate") {
        this.socket.off("sosStatusUpdate");
        this.socket.on("sosStatusUpdate", callback as any);
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      } else if (event === "emergencyVehicleUpdate") {
        this.socket.off("emergencyVehicleUpdate");
        this.socket.on("emergencyVehicleUpdate", callback as any);
        if (!this.activeSocketListeners.has(event)) {
          this.activeSocketListeners.set(event, new Set());
        }
        this.activeSocketListeners.get(event)!.add(callback);
      }
    }

    // Clear the pending listeners
    this.pendingListeners = [];
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);

    // Return cleanup function
    return () => {
      this.listeners[event] = this.listeners[event].filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Emit internal service event
   */
  private emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb(data));
    }
  }
}

// Export singleton instance
export default new TouristSocketService();
