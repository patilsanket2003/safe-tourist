const Incident = require('../models/Incident');
const { CustomError } = require('../middlewares/errorMiddleware');
const { updateRiskScores } = require('../services/riskEngineService');

// @desc    Report a new incident (Crowdsourced)
// @route   POST /api/incidents
// @access  Private
exports.reportIncident = async (req, res, next) => {
    try {
        const { title, type, latitude, longitude, severity } = req.body;

        // Basic Validation
        if (!latitude || !longitude) {
            // If CustomError isn't working for some reason, basic res.status works too, but using project pattern
            return res.status(400).json({ message: "Please provide latitude (lat), and longitude (lng)." });
        }

        // Validate Type if necessary, or let Mongoose handle it
        const validTypes = ['theft', 'assault', 'accident', 'riot', 'natural_disaster', 'other'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({ message: `Invalid type. Allowed: ${validTypes.join(', ')}` });
        }

        // Create new Incident
        const newIncident = new Incident({
            title,
            type,
            location: {
                type: 'Point',
                coordinates: [parseFloat(longitude), parseFloat(latitude)] // GeoJSON expects [lng, lat]
            },
            severity: parseFloat(severity) || 0.5,
            source: 'User', // Crowdsourced
            timestamp: new Date()
        });

        const savedIncident = await newIncident.save();

        // Trigger Real-time Risk Update
        updateRiskScores().catch(err => console.error("Risk update failed:", err));

        // Emit real-time incident
        const realtimeService = require('../services/realtimeService');
        realtimeService.emitIncidentReported({
            id: savedIncident._id,
            title: savedIncident.title,
            type: savedIncident.type,
            severity: savedIncident.severity >= 0.8 ? 'critical' : (savedIncident.severity >= 0.6 ? 'high' : 'medium'),
            location: {
                lat: savedIncident.location.coordinates[1],
                lng: savedIncident.location.coordinates[0]
            },
            timestamp: savedIncident.timestamp
        }).catch(err => console.error("Socket emit error:", err));

        res.status(201).json({
            success: true,
            message: "Incident reported successfully.",
            data: savedIncident
        });

    } catch (err) {
        // Mongoose validation error handling
        if (err.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        next(err);
    }
};
