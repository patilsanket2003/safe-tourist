const socketio = require('socket.io');
const fallbackService = require('./fallbackService');
const blockchainService = require('./blockchainService');
const { calculateSafetyScore, shouldNotifyScoreChange } = require('./safetyScoreService');
const { evaluateTouristGeofences, getCollegeZone } = require('./geofenceEngineService');


let io; // This will hold the Socket.IO server instance
let authoritySockets = new Map(); // Map to store connected authorities
let touristSockets = new Map(); // Map to store connected tourists
let touristLastScores = new Map(); // Store last safety score for each tourist
let touristLastLocations = new Map();

// Family live location sharing map: sharerTouristId -> Set of recipientTouristIds
let familyLiveSharingMap = new Map();
let sharerMetaMap = new Map(); // sharerTouristId -> { name }

// Export the locations map to be used by analytics or other controllers
exports.getTouristLocations = () => touristLastLocations;
exports.isTouristOnline = (touristId) => {
  if (!touristId) return false;
  const set = touristSockets.get(String(touristId));
  return Boolean(set && set.size > 0);
};

const SAFETY_POLL_INTERVAL_MS =  60 * 1000; // 30 minutes
let safetyPollTimer = null;

/**
 * Initializes the Socket.IO server and attaches it to the HTTP server.
 * @param {object} httpServer The Node.js HTTP server instance.
 */
