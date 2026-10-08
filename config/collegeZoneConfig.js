/**
 * ==============================================================================
 * SAFETRAIL: COLLEGE DEMONSTRATION RESTRICTED ZONE CONFIGURATION
 * ==============================================================================
 * 
 * IMPORTANT FOR COLLEGE DEMONSTRATION:
 * ------------------------------------
 * This file configures the simulated restricted demo zone for your live presentation.
 * It is easily editable here or via environment variables (.env).
 * 
 * To set your exact college demo location:
 * 1. Open Google Maps or your phone's GPS app at your demonstration spot.
 * 2. Copy the exact Latitude and Longitude of your demo room/hall.
 * 3. Update 'latitude', 'longitude', and 'radiusMeters' below (or in .env).
 * 
 * When your phone enters this radius:
 * - Phone switches to 🔴 RESTRICTED ZONE status.
 * - Authority Dashboard triggers an immediate visual & audible RESTRICTED ZONE ALERT.
 * - Tourist marker moves live on the map.
 * When phone leaves this radius:
 * - Phone switches back to 🟢 SAFE status.
 * - Authority Dashboard updates status to SAFE.
 */

const {
  COLLEGE_ZONE_ENABLED,
  COLLEGE_ZONE_NAME,
  COLLEGE_ZONE_LAT,
  COLLEGE_ZONE_LNG,
  COLLEGE_ZONE_RADIUS,
  COLLEGE_ZONE_RISK_LEVEL,
  COLLEGE_ZONE_ALERT_MSG
} = require('./config');

const collegeZoneConfig = {
  enabled: COLLEGE_ZONE_ENABLED !== false,
  id: "college-restricted-demo-zone",
  name: COLLEGE_ZONE_NAME || "College Restricted Area",
  type: "circle",
  // Demonstration coordinates (editable for live demo)
  latitude: typeof COLLEGE_ZONE_LAT === 'number' ? COLLEGE_ZONE_LAT : 19.0760,
  longitude: typeof COLLEGE_ZONE_LNG === 'number' ? COLLEGE_ZONE_LNG : 72.8777,
  radiusMeters: typeof COLLEGE_ZONE_RADIUS === 'number' ? COLLEGE_ZONE_RADIUS : 80, // 80 meters default demo radius
  riskLevel: COLLEGE_ZONE_RISK_LEVEL || "High",
  alertMessage: COLLEGE_ZONE_ALERT_MSG || "RESTRICTED ZONE ALERT: Tourist has entered the College Restricted Area!",
  category: "Restricted Zone",
  state: "Demonstration",
  source: "College Demo Config"
};

module.exports = collegeZoneConfig;
