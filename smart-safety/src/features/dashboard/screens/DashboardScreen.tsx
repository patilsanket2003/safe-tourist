import { ScrollView, View, StyleSheet, Alert, TouchableOpacity, Modal } from "react-native";
import { Text, Avatar, Card, Button, IconButton, Badge } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useApp } from "../../../context/AppContext";
import { useLocation } from "../../../context/LocationContext";
import { reverseGeocode } from "../../map/components/MapboxMap/geoUtils";
import SafetyScore from "../components/SafetyScore";
import PanicActions from "../../emergency/components/PanicActions";
import Weather from "../components/Weather";
import { useEffect, useState, useRef } from "react";
import { getGroupDashboard } from "../../../utils/api";
import GroupStatusCard from "../../trip/components/GroupStatusCard";
import DaminiAssistant from "../../ai/components/DaminiAssistant";
import touristSocket, {
  TouristAlert,
  SafetyScoreAlert,
  SOSAssignedAcknowledgement,
  SOSStatusUpdate,
} from "../../../services/touristSocketService";
import {
  drainPendingTouristLocations,
  startTouristBackgroundTrackingAsync,
  stopTouristBackgroundTrackingAsync,
} from "../../../services/backgroundLocation";
import * as Haptics from "expo-haptics";
import {
  configureNotificationHandler,
  scheduleNotification,
  requestNotificationPermissionStatus,
  getNotificationPermissionStatus,
} from "../../../utils/notificationsCompat";
import { showToast } from "../../../utils/toast";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configure notifications for critical alerts
configureNotificationHandler();

