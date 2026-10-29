const { decrypt } = require('../../utils/encrypt');
const Incident = require('../../models/Incident');
const RiskGrid = require('../../models/RiskGrid');
const Authority = require('../../models/Authority');
const SOSAlert = require('../../models/SOSAlertModel');
const Tourist = require('../../models/Tourist');
const { DangerZone } = require("../../models/Geofence");

// @desc    Get real-time map data (Tourists, Zones, Alerts, Incidents)
// @route   GET /api/authority/map-overview
// @access  Private (authority)
exports.getMapOverview = async (req, res, next) => {
  try {
    // 1. Fetch Aggregated stats for the panel
    const totalTourists = await Tourist.countDocuments();
    const activeAlertsCount = await SOSAlert.countDocuments({ status: { $in: ['new'] } });
    const highRiskZonesCount = await DangerZone.countDocuments({ riskLevel: { $in: ['High', 'Very High'] } });
    const responseUnitsCount = await Authority.countDocuments({ role: { $in: ['Emergency Responder', 'Police Officer'] }, isActive: true });

    // 2. Fetch Tourists with real-time or latest known locations
    const touristsRaw = await Tourist.find({}).lean();
    const realtimeService = require('../../services/realtimeService');
    const liveLocations = (realtimeService && typeof realtimeService.getTouristLocations === 'function')
      ? realtimeService.getTouristLocations()
      : new Map();
    const Transition = require('../../models/Transition');

    const tourists = await Promise.all(touristsRaw.map(async t => {
      let name = "Unknown";
      try {
        if (t.nameEncrypted) name = decrypt(t.nameEncrypted);
      } catch (e) { }

      const isActive = !t.expiresAt || new Date(t.expiresAt) > new Date();

      let location = null;

      const isMockCoord = (lat, lng) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
        if (lat === 0 && lng === 0) return true;
        if (Math.abs(lat - 19.0760) < 0.001 && Math.abs(lng - 72.8777) < 0.001) return true;
        return false;
      };

      // 1. Check in-memory real-time socket location
      const socketLoc = liveLocations.get(t.touristId) || liveLocations.get(t._id?.toString());
      if (socketLoc && !isMockCoord(socketLoc.lat, socketLoc.lng)) {
        location = { lat: socketLoc.lat, lng: socketLoc.lng };
      }

      // 2. Check Tourist document's stored lastKnownLocation
      if (!location && t.lastKnownLocation && !isMockCoord(t.lastKnownLocation.lat, t.lastKnownLocation.lng)) {
        location = { lat: t.lastKnownLocation.lat, lng: t.lastKnownLocation.lng };
      }

      // 3. Check latest Transition record
      if (!location) {
        const lastTransition = await Transition.findOne({ digitalId: t.touristId }).sort({ timestamp: -1 }).lean();
        if (lastTransition && lastTransition.location && !isMockCoord(lastTransition.location.latitude, lastTransition.location.longitude)) {
          location = { lat: lastTransition.location.latitude, lng: lastTransition.location.longitude };
        }
      }

      // 4. Check latest SOSAlert record
      if (!location) {
        const lastAlert = await SOSAlert.findOne({ touristId: t._id }).sort({ createdAt: -1 }).lean();
        if (lastAlert && lastAlert.location && Array.isArray(lastAlert.location.coordinates) && lastAlert.location.coordinates.length >= 2) {
          const lat = lastAlert.location.coordinates[1];
          const lng = lastAlert.location.coordinates[0];
          if (!isMockCoord(lat, lng)) {
            location = { lat, lng };
          }
        }
      }

      const isOnline = Boolean(
        (realtimeService && typeof realtimeService.isTouristOnline === 'function') &&
        (realtimeService.isTouristOnline(t.touristId) || realtimeService.isTouristOnline(t._id?.toString()))
      );

      const status = isOnline ? 'active' : 'inactive';

      return {
        id: t.touristId,
        name: name,
        status: status,
        isOnline: isOnline,
        safetyScore: t.safetyScore,
        location: location,
        type: 'tourist'
      };
    }));


    // 3. Fetch Danger Zones
    const zonesRaw = await DangerZone.find({}).lean();
    const zones = zonesRaw.map(z => ({
      id: z.id,
      name: z.name,
      riskLevel: z.riskLevel,
      type: 'zone',
      shape: z.type, // 'circle' or 'polygon'
      coordinates: z.coords, // [lat, lng]
      radius: z.radiusKm ? z.radiusKm * 1000 : 0 // Convert to meters for map
    }));

    // 4. Fetch Active SOS Alerts
    const alertsRaw = await SOSAlert.find({ status: { $in: ['new', 'responding'] } }).populate('touristId', 'touristId').lean();
    const activeAlerts = alertsRaw.map(a => {
      // SOSAlert uses GeoJSON [lng, lat]
      const lat = a.location.coordinates[1];
      const lng = a.location.coordinates[0];
      return {
        id: a._id,
        type: 'alert',
        status: a.status,
        priority: a.safetyScore < 50 ? 'high' : 'medium',
        location: { lat, lng },
        locationName: a.location.locationName || "Unknown Location"
      };
    });

    // 5. Fetch Risk Grids (Heatmap points)
    const riskGridRaw = await RiskGrid.find({ riskScore: { $gt: 0 } }).lean();
    const riskGrids = riskGridRaw.map(r => ({
      location: {
        lat: r.location.coordinates[1],
        lng: r.location.coordinates[0]
      },
      intensity: r.riskScore // 0 to 1
    }));

    // 6. Fetch Incidents
    const incidentsRaw = await Incident.find({}).sort({ timestamp: -1 }).limit(50).lean();
    const incidents = incidentsRaw.map(i => ({
      id: i._id,
      title: i.title,
      type: 'incident',
      category: i.type,
      location: {
        lat: i.location.coordinates[1],
        lng: i.location.coordinates[0]
      }
    }));


    const activeTourists = tourists.filter(t => t.status === 'active').length;
    const inactiveTourists = tourists.filter(t => t.status === 'inactive').length;

    res.status(200).json({
      success: true,
      stats: {
        totalTourists,
        activeTourists,
        inactiveTourists,
        activeAlerts: activeAlertsCount,
        highRiskZones: highRiskZonesCount,
        responseUnits: responseUnitsCount
      },
      mapData: {
        tourists,
        zones,
        activeAlerts,
        riskGrids,
        incidents
      }
    });

  } catch (err) {
    console.error("❌ getMapOverview error:", err);
    next(err);
  }
};



