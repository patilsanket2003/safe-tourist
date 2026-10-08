const SOSAlert = require('../../models/SOSAlertModel');
const { decrypt } = require('../../utils/encrypt');
const RiskGrid = require('../../models/RiskGrid');
const Authority = require('../../models/Authority');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN} = require('../../config/config')


// @desc    Get all open SOS alerts
// @route   GET /api/authority/alerts
// @access  Private (authority)
exports.getNewSosAlerts = async (req, res, next) => {
  try {
    // Fetch all SOS alerts with status 'new', sorted by latest timestamp first
    const alertsRaw = await SOSAlert.find({ status: 'new' })
      .sort({ timestamp: -1 })
      .populate('touristId') // Populate the full tourist document
      .lean();

    // Transform each alert to include complete tourist profile details
    const alerts = await Promise.all(alertsRaw.map(async (sosAlert) => {
      let touristData = {
        touristId: null,
        touristName: 'Unknown',
        phone: null,
        age: null,
        nationality: null,
        gender: null,
        bloodGroup: null,
        medicalConditions: null,
        allergies: null,
        emergencyContact: null,
      };

      // If tourist data is populated, decrypt and extract details
      if (sosAlert.touristId && typeof sosAlert.touristId === 'object') {
        const tourist = sosAlert.touristId;
        
        try {
          // Decrypt personal information
          touristData.touristId = tourist.touristId;
          touristData.touristName = tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : 'Unknown';
          touristData.phone = tourist.phoneEncrypted ? decrypt(tourist.phoneEncrypted) : null;

          // Calculate age from DOB if available
          if (tourist.dob) {
            const today = new Date();
            const birthDate = new Date(tourist.dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            touristData.age = age;
          }

          // Extract other profile fields
          touristData.nationality = tourist.nationality || null;
          touristData.gender = tourist.gender || null;
          touristData.bloodGroup = tourist.bloodGroup || null;
          touristData.medicalConditions = tourist.medicalConditions || null;
          touristData.allergies = tourist.allergies || null;

          // Decrypt emergency contact if available
          if (tourist.emergencyContactEncrypted) {
            touristData.emergencyContact = JSON.parse(decrypt(tourist.emergencyContactEncrypted));
          }
        } catch (decryptErr) {
          console.error('Error decrypting tourist data:', decryptErr);
        }
      }

      // Return alert in the same structure as real-time emit
      return {
        alertId: sosAlert._id,
        touristId: touristData.touristId,
        touristName: touristData.touristName,
        phone: touristData.phone,
        age: touristData.age,
        nationality: touristData.nationality,
        gender: touristData.gender,
        bloodGroup: touristData.bloodGroup,
        medicalConditions: touristData.medicalConditions,
        allergies: touristData.allergies,
        emergencyContact: touristData.emergencyContact,
        location: sosAlert.location,
        locationName: sosAlert.locationName,
        timestamp: sosAlert.timestamp,
        safetyScore: sosAlert.safetyScore,
        sosReason: sosAlert.sosReason,
        status: sosAlert.status
      };
    }));

    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    console.error("❌ getNewSosAlerts error:", err);
    next(err);
  }
};

// @desc    Get all responding SOS alerts
// @route   GET /api/authority/alerts/responding
// @access  Private (authority)
exports.getRespondingSosAlerts = async (req, res, next) => {
  try {
    // Fetch all SOS alerts with status 'responding', sorted by latest timestamp first
    const alertsRaw = await SOSAlert.find({ status: 'responding' })
      .sort({ timestamp: -1 })
      .populate('touristId') // still populate tourist
      .lean();

    // Transform each alert to include complete tourist profile details
    const alerts = await Promise.all(alertsRaw.map(async (sosAlert) => {
      let touristData = {
        touristId: null,
        touristName: 'Unknown',
        phone: null,
        age: null,
        nationality: null,
        gender: null,
        bloodGroup: null,
        medicalConditions: null,
        allergies: null,
        emergencyContact: null,
        govId: null
      };

      // If tourist data is populated, decrypt and extract details
      if (sosAlert.touristId && typeof sosAlert.touristId === 'object') {
        const tourist = sosAlert.touristId;
        
        try {
          // Decrypt personal information
          touristData.touristId = tourist.touristId;
          touristData.touristName = tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : 'Unknown';
          touristData.phone = tourist.phoneEncrypted ? decrypt(tourist.phoneEncrypted) : null;

          // Calculate age from DOB if available
          if (tourist.dob) {
            const today = new Date();
            const birthDate = new Date(tourist.dob);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            touristData.age = age;
          }

          // Extract other profile fields
          touristData.nationality = tourist.nationality || null;
          touristData.gender = tourist.gender || null;
          touristData.bloodGroup = tourist.bloodGroup || null;
          touristData.medicalConditions = tourist.medicalConditions || null;
          touristData.allergies = tourist.allergies || null;

          // If raw govId is stored encrypted, decrypt and include it (use with caution)
          if (tourist.govIdEncrypted) {
            try {
              touristData.govId = decrypt(tourist.govIdEncrypted);
            } catch (e) {
              console.error('Error decrypting govIdEncrypted:', e);
              touristData.govId = null;
            }
          }

          // Decrypt emergency contact if available
          if (tourist.emergencyContactEncrypted) {
            touristData.emergencyContact = JSON.parse(decrypt(tourist.emergencyContactEncrypted));
          }
        } catch (decryptErr) {
          console.error('Error decrypting tourist data:', decryptErr);
        }
      }

      // Return alert in the same structure as real-time emit
      // Normalize assignedTo to ensure consistent output: array of { authorityId, fullName, role }
      const assigned = (sosAlert.assignedTo || []).map(a => {
        if (!a) return null;
        if (typeof a === 'string') return { authorityId: a, fullName: null };
        // already an object with authorityId/fullName
        return { authorityId: a.authorityId || null, fullName: a.fullName || null, role: a.role || null };
      }).filter(x => x !== null);

      return {
        alertId: sosAlert._id,
        touristId: touristData.touristId,
        touristName: touristData.touristName,
        govId: touristData.govId || null,
        phone: touristData.phone,
        age: touristData.age,
        nationality: touristData.nationality,
        gender: touristData.gender,
        bloodGroup: touristData.bloodGroup,
        medicalConditions: touristData.medicalConditions,
        allergies: touristData.allergies,
        emergencyContact: touristData.emergencyContact,
        location: sosAlert.location,
        locationName: sosAlert.locationName,
        timestamp: sosAlert.timestamp,
        safetyScore: sosAlert.safetyScore,
        sosReason: sosAlert.sosReason,
        status: sosAlert.status,
        responseDate: sosAlert.responseDate,
        responseTime: sosAlert.responseTime,
        assignedTo: assigned
      };
    }));

    res.status(200).json({
      success: true,
      count: alerts.length,
      alerts
    });
  } catch (err) {
    console.error("❌ getRespondingSosAlerts error:", err);
    next(err);
  }
};

exports.getSosCounts = async (req, res, next) => {
  try {
    const newCount = await SOSAlert.countDocuments({ status: "new" });

    res.status(200).json({
      success: true,
      new: newCount,
    });
  } catch (err) {
    next(err);
  }
};
// @desc    Assign an authority unit to an SOS alert
// @route   PUT /api/authority/alerts/:id/assign
// @access  Private (authority)
exports.assignUnitToAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { responseTime, etaMinutes } = req.body;
    // user.id or user._id depending on how it's stored in token. Usually user.id from decoded token.
    const authorityObjectId = req.user.id || req.user._id;

    const alert = await SOSAlert.findById(id).populate('touristId', 'touristId');

    if (!alert) {
      return res.status(404).json({ success: false, message: "SOS Alert not found" });
    }

    // Resolve current authority record
    const authority = await Authority.findById(authorityObjectId).select('authorityId fullName role');
    if (!authority) {
      return res.status(404).json({ success: false, message: 'Assigning authority not found' });
    }

    // Note: allow same authority to be assigned to multiple alerts; do not block duplicates here.

    // Update alert: Add authority info object to assignedTo, change status to 'responding' if it was 'new'
    if (!alert.assignedTo) alert.assignedTo = [];
    alert.assignedTo.push({ authorityId: authority.authorityId, fullName: authority.fullName, role: authority.role });

    // Save response time if provided
    if (responseTime) {
      console.log(responseTime)
      alert.responseTime = responseTime;
    }

    // ETA is provided only as minutes by frontend; arrival time is computed server-side
    if (etaMinutes === undefined || etaMinutes === null || etaMinutes === "") {
      return res.status(400).json({ success: false, message: 'etaMinutes is required' });
    }

    const parsedEtaMinutes = Number(etaMinutes);
    if (!Number.isFinite(parsedEtaMinutes) || parsedEtaMinutes < 0) {
      return res.status(400).json({ success: false, message: 'etaMinutes must be a non-negative number' });
    }
    alert.etaMinutes = parsedEtaMinutes;
    alert.etaArrivalAt = new Date(Date.now() + parsedEtaMinutes * 60 * 1000);
    alert.etaUpdatedAt = new Date();
    alert.etaUpdatedBy = authority.authorityId;

    if (alert.status === 'new' || alert.status === 'acknowledged') {
      alert.status = 'responding';
      // Set response timestamp if not already set
      if (!alert.responseDate) {
        alert.responseDate = new Date();
      }
    }

    await alert.save();
    
    // Construct real-time payload
    const touristRoomId = alert.touristId && typeof alert.touristId === 'object'
      ? alert.touristId.touristId
      : null;

    const alertData = {
      alertId: alert._id,
      touristId: touristRoomId,
      status: alert.status,
      assignedTo: alert.assignedTo,
      responseDate: alert.responseDate,
      responseTime: alert.responseTime, // if set
      etaMinutes: alert.etaMinutes,
      etaArrivalAt: alert.etaArrivalAt,
      etaUpdatedAt: alert.etaUpdatedAt,
      etaUpdatedBy: alert.etaUpdatedBy,
    };
    
    // Emit real-time update
    const realtimeService = require('../../services/realtimeService');
    realtimeService.emitSOSStatusUpdate(alertData).catch(err => console.error("Socket emit error:", err));
    realtimeService.emitSOSAssignmentAcknowledgement({
      ...alertData,
      acknowledgementType: 'unit-assigned',
      message: 'Your SOS has been acknowledged. A response unit has been assigned.',
      assignedUnit: alert.assignedTo[alert.assignedTo.length - 1] || null,
      acknowledgedAt: alert.responseDate || new Date(),
      etaLabel: alert.etaMinutes !== undefined && alert.etaMinutes !== null
        ? `Estimated arrival in ${alert.etaMinutes} minute(s)`
        : null,
    }).catch(err => console.error("Socket emit error:", err));

    res.status(200).json({
      success: true,
      message: "Unit assigned successfully",
      data: alert
    });

  } catch (err) {
    console.error("❌ assignUnitToAlert error:", err);
    next(err);
  }
};

// @desc    Mark SOS alert as resolved
// @route   PUT /api/authority/alerts/:id/resolve
// @access  Private (authority)
exports.resolveAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    const alert = await SOSAlert.findById(id);

    if (!alert) {
      return res.status(404).json({ success: false, message: "SOS Alert not found" });
    }

    alert.status = "resolved";
    alert.resolvedDate = new Date();
    
    // Optionally calculate total resolution time here if useful
    // const durationMs = alert.resolvedDate - alert.timestamp;

    await alert.save();

    // Emit real-time update for resolution
    const realtimeService = require('../../services/realtimeService');
    realtimeService.emitSOSStatusUpdate({
      alertId: alert._id,
      status: "resolved",
      resolvedDate: alert.resolvedDate
    }).catch(err => console.error("Socket emit error:", err));

    res.status(200).json({
      success: true,
      message: "Alert resolved successfully",
      data: alert
    });
  } catch (err) {
    console.error("❌ resolveAlert error:", err);
    next(err);
  }
};