export default function DashboardScreen({ navigation }: any) {
  const { state } = useApp();
  const { currentAddress, setCurrentLocation, setCurrentAddress } =
    useLocation();
  const [groupData, setGroupData] = useState<any>(null);

  const isTourAdmin = state.user?.role === "tour-admin";

  useEffect(() => {
    const fetchGroupData = async () => {
      if (state.user && state.user.role !== "solo" && state.token) {
        try {
          const data = await getGroupDashboard(state.token);
          if (data && data.group) {
            setGroupData(data.group);
          } else if (data && data.groupName) {
            setGroupData(data);
          } else if (data && data.data) {
            setGroupData(data.data);
          }
        } catch (e) {
          console.error("Failed to fetch group dashboard:", e);
        }
      }
    };

    fetchGroupData();
  }, [state.user?.touristId, state.user?.role, state.token]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setCurrentLocation(location);

        const address = await reverseGeocode(
          location.coords.latitude,
          location.coords.longitude,
        );
        if (address) {
          setCurrentAddress(address);
        }
      } catch (err: any) {
        console.error("Dashboard location error:", err);
      }
    };

    fetchLocation();
  }, []);

  const handleEditItinerary = () => {
    if (groupData) {
      const startDate = groupData.startDate || new Date().toISOString();
      const endDate = groupData.endDate || new Date().toISOString();
      const start = new Date(startDate);
      const end = new Date(endDate);
      const tripDuration =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) ||
        7;

      navigation.navigate("BuildItinerary", {
        tripDuration,
        startDate,
        returnDate: endDate,
        touristId: state.user?.touristId || "unknown",
        initialItinerary: groupData.itinerary || [],
      });
    }
  };

  const getLocationDisplay = () => {
    if (currentAddress) {
      const parts = currentAddress.split(",");
      if (parts.length >= 2) {
        return parts
          .slice(-2)
          .map((s) => s.trim())
          .join(", ");
      }
      return currentAddress;
    }
    return "Getting location...";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const getUserName = () => {
    if (state.user?.name) {
      return state.user.name.split(" ")[0];
    }
    return "Explorer";
  };

  const getUserInitials = () => {
    if (state.user?.name) {
      const names = state.user.name.split(" ");
      if (names.length >= 2) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return "E";
  };

  const getAvatarColor = () => {
    const colors = [
      "#3B82F6",
      "#EF4444",
      "#10B981",
      "#F59E0B",
      "#8B5CF6",
      "#EC4899",
    ];
    const name = state.user?.name || "Explorer";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // --- Socket Logic ---
  const [alerts, setAlerts] = useState<TouristAlert[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  
  // --- Notification Modal State ---
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // --- SOS Notifications (for bell icon) ---
  interface SOSNotification {
    id: string;
    type: "sos_acknowledged" | "sos_responding" | "sos_resolved";
    title: string;
    message: string;
    unitName: string;
    unitRole: string;
    etaInfo: string;
    timestamp: number;
  }
  const [sosNotifications, setSosNotifications] = useState<SOSNotification[]>([]);

  // Storage keys
  const DONT_ASK_PUSH_NOTIF = "dont_ask_push_notification";

  // Load "don't ask again" preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const value = await AsyncStorage.getItem(DONT_ASK_PUSH_NOTIF);
        if (value === "true") {
          setDontAskAgain(true);
          console.log("ℹ️ User chose not to be asked about push notifications");
        }
      } catch (error) {
        console.error("Error loading preference:", error);
      }
    };
    loadPreference();
  }, []);

  // Function to get current location for periodic updates
  const getLocationForUpdates = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({});
        return { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch (e) {
      console.log("Error getting location for update", e);
    }
    return null;
  };

  // Check notification permissions on mount (but don't request yet)
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const currentStatus = await getNotificationPermissionStatus();
        console.log("🔔 Current notification permission:", currentStatus);
        
        if (currentStatus === "granted") {
          console.log("✅ Push notifications are enabled");
        } else {
          console.log("⚠️ Push notifications not enabled - user will only see in-app toasts");
        }
      } catch (error) {
        console.error("🔔 Error checking notification permissions:", error);
      }
    };
    
    checkPermissions();
  }, []);

  useEffect(() => {
    let statusInterval: NodeJS.Timeout | null = null;

    const initializeSocket = async () => {
      const touristId = state.user?.touristId || "guest";

      let coords = { lat: 0, lng: 0 };
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
        }
      } catch (e) {
        console.log("Error getting location", e);
      }

      touristSocket.connect(touristId, coords, state.user?.role || "tourist");

      // Keep location tracking alive while app is backgrounded.
      try {
        await startTouristBackgroundTrackingAsync(touristId);
      } catch (e) {
        console.warn("[Dashboard] Background location tracking not started:", e);
      }

      // Flush any queued background locations once the socket is available.
      try {
        const pending = await drainPendingTouristLocations();
        if (pending.length) {
          for (const p of pending) {
            touristSocket.updateLocation(p);
          }
          touristSocket.requestSafetyScoreUpdate();
        }
      } catch (e) {
        // best-effort
      }

      // Start real-time location tracking for safety score updates
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          console.log(
            "📍 Starting real-time location tracking for safety score",
          );
          const sub = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 2000, // Check every 2 seconds for live demonstration
              distanceInterval: 1, // Update every 1 meter so walking triggers updates
            },
            (loc) => {
              console.log(
                "📍 Location changed, sending update to backend:",
                loc.coords.latitude,
                loc.coords.longitude,
              );
              // Update global context so map updates immediately
              setCurrentLocation(loc);

              touristSocket.updateLocation({
                lat: loc.coords.latitude,
                lng: loc.coords.longitude,
                accuracy: loc.coords.accuracy,
                speed: loc.coords.speed,
                heading: loc.coords.heading,
                timestamp: new Date(loc.timestamp).toISOString(),
              });
            },
          );
          locationSubRef.current = sub;
        }
      } catch (e) {
        console.log("Error starting location watch", e);
        // Fallback to periodic if watch fails
        touristSocket.startPeriodicLocationUpdates(getLocationForUpdates);
      }

      // Check connection status periodically
      statusInterval = setInterval(() => {
        setSocketConnected(touristSocket.getConnectionStatus());
      }, 2000);

      // Listen for authority alerts
      touristSocket.onAuthorityAlert((alertData) => {
        handleIncomingAlert(alertData);
      });

      // Listen for danger zone / global hazard alerts
      touristSocket.onRestrictedZoneAlert((alertData) => {
        Alert.alert(
          "⚠️ DANGER ZONE ALERT",
          alertData.alertMessage || alertData.message || "You have entered a restricted or dangerous zone!",
          [{ text: "Understood", style: "default" }]
        );
      });

      // SafetyScore update listener is handled by SafetyScore component
      // to update the UI directly. We don't need a duplicate listener here.

      // Listen for safety score alerts
      touristSocket.onSafetyScoreAlert((alertData) => {
        handleSafetyScoreAlert(alertData);
      });

      // Listen for SOS assigned acknowledgement from authority
      touristSocket.onSOSAssignedAcknowledgement((data) => {
        handleSOSAcknowledgement(data);
      });

      // Listen for SOS status updates (e.g. resolved)
      touristSocket.onSOSStatusUpdate((data) => {
        handleSOSStatusUpdate(data);
      });

    };

    if (state.user?.touristId) {
      initializeSocket();
    }

    return () => {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
      if (statusInterval) {
        clearInterval(statusInterval);
      }
      // Stop background tracking when leaving the dashboard/logging out.
      stopTouristBackgroundTrackingAsync().catch(() => {});
    };
  }, [state.user?.touristId]);

  const handleIncomingAlert = async (alertData: TouristAlert) => {
    setAlerts((prev) => [alertData, ...prev]);
    
    // Increment unread count
    setUnreadCount((prev) => prev + 1);

    // Calculate expiration time from authority-provided expiresAt
    let expirationMs = 6 * 60 * 1000; // Default 6 minutes fallback
    
    if (alertData.expiresAt) {
      const expiresAtTime = new Date(alertData.expiresAt).getTime();
      const currentTime = Date.now();
      expirationMs = Math.max(0, expiresAtTime - currentTime);
    }

    // Auto-remove alert when it expires
    setTimeout(
      () => {
        setAlerts((prev) =>
          prev.filter((a) => a.alertId !== alertData.alertId),
        );
      },
      expirationMs,
    );

    // Haptic feedback based on priority (always works, no permission needed)
    try {
      if (alertData.priority === "critical") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (alertData.priority === "high") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {}

    // ALWAYS show in-app toast notification (no permission needed)
    const priorityEmoji = 
      alertData.priority === "critical" ? "🚨" :
      alertData.priority === "high" ? "⚠️" :
      alertData.priority === "medium" ? "⚡" : "ℹ️";
    
    showToast(
      `${priorityEmoji} ${alertData.title}: ${alertData.message}`,
      6000 // Show for 6 seconds
    );

    // Check if user has granted push notification permission
    const permissionStatus = await getNotificationPermissionStatus();

    // Function to send push notification (only if permission granted)
    const sendNotification = async () => {
      if (permissionStatus !== "granted") {
        return false;
      }

      try {
        const success = await scheduleNotification({
          content: {
            title: `🚨 ${alertData.title}`,
            body: `${alertData.message}${alertData.actionRequired ? `\n\nAction Required: ${alertData.actionRequired}` : ""}`,
            data: alertData,
            sound: true,
          },
          trigger: null,
        });
        return success;
      } catch (error) {
        return false;
      }
    };

    // Schedule push notifications only if permission granted: Immediate, 2 min, 4 min
    if (permissionStatus === "granted") {
      // 1. Immediate
      await sendNotification();

      // 2. After 2 minutes
      setTimeout(
        () => {
          sendNotification();
        },
        2 * 60 * 1000,
      );

      // 3. After 4 minutes
      setTimeout(
        () => {
          sendNotification();
        },
        4 * 60 * 1000,
      );
    }
  };

  const handleSafetyScoreAlert = async (alertData: SafetyScoreAlert) => {
    // Haptic feedback for critical changes
    if (
      alertData.changeType === "critical_threshold" ||
      alertData.changeType === "significant_drop"
    ) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Show notification
    await scheduleNotification({
      content: {
        title:
          alertData.changeType === "significant_drop"
            ? "⚠️ Safety Score Decreased"
            : "✅ Safety Score Improved",
        body: `${alertData.message}\nScore changed: ${alertData.previousScore} → ${alertData.newScore}`,
        data: alertData,
      },
      trigger: null,
    });

    // Show in-app alert for critical changes
    if (alertData.changeType === "critical_threshold") {
      Alert.alert(
        "⚠️ Safety Alert",
        `Your safety score has dropped significantly to ${alertData.newScore}.\n\n${alertData.message}`,
        [
          { text: "Dismiss", style: "cancel" },
          {
            text: "View Details",
            onPress: () => {},
          },
        ],
      );
    }
  };

  const handleSOSAcknowledgement = async (data: SOSAssignedAcknowledgement) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    let unitName = "";
    let unitRole = "";
    if (typeof data.assignedUnit === "string") {
      unitName = data.assignedUnit;
      unitRole = data.assignedRole || "";
    } else if (data.assignedUnit && typeof data.assignedUnit === "object") {
      unitName = (data.assignedUnit as any).fullName || "";
      unitRole = (data.assignedUnit as any).role || "";
    }

    const etaInfo = (data as any).etaLabel
      || ((data as any).etaMinutes != null ? `ETA: ${(data as any).etaMinutes} min` : "");

    const parts: string[] = ["✅ SOS Acknowledged"];
    if (unitName) parts.push(`Unit: ${unitName}`);
    if (unitRole) parts.push(`(${unitRole})`);
    if (etaInfo) parts.push(etaInfo);
    showToast(parts.join(" | "), 8000);

    const notifParts: string[] = [data.message || "A response unit has been assigned."];
    if (unitName) notifParts.push(`Unit: ${unitName}`);
    if (etaInfo) notifParts.push(etaInfo);

    await scheduleNotification({
      content: {
        title: "✅ SOS Acknowledged",
        body: notifParts.join("\n"),
        data,
      },
      trigger: null,
    });

    setSosNotifications((prev) => [{
      id: `sos-ack-${data.alertId}-${Date.now()}`,
      type: "sos_acknowledged",
      title: "✅ SOS Acknowledged",
      message: data.message || "A response unit has been assigned.",
      unitName,
      unitRole,
      etaInfo,
      timestamp: Date.now(),
    }, ...prev]);
    setUnreadCount((prev) => prev + 1);
  };

  const handleSOSStatusUpdate = async (data: SOSStatusUpdate) => {
    if (data.status === "responding") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      const etaInfo = (data as any).etaLabel
        || ((data as any).etaMinutes != null ? `ETA: ${(data as any).etaMinutes} min` : "");

      let unitName = "";
      if (data.assignedTo && data.assignedTo.length > 0) {
        const last = data.assignedTo[data.assignedTo.length - 1];
        unitName = last.fullName || "";
      }

      const parts = ["🚨 Help is on the way"];
      if (unitName) parts.push(`Unit: ${unitName}`);
      if (etaInfo) parts.push(etaInfo);
      showToast(parts.join(" | "), 8000);

      await scheduleNotification({
        content: {
          title: "🚨 Responding",
          body: parts.slice(1).join("\n") || "Help is on the way",
          data,
        },
        trigger: null,
      });

      setSosNotifications((prev) => [{
        id: `sos-resp-${data.alertId}-${Date.now()}`,
        type: "sos_responding",
        title: "🚨 Help is on the way",
        message: `Unit ${unitName} is responding`,
        unitName,
        unitRole: "",
        etaInfo,
        timestamp: Date.now(),
      }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    } else if (data.status === "resolved") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showToast(`✅ ${data.message || "Your SOS alert has been resolved"}`, 8000);

      await scheduleNotification({
        content: {
          title: "✅ SOS Resolved",
          body: data.message || "Your SOS alert has been resolved",
          data,
        },
        trigger: null,
      });

      setSosNotifications((prev) => [{
        id: `sos-resolved-${data.alertId}-${Date.now()}`,
        type: "sos_resolved",
        title: "✅ SOS Resolved",
        message: data.message || "Your SOS alert has been resolved.",
        unitName: "",
        unitRole: "",
        etaInfo: "",
        timestamp: Date.now(),
      }, ...prev]);
      setUnreadCount((prev) => prev + 1);
    }
  };

  const getAlertPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "#EF4444";
      case "high":
        return "#F97316";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerContentFull}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userName}>{getUserName()}</Text>
            <View style={styles.locationRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={14}
                color="#EF4444"
              />
              <Text style={styles.location} numberOfLines={1}>
                {getLocationDisplay()}
              </Text>
            </View>
            <View style={styles.connectionStatus}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: socketConnected ? "#10B981" : "#EF4444" },
                ]}
              />
              <Text style={styles.statusText}>
                {socketConnected ? "Live Alerts Active" : "Connecting..."}
              </Text>
            </View>
          </View>
          
          {/* Notification Bell Icon */}
          <View style={styles.notificationIconContainer}>
            <TouchableOpacity onPress={() => setShowNotificationModal(true)}>
              <MaterialCommunityIcons
                name={unreadCount > 0 ? "bell-badge" : "bell-outline"}
                size={28}
                color={unreadCount > 0 ? "#EF4444" : "#6B7280"}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sosSection}>
          <PanicActions />
        </View>

        {groupData && (
          <View style={styles.section}>
            <GroupStatusCard
              groupName={groupData.groupName || groupData.name || "My Group"}
              accessCode={groupData.accessCode || "Unknown"}
              memberCount={groupData.members ? groupData.members.length : 1}
              isTourAdmin={isTourAdmin}
              onEditItinerary={handleEditItinerary}
            />
          </View>
        )}

        <View style={styles.section}>
          <SafetyScore />
        </View>

        <View style={styles.section}>
          <Weather />
        </View>

      </ScrollView>

      {/* Notification Modal */}
      <Modal
        visible={showNotificationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                All Notifications
              </Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            {(alerts.length > 0 || sosNotifications.length > 0) && (
              <TouchableOpacity
                onPress={() => {
                  setUnreadCount(0);
                  showToast("✅ All notifications marked as read", 3000);
                }}
                style={styles.markAllReadButton}
              >
                <Text style={styles.markAllReadText}>Mark All as Read</Text>
              </TouchableOpacity>
            )}

            <ScrollView style={styles.modalScroll}>
              {alerts.length === 0 && sosNotifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="bell-off-outline"
                    size={64}
                    color="#D1D5DB"
                  />
                  <Text style={styles.emptyText}>No notifications</Text>
                  <Text style={styles.emptySubtext}>
                    You'll see alerts here when they arrive
                  </Text>
                </View>
              ) : (
                <>
                  {/* SOS Notifications */}
                  {sosNotifications.map((notif) => {
                    const isAcknowledged = notif.type === "sos_acknowledged";
                    const isResponding = notif.type === "sos_responding";
                    const isResolved = notif.type === "sos_resolved";
                    const iconColor = isResolved ? "#10B981" : isResponding ? "#F97316" : "#3B82F6";
                    const iconName = isResolved ? "check-circle" : isResponding ? "car-emergency" : "account-check";
                    const borderColor = isResolved ? "#10B981" : isResponding ? "#F97316" : "#3B82F6";

                    return (
                      <Card
                        key={notif.id}
                        style={{
                          marginBottom: 12,
                          borderLeftWidth: 5,
                          borderLeftColor: borderColor,
                        }}
                      >
                        <Card.Content>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <MaterialCommunityIcons name={iconName as any} size={24} color={iconColor} />
                            <Text variant="titleSmall" style={{ fontWeight: "bold", flex: 1 }}>
                              {notif.title}
                            </Text>
                          </View>
                          <Text variant="bodyMedium" style={{ marginTop: 6 }}>
                            {notif.message}
                          </Text>
                          {notif.unitName ? (
                            <Text variant="bodySmall" style={{ marginTop: 4, color: "#6B7280" }}>
                              Unit: {notif.unitName}{notif.unitRole ? ` (${notif.unitRole})` : ""}
                            </Text>
                          ) : null}
                          {notif.etaInfo ? (
                            <Text variant="bodySmall" style={{ marginTop: 2, color: "#F97316", fontWeight: "bold" }}>
                              {notif.etaInfo}
                            </Text>
                          ) : null}
                          <Text variant="bodySmall" style={{ marginTop: 6, color: "#9CA3AF" }}>
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </Text>
                        </Card.Content>
                      </Card>
                    );
                  })}

                  {/* Authority Alerts */}
                  {alerts.length > 0 && (
                    <Text variant="titleSmall" style={{ fontWeight: "bold", color: "#6B7280", marginBottom: 8, marginTop: 4 }}>
                      Authority Alerts
                    </Text>
                  )}
                  {alerts.map((alert) => (
                  <Card
                    key={alert.alertId}
                    style={{
                      marginBottom: 12,
                      borderLeftWidth: 5,
                      borderLeftColor: getAlertPriorityColor(alert.priority),
                    }}
                  >
                    <Card.Content>
                      <View style={styles.modalAlertHeader}>
                        <Text variant="titleSmall" style={{ fontWeight: "bold", flex: 1 }}>
                          {alert.title}
                        </Text>
                        <View style={[styles.priorityBadge, { backgroundColor: getAlertPriorityColor(alert.priority) }]}>
                          <Text style={styles.priorityText}>
                            {alert.priority.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                        {alert.message}
                      </Text>
                      
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          marginTop: 8,
                        }}
                      >
                        <Text variant="bodySmall" style={{ color: "#666" }}>
                          {alert.authorityName}
                        </Text>
                        <Text variant="bodySmall" style={{ color: "#666" }}>
                          {new Date(alert.timestamp).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Text>
                      </View>
                      {alert.actionRequired && (
                        <Text
                          variant="labelMedium"
                          style={{
                            marginTop: 8,
                            color: getAlertPriorityColor(alert.priority),
                            fontWeight: "bold",
                          }}
                        >
                          Action: {alert.actionRequired}
                        </Text>
                      )}
                    </Card.Content>
                  </Card>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: "#FAF8F5",
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 110,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  avatar: {
    marginRight: 14,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  headerContent: {
    flex: 1,
  },
  headerContentFull: {
    flex: 1,
    marginLeft: 0,
  },
  greetingText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 1,
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  connectionStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  sosSection: {
    alignItems: "center",
  },
  section: {
    width: "100%",
  },
  notificationIconContainer: {
    position: "relative",
    marginLeft: 12,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontWeight: "700",
    color: "#1F2937",
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 8,
  },
  markAllReadButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 20,
    marginTop: 12,
  },
  markAllReadText: {
    color: "#3B82F6",
    fontWeight: "600",
    fontSize: 14,
  },
  modalAlertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
});
