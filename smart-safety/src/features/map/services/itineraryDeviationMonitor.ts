import * as Location from 'expo-location';
import { haversineKm } from '../../../utils/geofenceLogic';
import { showToast } from '../../../utils/toast';
import { scheduleNotification } from '../../../utils/notificationsCompat';

/**
 * Itinerary Deviation Monitor
 * Monitors user's distance from their current day's itinerary locations
 * and alerts them if they're too far away
 */

const DEVIATION_THRESHOLD_KM = 5; // Alert if user is >5km from nearest itinerary location
const CHECK_INTERVAL_MS = 60000; // Check every 60 seconds
const NOTIFICATION_COOLDOWN_MS = 1800000; // 30 minutes cooldown between notifications

type ItineraryLocation = {
  name: string;
  coords: [number, number]; // [lat, lng]
  dayNumber: number;
};

let currentLocations: ItineraryLocation[] = [];
let lastNotificationTime = 0;
let isMonitoring = false;
let intervalId: NodeJS.Timeout | null = null;

/**
 * Set the current day's itinerary locations to monitor
 */
export function setCurrentDayItinerary(locations: ItineraryLocation[]) {
  currentLocations = locations;
  console.log(`[ItineraryDeviation] Monitoring ${locations.length} locations for today`);
}

/**
 * Calculate distance from user to nearest itinerary location
 */
function getDistanceToNearestLocation(
  userLat: number,
  userLng: number
): { distance: number; nearestLocation: ItineraryLocation | null } {
  if (currentLocations.length === 0) {
    return { distance: Infinity, nearestLocation: null };
  }

  let minDistance = Infinity;
  let nearest: ItineraryLocation | null = null;

  for (const loc of currentLocations) {
    const [lat, lng] = loc.coords;
    const distance = haversineKm([userLat, userLng], [lat, lng]);
    
    if (distance < minDistance) {
      minDistance = distance;
      nearest = loc;
    }
  }

  return { distance: minDistance, nearestLocation: nearest };
}

/**
 * Check if user is too far from itinerary and send notifications
 */
async function checkDeviation(userLocation: Location.LocationObject) {
  if (currentLocations.length === 0) {
    // No itinerary for today, skip check
    return;
  }

  const { latitude, longitude } = userLocation.coords;
  const { distance, nearestLocation } = getDistanceToNearestLocation(latitude, longitude);

  // Check if user is too far from nearest itinerary location
  if (distance > DEVIATION_THRESHOLD_KM) {
    const now = Date.now();
    
    // Cooldown check: don't spam notifications
    if (now - lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
      console.log(`[ItineraryDeviation] User is ${distance.toFixed(1)}km away, but notification on cooldown`);
      return;
    }

    lastNotificationTime = now;
    
    const message = nearestLocation
      ? `📍 You're ${distance.toFixed(1)}km from "${nearestLocation.name}". Please head to your itinerary location.`
      : `📍 You're ${distance.toFixed(1)}km from your itinerary. Please head to your planned location.`;

    console.log(`[ItineraryDeviation] Deviation detected: ${message}`);

    // Show toast notification
    showToast(message, 8000);

    // Send push notification
    try {
      await scheduleNotification({
        content: {
          title: '📍 Itinerary Deviation Alert',
          body: nearestLocation
            ? `You're ${distance.toFixed(1)}km away from "${nearestLocation.name}". Please return to your itinerary.`
            : `You're ${distance.toFixed(1)}km from your planned itinerary. Please return to your scheduled locations.`,
          sound: true,
          data: {
            type: 'itinerary_deviation',
            distance,
            nearestLocation: nearestLocation?.name,
          },
        },
        trigger: null, // Send immediately
      });
      console.log('[ItineraryDeviation] Push notification sent');
    } catch (error) {
      console.warn('[ItineraryDeviation] Failed to send push notification:', error);
    }
  } else {
    // User is within acceptable range
    console.log(`[ItineraryDeviation] User is ${distance.toFixed(1)}km from nearest location (within threshold)`);
  }
}

/**
 * Start monitoring itinerary deviation
 */
export async function startMonitoring() {
  if (isMonitoring) {
    console.log('[ItineraryDeviation] Already monitoring');
    return;
  }

  console.log('[ItineraryDeviation] Starting deviation monitoring');
  isMonitoring = true;

  // Request location permissions
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    console.warn('[ItineraryDeviation] Location permission denied');
    isMonitoring = false;
    return;
  }

  // Set up periodic check
  intervalId = setInterval(async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await checkDeviation(location);
    } catch (error) {
      console.warn('[ItineraryDeviation] Location check failed:', error);
    }
  }, CHECK_INTERVAL_MS);

  // Do an immediate check
  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    await checkDeviation(location);
  } catch (error) {
    console.warn('[ItineraryDeviation] Initial location check failed:', error);
  }
}

/**
 * Stop monitoring itinerary deviation
 */
export function stopMonitoring() {
  if (!isMonitoring) {
    return;
  }

  console.log('[ItineraryDeviation] Stopping deviation monitoring');
  
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  isMonitoring = false;
  currentLocations = [];
  lastNotificationTime = 0;
}

/**
 * Check if monitoring is active
 */
export function isActive(): boolean {
  return isMonitoring;
}
