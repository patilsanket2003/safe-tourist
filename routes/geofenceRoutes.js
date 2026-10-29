const express = require('express');
const {
  receiveGeofenceTransitions,
  createGeoFenceToDangerLocation,
  deleteDangerZone,
  getallZones,
  getZonebyId,
  getHighRiskZoneCount,
  getDynamicRiskZones,
  triggerRiskUpdate,
  createDestinationGeofence,
  getAllDestinationGeofences,
  getAllZonesWithStyling,
  getCollegeZoneInfo,
  updateCollegeZoneInfo
} = require('../controllers/geofenceController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// College Demonstration Zone Configuration
router.get('/college-zone', getCollegeZoneInfo);
router.put('/college-zone', updateCollegeZoneInfo);
router.post('/college-zone', updateCollegeZoneInfo);

// Combined endpoint with visual styling (used by dashboard and mobile)
router.get('/all-zones-styled', getAllZonesWithStyling);

// Danger zone & count routes
router.get('/', getallZones);
router.post('/', createGeoFenceToDangerLocation);
router.post('/danger-zone', createGeoFenceToDangerLocation);
router.delete('/:id', deleteDangerZone);
router.delete('/danger-zone/:id', deleteDangerZone);
router.get('/count', getHighRiskZoneCount);
router.get('/zone/:id', getZonebyId);

// Risk grid routes
router.get('/dynamic', getDynamicRiskZones);
router.post('/risk/update', triggerRiskUpdate);

// Destination geofence routes
router.get('/destinations', getAllDestinationGeofences);
router.post('/destination', createDestinationGeofence);

// Transition logging
router.post('/transitions', receiveGeofenceTransitions);

module.exports = router;