exports.init = (httpServer) => {
  io = socketio(httpServer, {
    cors: {
      origin: true, // Allow all origins dynamically for production
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Start periodic safety score polling (every 30 minutes) using last known locations
  if (!safetyPollTimer) {
    safetyPollTimer = setInterval(runPeriodicSafetyScoreUpdate, SAFETY_POLL_INTERVAL_MS);
  }

  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}`);

    // Store the socket if it's an authority, based on a handshake payload
    socket.on('registerAuthority', (data) => {
      if (data && data.role === 'authority' && data.userId) {
        const userId = data.userId;

        // Attach userId to the socket for easy cleanup on disconnect
        socket.data = socket.data || {};
        socket.data.userId = userId;
        socket.data.userType = 'authority';

        // Add socket to the set for this userId (allow multiple sockets per authority)
        let set = authoritySockets.get(userId);
        if (!set) {
          set = new Set();
          authoritySockets.set(userId, set);
        }
        set.add(socket);

        // Join a global 'authorities' room and a per-user room
        socket.join('authorities');
        socket.join(`authority:${userId}`);

        socket.emit('registered', { success: true, role: 'authority', userId });
        console.log(`Authority ${userId} registered with socket ${socket.id} (sockets for user: ${set.size})`);
      }
    });

    // Emergency Vehicle Registration & Update
    socket.on('registerEmergencyVehicle', (data) => {
      if (data && data.role === 'emergency_vehicle' && data.vehicleId) {
        socket.data = socket.data || {};
        socket.data.vehicleId = data.vehicleId;
        socket.data.userType = 'emergency_vehicle';
        socket.join('emergency_vehicles');
        socket.emit('registered', { success: true, role: 'emergency_vehicle', vehicleId: data.vehicleId });
        console.log(`Emergency Vehicle ${data.vehicleId} registered with socket ${socket.id}`);
      }
    });

    socket.on('updateEmergencyVehicleLocation', (data) => {
      // data: { vehicleId, type, lat, lng, route (optional) }
      if (socket.data && socket.data.userType === 'emergency_vehicle') {
        io.emit('emergencyVehicleUpdate', data);
      }
    });

    // Store the socket if it's a tourist, based on a handshake payload
    socket.on('registerTourist', async (data) => {
      if (data && data.role === 'tourist' && data.touristId) {
        const touristId = data.touristId;
        const location = data.location; // { lat, lng }

        // Attach touristId to the socket for easy cleanup on disconnect
        socket.data = socket.data || {};
        socket.data.touristId = touristId;
        socket.data.userType = 'tourist';
        socket.data.location = location; // Store current location
        
        const lat = Number(location?.lat ?? location?.latitude);
        const lng = Number(location?.lng ?? location?.longitude);

        if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) && !(Math.abs(lat - 19.0760) < 0.001 && Math.abs(lng - 72.8777) < 0.001)) {
          touristLastLocations.set(touristId, {
            lat,
            lng,
            updatedAt: Date.now(),
            lastCalcAt: 0
          });
          try {
            const mongoose = require('mongoose');
            const Tourist = require('../models/Tourist');
            const query = mongoose.isValidObjectId(touristId)
              ? { $or: [{ touristId: touristId }, { _id: touristId }] }
              : { touristId: touristId };
            Tourist.updateOne(query, { $set: { lastKnownLocation: { lat, lng, updatedAt: new Date() } } }).exec().catch(() => {});
          } catch (e) {}
        }

        // Add socket to the set for this touristId (allow multiple devices per tourist)
        let set = touristSockets.get(touristId);
        if (!set) {
          set = new Set();
          touristSockets.set(touristId, set);
        }
        set.add(socket);

        // Join a global 'tourists' room and a per-user room
        socket.join('tourists');
        socket.join(`tourist:${touristId}`);

        console.log(`Tourist ${touristId} registered with socket ${socket.id} (sockets for user: ${set.size})`);

        // Calculate initial safety score and check geofence
        if (Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)) {
          try {
            const geofenceResult = await evaluateTouristGeofences(touristId, lat, lng);
            const safetyScoreData = await calculateSafetyScore(lat, lng);
            const initialScore = geofenceResult.isInsideRestricted ? 20 : safetyScoreData.safetyScore;

            // Store initial score
            touristLastScores.set(touristId, initialScore);

            // Send safety score to tourist
            socket.emit('safetyScoreUpdate', {
              ...safetyScoreData,
              safetyScore: initialScore,
              safetyLevel: geofenceResult.isInsideRestricted ? 'Critical' : safetyScoreData.safetyLevel
            });

            // If already inside restricted zone on register, emit enter event
            if (geofenceResult.isInsideRestricted && geofenceResult.events.length > 0) {
              const enterEvent = geofenceResult.events[0];
              io.to('authorities').emit('restrictedZoneAlert', enterEvent);
              io.to('authorities').emit('geofenceAlert', enterEvent);
              io.to('authorities').emit('geofence:enter', enterEvent);
            }

            // Broadcast initial position to Authority Dashboard immediately
            const initialPayload = {
              touristId,
              userId: touristId,
              location: { lat, lng },
              timestamp: new Date().toISOString(),
              safetyScore: initialScore,
              status: geofenceResult.isInsideRestricted ? 'restricted' : 'active',
              zoneStatus: geofenceResult.isInsideRestricted ? 'RESTRICTED ZONE' : 'SAFE'
            };
            io.to('authorities').emit('locationUpdate', initialPayload);
            io.to('authorities').emit('touristStatusChanged', {
              touristId,
              id: touristId,
              status: 'active',
              isOnline: true,
              location: { lat, lng }
            });
            io.emit('tourist:location', initialPayload);
          } catch (error) {
            console.error(`Failed initial geofence/safety check for ${touristId}:`, error);
          }
        }

        // Send confirmation
        socket.emit('registrationConfirmed', {
          success: true,
          touristId: touristId,
          message: 'Connected to real-time safety network'
        });
      }
    });

    // Update tourist location in real-time
    socket.on('updateTouristLocation', async (data) => {
      try {
        const touristId = socket.data?.touristId || data.touristId || data.userId || 'T001';
        
        // Extract latitude and longitude flexibly
        const lat = Number(data.lat ?? data.latitude ?? data.location?.lat ?? data.location?.latitude);
        const lng = Number(data.lng ?? data.longitude ?? data.location?.lng ?? data.location?.longitude);
        const accuracy = data.accuracy ?? data.location?.accuracy ?? null;
        const speed = data.speed ?? data.location?.speed ?? null;
        const heading = data.heading ?? data.location?.heading ?? null;
        const timestamp = data.timestamp || new Date().toISOString();
        const now = Date.now();

        // Coordinates validation - ignore (0, 0) and mock demo coordinates (19.076, 72.8777)
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || (lat === 0 && lng === 0) || (Math.abs(lat - 19.0760) < 0.001 && Math.abs(lng - 72.8777) < 0.001)) {
          return;
        }

        // Ensure socket has tourist metadata
        socket.data = socket.data || {};
        socket.data.touristId = touristId;
        socket.data.userType = 'tourist';
        socket.data.location = { lat, lng };

        // Distance & throttling check
        const lastEntry = touristLastLocations.get(touristId);
        const lastLoc = lastEntry ? { lat: lastEntry.lat, lng: lastEntry.lng } : null;
        const lastCalcAt = (lastEntry && lastEntry.lastCalcAt) || 0;

        let distanceMoved = 0;
        if (lastLoc) {
          distanceMoved = calculateDistance(lastLoc.lat, lastLoc.lng, lat, lng);
        }

        // Throttle updates that are too close in time (< 1.5s) AND movement < 1m
        const timeDiff = now - lastCalcAt;
        if (lastLoc && timeDiff < 1500 && distanceMoved < 1) {
          return;
        }

        // Update stored location cache
        touristLastLocations.set(touristId, {
          lat,
          lng,
          accuracy,
          speed,
          heading,
          updatedAt: now,
          lastCalcAt: now
        });

        // Persist to MongoDB Tourist document so locations survive restarts
        if (!(lat === 0 && lng === 0)) {
          try {
            const mongoose = require('mongoose');
            const Tourist = require('../models/Tourist');
            const query = mongoose.isValidObjectId(touristId)
              ? { $or: [{ touristId: touristId }, { _id: touristId }] }
              : { touristId: touristId };
            Tourist.updateOne(query, { $set: { lastKnownLocation: { lat, lng, updatedAt: new Date() } } }).exec().catch(() => {});
          } catch (e) {}
        }

        // ==========================================
        // 1. GEOSPATIAL / GEOFENCE EVALUATION
        // ==========================================
        const geofenceResult = await evaluateTouristGeofences(touristId, lat, lng, timestamp);

        // Process geofence transition events (ENTER / EXIT)
        if (geofenceResult.events && geofenceResult.events.length > 0) {
          for (const ev of geofenceResult.events) {
            if (ev.event === 'ENTER') {
              console.log(`🚨 [Geofence] Tourist ${touristId} ENTERED restricted zone: ${ev.zoneName}`);

              // Broadcast real-time restricted zone alert to Authority Dashboard
              io.to('authorities').emit('restrictedZoneAlert', ev);
              io.to('authorities').emit('geofenceAlert', ev);
              io.to('authorities').emit('geofence:enter', ev);

              // Geofence alert sent to authorities for UI status update (NO SOS audio alarm)

              // Notify the tourist phone
              socket.emit('restrictedZoneWarning', {
                status: 'RESTRICTED ZONE',
                isInside: true,
                zoneName: ev.zoneName,
                riskLevel: ev.riskLevel,
                message: ev.alertMessage,
                timestamp: ev.timestamp
              });
              socket.emit('geofenceTransition', {
                status: 'RESTRICTED ZONE',
                event: 'ENTER',
                zone: ev.zoneName,
                alertMessage: ev.alertMessage
              });
            } else if (ev.event === 'EXIT') {
              console.log(`🟢 [Geofence] Tourist ${touristId} EXITED restricted zone: ${ev.zoneName}`);

              io.to('authorities').emit('restrictedZoneExit', ev);
              io.to('authorities').emit('geofenceAlert', ev);
              io.to('authorities').emit('geofence:exit', ev);

              // Notify the tourist phone
              socket.emit('restrictedZoneWarning', {
                status: 'SAFE',
                isInside: false,
                zoneName: ev.zoneName,
                message: ev.alertMessage,
                timestamp: ev.timestamp
              });
              socket.emit('geofenceTransition', {
                status: 'SAFE',
                event: 'EXIT',
                zone: ev.zoneName,
                alertMessage: ev.alertMessage
              });
            }
          }
        }

        // ==========================================
        // 2. SAFETY SCORE CALCULATION
        // ==========================================
        let newScore = 85;
        let safetyScoreData = null;
        try {
          safetyScoreData = await calculateSafetyScore(lat, lng);
          newScore = geofenceResult.isInsideRestricted ? 20 : safetyScoreData.safetyScore;
          touristLastScores.set(touristId, newScore);

          socket.emit('safetyScoreUpdate', {
            ...safetyScoreData,
            safetyScore: newScore,
            safetyLevel: geofenceResult.isInsideRestricted ? 'CRITICAL' : safetyScoreData.safetyLevel,
            safetyColor: geofenceResult.isInsideRestricted ? '#dc2626' : safetyScoreData.safetyColor,
          });
        } catch (scoreErr) {
          newScore = geofenceResult.isInsideRestricted ? 20 : 85;
        }

        // ==========================================
        // 3. BROADCAST LIVE LOCATION TO DASHBOARD
        // ==========================================
        const locationBroadcastPayload = {
          touristId: touristId,
          userId: touristId,
          location: { lat, lng },
          accuracy: accuracy,
          speed: speed,
          heading: heading,
          timestamp: timestamp,
          safetyScore: newScore,
          status: geofenceResult.isInsideRestricted ? 'restricted' : 'active',
          zoneStatus: geofenceResult.isInsideRestricted ? 'RESTRICTED ZONE' : 'SAFE'
        };

        // Broadcast to authorities room (TouristMap.tsx listens on "locationUpdate")
        io.to('authorities').emit('locationUpdate', locationBroadcastPayload);
        // Also emit standard project events
        io.emit('tourist:location', locationBroadcastPayload);

        // 4. Forward live location to authorized family & friend circle recipients
        const familyRecipients = familyLiveSharingMap.get(touristId);
        if (familyRecipients && familyRecipients.size > 0) {
          const meta = sharerMetaMap.get(touristId) || { name: 'Family Contact' };
          const familyPayload = {
            sharerId: touristId,
            name: meta.name || `Member ${touristId}`,
            location: { lat, lng },
            accuracy: accuracy || 5,
            speed: speed,
            heading: heading,
            timestamp: timestamp,
            active: true
          };

          for (const recipientId of familyRecipients) {
            io.to(`tourist:${recipientId}`).emit('familyLocationUpdate', familyPayload);
          }
          console.log(`👨‍👩‍👧 Live location shared from ${touristId} (${meta.name}) to ${familyRecipients.size} circle contact(s)`);
        }

        console.log(`📍 Live location sent for ${touristId}: [${lat.toFixed(5)}, ${lng.toFixed(5)}] Status: ${locationBroadcastPayload.zoneStatus}`);
      } catch (err) {
        console.error('❌ Error handling updateTouristLocation:', err);
      }
    });

    // Handle real-time family sharing toggle via socket
    socket.on('startFamilySharing', (data) => {
      const sharerId = socket.data?.touristId || data?.sharerId;
      if (!sharerId) return;
      exports.startFamilyShare(sharerId, data.recipientTouristIds || [], data.sharerName);
    });

    socket.on('stopFamilySharing', (data) => {
      const sharerId = socket.data?.touristId || data?.sharerId;
      if (!sharerId) return;
      exports.stopFamilyShare(sharerId, data.recipientTouristIds);
    });


    // Authority broadcasts alert to tourists
    socket.on('authorityBroadcast', async (data) => {
      if (socket.data && socket.data.userType === 'authority') {
        try {
          const result = await exports.emitAuthorityAlertToTourists(data);
          socket.emit('broadcastSuccess', { success: true, alertId: result?.alertId });
        } catch (err) {
          console.error('Failed to broadcast authority alert:', err);
          socket.emit('broadcastError', { success: false, message: err.message });
        }
      } else {
        socket.emit('broadcastError', { success: false, message: 'Unauthorized: Only authorities can broadcast alerts' });
      }
    });

    socket.on('disconnect', () => {
      const uid = socket.data && socket.data.userId;
      const tid = socket.data && socket.data.touristId;
      const userType = socket.data && socket.data.userType;

      if (userType === 'authority' && uid) {
        const set = authoritySockets.get(uid);
        if (set) {
          for (let s of set) {
            if (s.id === socket.id) {
              set.delete(s);
              break;
            }
          }
          if (set.size === 0) authoritySockets.delete(uid);
          else console.log(`Remaining authority sockets for ${uid}: ${set.size}`);
        }
      } else if (userType === 'tourist' && tid) {
        const set = touristSockets.get(tid);
        if (set) {
          for (let s of set) {
            if (s.id === socket.id) {
              set.delete(s);
              break;
            }
          }
          if (set.size === 0) {
            touristSockets.delete(tid);
            touristLastScores.delete(tid);
            // Do NOT delete from touristLastLocations: preserve the stopped last known location!
            const lastLoc = touristLastLocations.get(tid);
            console.log(`Tourist ${tid} is now offline. Preserving last location:`, lastLoc);
            io.to('authorities').emit('touristStatusChanged', {
              touristId: tid,
              id: tid,
              status: 'inactive',
              isOnline: false,
              location: lastLoc || null
            });
          } else {
            console.log(`Remaining tourist sockets for ${tid}: ${set.size}`);
          }
        }
      }

      console.log(`Client disconnected: ${socket.id}`);
    });
  });
};

/**
 * Emits a new SOS alert to all connected authorities.
 * This is the primary function for real-time alert broadcasting.
 * @param {object} alertData The alert data to be broadcasted.
 */
exports.emitSOSAlert = async (alertData) => {
  if (!io) {
    console.error("Socket.IO not initialized. Falling back to persistence.");
    if (fallbackService && typeof fallbackService.handleSOSFallback === 'function') {
      return await fallbackService.handleSOSFallback(alertData);
    }
    return;
  }

  // Count total sockets across all authority users
  let totalSockets = 0;
  for (let s of authoritySockets.values()) totalSockets += s.size || 0;

  if (totalSockets === 0) {
    console.warn("No authorities are currently connected. Handling with fallback service.");
    if (fallbackService && typeof fallbackService.handleSOSFallback === 'function') {
      try {
        await fallbackService.handleSOSFallback(alertData);
      } catch (fbErr) {
        console.error('Fallback service failed:', fbErr);
      }
    } else {
      console.warn('No fallbackService.handleSOSFallback() available — alert not persisted for fallback.');
    }
  } else {
    try {
      // Broadcast to the 'authorities' room so all connected authority sockets receive the event
      io.to('authorities').emit('newSOSAlert', alertData);
      console.log(`SOS alert broadcasted to ${totalSockets} authority socket(s).`);
    } catch (error) {
      console.error("Failed to broadcast alert in real-time. Falling back:", error);
      if (fallbackService && typeof fallbackService.handleSOSFallback === 'function') {
        try {
          await fallbackService.handleSOSFallback(alertData);
        } catch (fbErr) {
          console.error('Fallback service failed:', fbErr);
        }
      } else {
        console.warn('No fallbackService.handleSOSFallback() available — alert not persisted for fallback.');
      }
    }
  }
};

/**
 * Helper function to calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Emits an alert from authority to tourists (location-based or broadcast to all)
 * 
 * Expected data shape from Frontend (Authority Dashboard):
 * {
 *   type: 'emergency' | 'warning' | 'info' | 'weather' | 'civil_unrest',
 *   title: string,
 *   message: string,
 *   priority: 'critical' | 'high' | 'medium' | 'low',
 *   targetArea: {
 *     lat: number,
 *     lng: number,
 *     radius: number  // in meters
 *   } | null,  // null = broadcast to all tourists
 *   expiresAt: timestamp (optional),
 *   requiresAcknowledgment: boolean,
 *   actionRequired: string | null,  // e.g., "Evacuate immediately", "Stay indoors"
 *   authorityName: string,
 *   authorityId: string
 * }
 * 
 * @param {object} alertData The alert data from authority
 */
exports.emitAuthorityAlertToTourists = async (alertData) => {
  if (!io) {
    console.error("Socket.IO not initialized. Cannot broadcast authority alert.");
    return;
  }

  // Validate required fields
  if (!alertData.type || !alertData.title || !alertData.message) {
    throw new Error('Missing required fields: type, title, message');
  }

  // Generate unique alert ID
  const alertId = `auth-alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Construct the alert payload to send to tourists
  const touristAlertPayload = {
    alertId: alertId,
    type: alertData.type,
    title: alertData.title,
    message: alertData.message,
    priority: alertData.priority || 'medium',
    timestamp: new Date().toISOString(),
    authorityName: alertData.authorityName || 'Safety Authority',
    authorityId: alertData.authorityId || 'unknown',
    requiresAcknowledgment: alertData.requiresAcknowledgment || false,
    actionRequired: alertData.actionRequired || null,
    expiresAt: alertData.expiresAt || null,
    targetArea: alertData.targetArea || null
  };

  let targetedCount = 0;
  let totalTourists = 0;

  // Count total connected tourists
  for (let socketSet of touristSockets.values()) {
    totalTourists += socketSet.size;
  }

  // Always emit to authorities room so authority dashboard sees the broadcasted alert immediately
  io.to('authorities').emit('authorityAlert', touristAlertPayload);

  if (totalTourists === 0) {
    console.warn('No tourists connected. Alert registered with authorities.');
    return { success: true, alertId, touristAlertPayload, totalTourists: 0 };
  }

  // If targetArea is null, broadcast to ALL tourists
  if (!alertData.targetArea) {
    io.to('tourists').emit('authorityAlert', touristAlertPayload);
    console.log(`Authority alert broadcasted to ALL ${totalTourists} connected tourists`);
    return { success: true, alertId, touristAlertPayload, totalTourists };
  }

  // Location-based targeting
  const targetLat = alertData.targetArea.lat;
  const targetLng = alertData.targetArea.lng;
  const targetRadius = alertData.targetArea.radius; // in meters

  // Iterate through all connected tourists and filter by location
  for (let [touristId, socketSet] of touristSockets.entries()) {
    const canonicalLocation = touristLastLocations.get(touristId);
    
    for (let socket of socketSet) {
      // Fallback to socket.data.location if canonical location is missing
      const touristLocation = canonicalLocation || socket.data.location;

      if (touristLocation && touristLocation.lat && touristLocation.lng) {
        const distance = calculateDistance(
          targetLat,
          targetLng,
          touristLocation.lat,
          touristLocation.lng
        );

        console.log(`Tourist ${touristId} is ${distance}m away from target (${targetLat}, ${targetLng})`);

        // If tourist is within the target radius, send the alert
        if (distance <= targetRadius) {
          socket.emit('authorityAlert', {
            ...touristAlertPayload,
            distanceFromEvent: Math.round(distance) // meters
          });
          targetedCount++;
        }
      }
    }
  }

  console.log(`Authority alert sent to ${targetedCount} tourists within ${targetRadius}m of (${targetLat}, ${targetLng})`);
  return { success: true, alertId, touristAlertPayload, targetedCount };
};

/**
 * Emits an SOS status update to all connected authorities.
 * @param {object} alertData The updated alert data.
 */
exports.emitSOSStatusUpdate = async (alertData) => {
  if (io) {
    io.to('authorities').emit('sosAlertUpdated', alertData);

    // Also notify the concerned tourist app (if touristId is provided in payload)
    if (alertData.touristId) {
      io.to(`tourist:${alertData.touristId}`).emit('sosStatusUpdate', alertData);
    }

    console.log(`SOS status update broadcasted for alert ${alertData.alertId}`);
  }
};

/**
 * Emit explicit SOS assignment acknowledgement to the affected tourist.
 * @param {object} alertData assignment payload
 */
exports.emitSOSAssignmentAcknowledgement = async (alertData) => {
  if (!io || !alertData || !alertData.touristId) return;

  io.to(`tourist:${alertData.touristId}`).emit('sosAssignedAcknowledgement', alertData);
  console.log(`SOS assignment acknowledgement emitted to tourist ${alertData.touristId} for alert ${alertData.alertId}`);
};

/**
 * Emits a new danger zone event to authority and tourist clients.
 * @param {object} zoneData The new danger zone data.
 */
exports.emitDangerZoneAdded = async (zoneData) => {
  if (io) {
    io.to('authorities').emit('dangerZoneAdded', zoneData);
    io.to('tourists').emit('dangerZoneAdded', zoneData);
    console.log(`🚨 [Realtime] New danger zone broadcasted: ${zoneData.id || zoneData._id} (${zoneData.name})`);

    // Immediately evaluate all active tourists against this newly created danger zone
    try {
      const coords = zoneData.coords || zoneData.coordinates;
      const radiusKm = zoneData.radiusKm || (zoneData.radius ? zoneData.radius / 1000 : 1);
      const radiusMeters = radiusKm * 1000;
      const zoneName = zoneData.name || 'Danger Zone';
      const riskLevel = zoneData.riskLevel || 'High';
      const zoneId = zoneData.id || zoneData._id || `dz-${Date.now()}`;

      if (coords && Array.isArray(coords) && coords.length === 2) {
        const zoneLat = Number(coords[0]);
        const zoneLng = Number(coords[1]);

        touristLastLocations.forEach((loc, touristId) => {
          if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return;
          const dMeters = calculateDistance(loc.lat, loc.lng, zoneLat, zoneLng);

          if (dMeters <= radiusMeters) {
            console.log(`🚨🚨 [Realtime] Active tourist ${touristId} is INSIDE new danger zone: ${zoneName} (${Math.round(dMeters)}m <= ${radiusMeters}m)! Emitting instant siren warning!`);

            const warningPayload = {
              status: 'RESTRICTED ZONE',
              isInside: true,
              zoneName: zoneName,
              riskLevel: riskLevel,
              message: `🚨 WARNING: You are inside newly declared danger zone: ${zoneName}! Emergency siren activated!`,
              distanceMeters: Math.round(dMeters),
              timestamp: new Date().toISOString()
            };

            const transitionPayload = {
              status: 'RESTRICTED ZONE',
              event: 'ENTER',
              zone: zoneName,
              alertMessage: `🚨 WARNING: You entered active danger zone: ${zoneName}! Emergency siren activated!`
            };

            // Emit to tourist rooms
            io.to(`tourist:${touristId}`).emit('restrictedZoneWarning', warningPayload);
            io.to(`tourist:${touristId}`).emit('geofenceTransition', transitionPayload);
            io.to('tourists').emit('restrictedZoneWarning', warningPayload);
            io.to('tourists').emit('geofenceTransition', transitionPayload);

            // Also emit directly on any active socket matching this tourist
            const sSet = touristSockets.get(touristId);
            if (sSet) {
              sSet.forEach((sock) => {
                try {
                  sock.emit('restrictedZoneWarning', warningPayload);
                  sock.emit('geofenceTransition', transitionPayload);
                } catch (_) {}
              });
            }

            // Alert authority dashboard that tourist is inside
            io.to('authorities').emit('restrictedZoneAlert', {
              touristId,
              zoneId,
              zoneName,
              event: 'ENTER',
              riskLevel,
              alertMessage: `🚨 RESTRICTED ZONE ALERT: Tourist ${touristId} is inside newly created danger zone: ${zoneName}!`,
              latitude: loc.lat,
              longitude: loc.lng,
              distanceMeters: Math.round(dMeters),
              timestamp: new Date().toISOString()
            });
          }
        });
      }
    } catch (evalErr) {
      console.error("[Realtime] Error evaluating tourists for new danger zone:", evalErr);
    }
  }
};

/**
 * Emits a danger zone removed event to authority and tourist clients.
 * @param {object} zoneData The removed danger zone data or ID.
 */
exports.emitDangerZoneRemoved = async (zoneData) => {
  if (io) {
    io.to('authorities').emit('dangerZoneRemoved', zoneData);
    io.to('tourists').emit('dangerZoneRemoved', zoneData);
    console.log(`Danger zone removed broadcasted: ${zoneData?.id || zoneData?._id || zoneData}`);
  }
};

/**
 * Emits a generic map data update event to authority and tourist clients.
 * @param {object} payload The map update payload.
 */
exports.emitMapDataUpdated = async (payload) => {
  if (io) {
    io.to('authorities').emit('mapDataUpdated', payload);
    io.to('tourists').emit('mapDataUpdated', payload);
    console.log(`Map data update broadcasted: ${payload?.eventType || 'unknown'}`);
  }
};

/**
 * Emits a new incident event to all connected authorities.
 * @param {object} incidentData The new incident data.
 */
exports.emitIncidentReported = async (incidentData) => {
  if (io) {
    io.to('authorities').emit('incidentReported', incidentData);
    console.log(`New incident broadcasted: ${incidentData.id || incidentData._id}`);
  }
};

/**
 * Emits a risk grid update event to all connected clients.
 * @param {object} gridData The updated grid data.
 */
exports.emitRiskGridUpdated = async (gridData) => {
  if (io) {
    // Broadcast to all clients (not just authorities)
    io.emit('riskGridUpdated', gridData);
    console.log(`Risk grid update broadcasted: ${gridData.gridId}`);
  }
};

/**
 * Periodically recompute safety scores for all connected tourists
 * using their last known locations. Emits safetyScoreUpdate and
 * safetyScoreAlert (if significant change) events.
 */
async function runPeriodicSafetyScoreUpdate() {
  if (!io) return;

  for (const [touristId, socketSet] of touristSockets.entries()) {
    if (!socketSet || socketSet.size === 0) continue;

    // Use canonical last known location (not dependent on socket ordering)
    const loc = touristLastLocations.get(touristId);

    if (!loc || !loc.lat || !loc.lng) continue;

    try {
      const geofenceResult = await evaluateTouristGeofences(touristId, loc.lat, loc.lng);
      const safetyScoreData = await calculateSafetyScore(loc.lat, loc.lng);

      const previousScore = touristLastScores.get(touristId) || 80;
      const newScore = geofenceResult.isInsideRestricted ? 20 : safetyScoreData.safetyScore;

      const finalSafetyData = {
        ...safetyScoreData,
        safetyScore: newScore,
        safetyLevel: geofenceResult.isInsideRestricted ? 'CRITICAL' : safetyScoreData.safetyLevel,
        safetyColor: geofenceResult.isInsideRestricted ? '#dc2626' : safetyScoreData.safetyColor,
      };

      // Update stored score
      touristLastScores.set(touristId, newScore);

      // Emit to all sockets of this tourist
      for (const socket of socketSet) {
        socket.emit('safetyScoreUpdate', finalSafetyData);
      }

      console.log(
        `📡 safetyScoreUpdate emitted (periodic) to ${touristId}: ${newScore}/100 (loc updatedAt=${loc.updatedAt})`
      );

      // Notify only if significant change
      const notification = shouldNotifyScoreChange(previousScore, newScore);
      if (notification) {
        for (const socket of socketSet) {
          socket.emit('safetyScoreAlert', {
            ...notification,
            previousScore,
            newScore,
            safetyScoreData
          });
        }

        console.log(`⚠️ Periodic safety score alert for ${touristId}: ${previousScore} → ${newScore}`);
      }
    } catch (error) {
      console.error(`Failed periodic safety score calc for ${touristId}:`, error);
    }
  }
}

/**
 * Start live location sharing for a sharer with recipient IDs
 */
exports.startFamilyShare = (sharerId, recipientIds, sharerName) => {
  if (!familyLiveSharingMap.has(sharerId)) {
    familyLiveSharingMap.set(sharerId, new Set());
  }
  const set = familyLiveSharingMap.get(sharerId);
  (recipientIds || []).forEach((id) => set.add(id));
  sharerMetaMap.set(sharerId, { name: sharerName });

  // If we already have latest location of sharer, immediately notify recipients
  const lastLoc = touristLastLocations.get(sharerId);
  if (io && lastLoc) {
    const payload = {
      sharerId,
      name: sharerName || `Member ${sharerId}`,
      location: { lat: lastLoc.lat, lng: lastLoc.lng },
      accuracy: lastLoc.accuracy || 5,
      speed: lastLoc.speed || 0,
      heading: lastLoc.heading || 0,
      timestamp: new Date().toISOString(),
      active: true
    };
    (recipientIds || []).forEach((id) => {
      io.to(`tourist:${id}`).emit('familyLocationUpdate', payload);
    });
  }
};

/**
 * Stop live location sharing with recipient IDs (or all if empty)
 */
exports.stopFamilyShare = (sharerId, recipientIds) => {
  if (!familyLiveSharingMap.has(sharerId)) return;
  const set = familyLiveSharingMap.get(sharerId);
  const meta = sharerMetaMap.get(sharerId) || { name: 'Family Member' };

  if (!recipientIds || recipientIds.length === 0) {
    for (const recipientId of set) {
      if (io) {
        io.to(`tourist:${recipientId}`).emit('familyLocationUpdate', {
          sharerId,
          name: meta.name,
          active: false
        });
      }
    }
    familyLiveSharingMap.delete(sharerId);
    sharerMetaMap.delete(sharerId);
  } else {
    recipientIds.forEach((id) => {
      set.delete(id);
      if (io) {
        io.to(`tourist:${id}`).emit('familyLocationUpdate', {
          sharerId,
          name: meta.name,
          active: false
        });
      }
    });
    if (set.size === 0) {
      familyLiveSharingMap.delete(sharerId);
      sharerMetaMap.delete(sharerId);
    }
  }
};

/**
 * Get all sharers currently sharing with this recipient
 */
exports.getFamilySharersForRecipient = (recipientId) => {
  const sharers = new Set();
  for (const [sharerId, recipients] of familyLiveSharingMap.entries()) {
    if (recipients.has(recipientId)) {
      sharers.add(sharerId);
    }
  }
  return sharers;
};

/**
 * Get active locations of all sharers currently sharing with this recipient
 */
exports.getActiveSharedLocationsForRecipient = (recipientId) => {
  const list = [];
  for (const [sharerId, recipients] of familyLiveSharingMap.entries()) {
    if (recipients.has(recipientId)) {
      const lastLoc = touristLastLocations.get(sharerId);
      const meta = sharerMetaMap.get(sharerId) || { name: 'Family Member' };
      if (lastLoc) {
        list.push({
          sharerId,
          name: meta.name,
          location: { lat: lastLoc.lat, lng: lastLoc.lng },
          accuracy: lastLoc.accuracy || 5,
          speed: lastLoc.speed || 0,
          heading: lastLoc.heading || 0,
          timestamp: new Date(lastLoc.updatedAt).toISOString(),
          active: true
        });
      }
    }
  }
  return list;
};

