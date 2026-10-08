const express = require('express');
const { assignUnitToAlert, getRespondingSosAlerts, getNewSosAlerts, resolveAlert, getSosCounts } = require('../controllers/authority/SOSAlertPage')
const { getExpiredTouristData, getTouristManagementData, revokeTourist } = require('../controllers/authority/touristPage')
const { getDashboardStats } = require('../controllers/authority/dashboard')
const { getMapOverview } = require('../controllers/authority/mapPage')
const { predictCrowdSurge } = require('../controllers/authority/analytics');
const { createEFIR, getEFIRSummaries } = require('../controllers/authority/eFIRPage');
const { createGeoFenceToDangerLocation } = require('../controllers/geofenceController');
const { verifyToken, isAuthority } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(verifyToken, isAuthority);

// The 'authorize' middleware checks if the authenticated user has the 'authority' role
router.get('/dashboard-stats', getDashboardStats);
router.get('/analytics/crowd-prediction', predictCrowdSurge);
router.get('/tourist-management', getTouristManagementData);
router.get('/expired-tourists', getExpiredTouristData);
router.get('/map-overview', getMapOverview);
router.post('/map/danger-zone', createGeoFenceToDangerLocation);
router.get('/efir', getEFIRSummaries);
router.post('/efir', createEFIR);
router.delete('/revoke/:id', revokeTourist);
router.get('/alerts', getNewSosAlerts);
router.get('/alerts/responding', getRespondingSosAlerts);
router.put('/alerts/:id/assign', assignUnitToAlert);
router.put('/alerts/:id/resolve', resolveAlert);

const { addEmergencyVehicle, getEmergencyVehicles } = require('../controllers/authority/emergencyVehicleController');

router.post('/emergency-vehicle', addEmergencyVehicle);
router.get('/emergency-vehicle', getEmergencyVehicles);

module.exports = router;

