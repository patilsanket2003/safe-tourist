const collegeZoneConfig = require('../config/collegeZoneConfig');
const { DangerZone } = require('../models/Geofence');

/**
 * Calculate distance between two coordinates in meters using the Haversine formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Check if point is inside polygon (ray-casting algorithm)
 */
function isPointInPolygon(point, polygon) {
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// In-memory state tracking per tourist to prevent duplicate/spam alert generation
// touristId -> Set of zoneIds currently inside
const touristZoneState = new Map();

// Active College Demo Zone configuration in memory (can be updated live)
let activeCollegeZone = { ...collegeZoneConfig };

/**
 * Seed or update the college demonstration restricted zone in MongoDB DangerZone
 */
async function syncCollegeZoneToDatabase() {
  if (!activeCollegeZone.enabled) return;

  try {
    const existing = await DangerZone.findOne({ id: activeCollegeZone.id });
    const zoneDoc = {
      id: activeCollegeZone.id,
      name: activeCollegeZone.name,
      type: activeCollegeZone.type || 'circle',
      coords: [activeCollegeZone.latitude, activeCollegeZone.longitude],
      radiusKm: activeCollegeZone.radiusMeters / 1000,
      category: activeCollegeZone.category || 'Restricted Area',
      state: activeCollegeZone.state || 'College Demo',
      riskLevel: activeCollegeZone.riskLevel || 'High',
      source: 'College Demo Config',
      visualStyle: {
        zoneType: 'danger_zone',
        borderStyle: 'solid',
        borderWidth: 3,
        fillOpacity: 0.35,
        fillPattern: 'diagonal-stripes',
        iconType: 'warning-triangle',
        renderPriority: 1
      }
    };

    if (existing) {
      await DangerZone.updateOne({ id: activeCollegeZone.id }, zoneDoc);
      console.log(`✅ College Demonstration Restricted Zone synced to database: ${activeCollegeZone.name} (${activeCollegeZone.latitude}, ${activeCollegeZone.longitude}, ${activeCollegeZone.radiusMeters}m)`);
    } else {
      await DangerZone.create(zoneDoc);
      console.log(`✅ College Demonstration Restricted Zone created in database: ${activeCollegeZone.name}`);
    }
  } catch (err) {
    console.warn('⚠️ Could not sync college zone to database:', err.message);
  }
}

/**
 * Get active college zone configuration
 */
function getCollegeZone() {
  return { ...activeCollegeZone };
}

/**
 * Update college zone coordinates or settings dynamically at runtime
 */
async function updateCollegeZone(updates) {
  if (!updates) return activeCollegeZone;

  if (typeof updates.latitude === 'number' && Number.isFinite(updates.latitude)) {
    activeCollegeZone.latitude = updates.latitude;
  }
  if (typeof updates.longitude === 'number' && Number.isFinite(updates.longitude)) {
    activeCollegeZone.longitude = updates.longitude;
  }
  if (typeof updates.radiusMeters === 'number' && Number.isFinite(updates.radiusMeters)) {
    activeCollegeZone.radiusMeters = updates.radiusMeters;
  }
  if (updates.name) activeCollegeZone.name = String(updates.name);
  if (updates.riskLevel) activeCollegeZone.riskLevel = String(updates.riskLevel);
  if (updates.alertMessage) activeCollegeZone.alertMessage = String(updates.alertMessage);
  if (typeof updates.enabled === 'boolean') activeCollegeZone.enabled = updates.enabled;

  // Sync to database
  await syncCollegeZoneToDatabase();

  return { ...activeCollegeZone };
}

/**
 * Evaluate tourist position against College Demo Zone and any other danger zones
 * 
 * Returns:
 * {
 *   isInsideRestricted: boolean,
 *   activeZones: Array<zone>,
 *   events: Array<{ event: 'ENTER' | 'EXIT', ... }>
 * }
 */
async function evaluateTouristGeofences(touristId, lat, lng, timestamp = new Date().toISOString()) {
  const result = {
    touristId,
    latitude: lat,
    longitude: lng,
    isInsideRestricted: false,
    activeZones: [],
    events: []
  };

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return result;
  }

  // Get or initialize tourist state
  let currentInsideSet = touristZoneState.get(touristId);
  if (!currentInsideSet) {
    currentInsideSet = new Set();
    touristZoneState.set(touristId, currentInsideSet);
  }

  const newlyInsideSet = new Set();

  // 1. Evaluate against the College Demonstration Restricted Zone
  if (activeCollegeZone && activeCollegeZone.enabled) {
    const distanceMeters = calculateDistanceMeters(
      lat,
      lng,
      activeCollegeZone.latitude,
      activeCollegeZone.longitude
    );

    const isInsideCollegeZone = distanceMeters <= activeCollegeZone.radiusMeters;

    if (isInsideCollegeZone) {
      newlyInsideSet.add(activeCollegeZone.id);
      result.isInsideRestricted = true;
      result.activeZones.push({
        id: activeCollegeZone.id,
        name: activeCollegeZone.name,
        riskLevel: activeCollegeZone.riskLevel,
        distanceMeters: Math.round(distanceMeters),
        radiusMeters: activeCollegeZone.radiusMeters
      });

      // Check for ENTER transition
      if (!currentInsideSet.has(activeCollegeZone.id)) {
        result.events.push({
          touristId,
          zoneId: activeCollegeZone.id,
          zoneName: activeCollegeZone.name,
          event: 'ENTER',
          riskLevel: activeCollegeZone.riskLevel,
          alertMessage: activeCollegeZone.alertMessage || `🚨 RESTRICTED ZONE ALERT: Tourist ${touristId} entered ${activeCollegeZone.name}!`,
          latitude: lat,
          longitude: lng,
          distanceMeters: Math.round(distanceMeters),
          radiusMeters: activeCollegeZone.radiusMeters,
          timestamp
        });
      }
    } else {
      // Check for EXIT transition
      if (currentInsideSet.has(activeCollegeZone.id)) {
        result.events.push({
          touristId,
          zoneId: activeCollegeZone.id,
          zoneName: activeCollegeZone.name,
          event: 'EXIT',
          riskLevel: activeCollegeZone.riskLevel,
          alertMessage: `🟢 SAFE: Tourist ${touristId} exited ${activeCollegeZone.name}.`,
          latitude: lat,
          longitude: lng,
          distanceMeters: Math.round(distanceMeters),
          radiusMeters: activeCollegeZone.radiusMeters,
          timestamp
        });
      }
    }
  }

  // 2. Also check any database DangerZones
  try {
    const dangerZones = await DangerZone.find({ id: { $ne: activeCollegeZone.id } }).lean();
    for (const dz of dangerZones) {
      let isInside = false;
      let dist = 0;

      if (dz.type === 'circle' && Array.isArray(dz.coords) && dz.coords.length === 2) {
        const radiusMeters = (dz.radiusKm || 1) * 1000;
        dist = calculateDistanceMeters(lat, lng, dz.coords[0], dz.coords[1]);
        isInside = dist <= radiusMeters;
      } else if (dz.type === 'polygon' && Array.isArray(dz.polygonCoords) && dz.polygonCoords.length > 2) {
        isInside = isPointInPolygon([lat, lng], dz.polygonCoords);
      }

      if (isInside) {
        newlyInsideSet.add(dz.id);
        result.isInsideRestricted = true;
        result.activeZones.push({
          id: dz.id,
          name: dz.name,
          riskLevel: dz.riskLevel || 'High',
          distanceMeters: Math.round(dist)
        });

        if (!currentInsideSet.has(dz.id)) {
          result.events.push({
            touristId,
            zoneId: dz.id,
            zoneName: dz.name,
            event: 'ENTER',
            riskLevel: dz.riskLevel || 'High',
            alertMessage: `🚨 DANGER ZONE ALERT: Tourist ${touristId} entered ${dz.name}!`,
            latitude: lat,
            longitude: lng,
            distanceMeters: Math.round(dist),
            timestamp
          });
        }
      } else {
        if (currentInsideSet.has(dz.id)) {
          result.events.push({
            touristId,
            zoneId: dz.id,
            zoneName: dz.name,
            event: 'EXIT',
            riskLevel: dz.riskLevel || 'High',
            alertMessage: `🟢 SAFE: Tourist ${touristId} exited ${dz.name}.`,
            latitude: lat,
            longitude: lng,
            distanceMeters: Math.round(dist),
            timestamp
          });
        }
      }
    }

    // 3. Check against Worldwide Global Hazards using 2dsphere indexing
    const GlobalHazard = require('../models/GlobalHazard');
    const globalHazards = await GlobalHazard.find({
      active: true,
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat] // GeoJSON order: Longitude, Latitude
          }
        }
      }
    }).lean();

    for (const hazard of globalHazards) {
      newlyInsideSet.add(hazard.source_id);
      result.isInsideRestricted = true;
      result.activeZones.push({
        id: hazard.source_id,
        name: hazard.name,
        riskLevel: hazard.severity,
        distanceMeters: 0 // They are inside
      });

      if (!currentInsideSet.has(hazard.source_id)) {
        result.events.push({
          touristId,
          zoneId: hazard.source_id,
          zoneName: hazard.name,
          event: 'ENTER',
          riskLevel: hazard.severity,
          alertMessage: `⚠️ WORLDWIDE HAZARD WARNING: Tourist ${touristId} entered ${hazard.name} (${hazard.type})! Data source: ${hazard.source}`,
          latitude: lat,
          longitude: lng,
          distanceMeters: 0,
          timestamp,
          isGlobalHazard: true
        });
      }
    }
    
    // Check for EXIT transitions of Global Hazards
    // We check if they were in a hazard previously but are no longer in it
    for (const oldZoneId of currentInsideSet) {
      // If it's a global hazard ID and they are no longer inside
      if (oldZoneId.startsWith('usgs-') || oldZoneId.startsWith('osm-')) {
        if (!newlyInsideSet.has(oldZoneId)) {
          result.events.push({
            touristId,
            zoneId: oldZoneId,
            zoneName: "Worldwide Hazard Zone",
            event: 'EXIT',
            riskLevel: 'Low',
            alertMessage: `🟢 SAFE: Tourist ${touristId} exited the hazard zone.`,
            latitude: lat,
            longitude: lng,
            distanceMeters: 0,
            timestamp,
            isGlobalHazard: true
          });
        }
      }
    }
  } catch (e) {
    // Non-blocking for DB lookup
  }

  // Update tourist state
  touristZoneState.set(touristId, newlyInsideSet);

  return result;
}

module.exports = {
  calculateDistanceMeters,
  evaluateTouristGeofences,
  getCollegeZone,
  updateCollegeZone,
  syncCollegeZoneToDatabase
};
