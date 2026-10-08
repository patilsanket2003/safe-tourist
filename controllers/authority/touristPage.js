const Tourist = require('../../models/Tourist');
const { decrypt } = require('../../utils/encrypt');

// @desc    Get tourist management dashboard data (Counts + Registry - ACTIVE ONLY)
// @route   GET /api/authority/tourist-management
// @access  Private (authority)
exports.getTouristManagementData = async (req, res, next) => {
  try {
    const { search } = req.query; // Optional filters
    const now = new Date();

    const activeFilter = {
      $or: [
        { expiresAt: { $gt: now } },
        { expiresAt: null },
        { expiresAt: { $exists: false } },
      ],
    };

    const expiredFilter = {
      expiresAt: { $ne: null, $lte: now },
    };

    // 1. Calculate Summary Stats
    const totalTourists = await Tourist.countDocuments();
    const activeTourists = await Tourist.countDocuments(activeFilter);
    const expiredTourists = await Tourist.countDocuments(expiredFilter);

    // Average Safety Score
    const avgScoreResult = await Tourist.aggregate([
      { $group: { _id: null, avg: { $avg: "$safetyScore" } } }
    ]);
    const averageSafetyScore = avgScoreResult.length > 0 ? Math.round(avgScoreResult[0].avg) : 0;

    // 2. Fetch Tourist Registry List - ACTIVE ONLY
    let query = { ...activeFilter };

    if (search) {
      // Simple search on touristId (which is plaintext)
      query.touristId = { $regex: search, $options: 'i' };
    }

    const touristsRaw = await Tourist.find(query).sort({ createdAt: -1 });

    const touristRegistry = touristsRaw.map(t => {
      let name = "Unknown";
      let phone = "Unknown";
      try {
        if (t.nameEncrypted) name = decrypt(t.nameEncrypted);
        if (t.phoneEncrypted) phone = decrypt(t.phoneEncrypted);
      } catch (e) {
        console.error(`Decrypt error for tourist ${t.touristId}:`, e.message);
      }

      return {
        id: t._id,
        touristId: t.touristId,
        name: name,
        phone: phone,
        country: "India",
        nationality: t.nationality || "Unknown",
        tripStart: t.createdAt,
        tripEnd: t.expiresAt,
        safetyScore: t.safetyScore,
        status: "ACTIVE",
        regTxHash: t.audit ? t.audit.regTxHash : "N/A",
        itinerary: t.dayWiseItinerary || []
      };
    });

    // If search parameter was provided and didn't match ID, let's try filtering by decrypted Name
    let filteredRegistry = touristRegistry;
    if (search && !query.touristId) {
      const searchLower = search.toLowerCase();
      filteredRegistry = touristRegistry.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.touristId.toLowerCase().includes(searchLower)
      );
    }


    res.status(200).json({
      success: true,
      data: {
        totalTourists,
        activeIDs: activeTourists,
        expiredIDs: expiredTourists,
        averageSafetyScore,
        registry: filteredRegistry
      }
    });

  } catch (err) {
    console.error("❌ getTouristManagementData error:", err);
    next(err);
  }
};

// @desc    Get expired tourist data (Secured: Blockchain & Alerts only)
// @route   GET /api/authority/expired-tourists
// @access  Private (authority)
exports.getExpiredTouristData = async (req, res, next) => {
  try {
    const { search } = req.query;
    const now = new Date();

    const query = {
      expiresAt: { $ne: null, $lte: now } // ONLY EXPIRED
    };

    if (search) {
      query.touristId = { $regex: search, $options: 'i' };
    }

    const expiredTourists = await Tourist.find(query).sort({ expiresAt: -1 }).lean();

    const registry = await Promise.all(expiredTourists.map(async (t) => {
      // Fetch alerts for this tourist
      const alerts = await SOSAlert.find({ touristId: t._id })
        .select('status timestamp location sosReason safetyScore')
        .lean();

      return {
        touristId: t.touristId,
        expiresAt: t.expiresAt,
        blockchainDetails: t.audit || {},
        sosAlerts: alerts.map(a => ({
          status: a.status,
          timestamp: a.timestamp,
          reason: a.sosReason ? a.sosReason.reason : 'Unknown',
          safetyScoreAtAlert: a.safetyScore
        }))
      };
    }));
    
    res.status(200).json({
      success: true,
      data: registry
    });

  } catch (err) {
    console.error("❌ getExpiredTouristData error:", err);
    next(err);
  }
};

// @desc    Revoke and delete a tourist ID
// @route   DELETE /api/authority/revoke/:id
// @access  Private (authority)
exports.revokeTourist = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: "Reason for revocation is required" });
    }

    // "if reason is either convicted to misbehave / status expired then only delete"
    const normalizedReason = reason.toLowerCase();
    const validReason =
      normalizedReason.includes('misbehave') ||
      normalizedReason.includes('convicted') ||
      normalizedReason.includes('expired') ||
      normalizedReason.includes('complete');

    if (!validReason) {
      return res.status(400).json({
        success: false,
        message: "Action denied. Valid reasons: 'Convicted/Misbehavior' or 'Status Expired/Trip Completed'."
      });
    }

    const tourist = await Tourist.findById(id);

    if (!tourist) {
      return res.status(404).json({ success: false, message: "Tourist not found" });
    }

    await Tourist.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: `Tourist ${tourist.touristId} has been revoked and removed.`
    });

  } catch (err) {
    console.error("❌ revokeTourist error:", err);
    next(err);
  }
};