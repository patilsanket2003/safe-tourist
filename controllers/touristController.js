const Tourist = require("../models/Tourist.js");
const { CustomError } = require('../middlewares/errorMiddleware');
const { encrypt, decrypt } = require("../utils/encrypt.js");


// @desc    Get the authenticated tourist's profile
// @route   GET /api/tourist/me
// @access  Private (tourist)

exports.getTouristById = async (req, res, next) => {
  try {
    // console.log("Tourist ID from request:", req.user.touristId);
    const touristId = req.user.touristId;

    // Find tourist by touristId
    const tourist = await Tourist.findOne({ touristId });
    if (!tourist) {
      console.log("Tourist not found in DB");
      return res.status(404).json({ error: "Tourist not found" });
    }

    const safeData = {
      touristId: tourist.touristId,
      name: tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : null,
      phone: tourist.phoneEncrypted ? decrypt(tourist.phoneEncrypted) : null,
      email: tourist.email,
      role: tourist.role, // IMPORTANT: Include role for frontend authorization
      groupId: tourist.groupId || null, // Include groupId for group members
      dayWiseItinerary: tourist.dayWiseItinerary, // updated field name
      dob: tourist.dob,
      nationality: tourist.nationality,
      gender: tourist.gender,
      bloodGroup: tourist.bloodGroup,
      medicalConditions: tourist.medicalConditions,
      allergies: tourist.allergies,
      emergencyContact: tourist.emergencyContactEncrypted
        ? JSON.parse(decrypt(tourist.emergencyContactEncrypted))
        : null,
      language: tourist.language,
      createdAt: tourist.createdAt,
      expiresAt: tourist.expiresAt,
      audit: tourist.audit
    };

    console.log("Final safeData object:", safeData);

    return res.status(200).json(safeData);

  } catch (err) {
    console.error("getTouristById error:", err);
    next(err);
  }
};

// @desc    Update tourist profile (Personal, Medical, Contact info)
// @route   PATCH /api/tourist/me
// @access  Private (tourist)
exports.updateTouristProfile = async (req, res, next) => {
  try {
    const touristId = req.user.touristId;
    const tourist = await Tourist.findOne({ touristId });
    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" });
    }

    const {
      name,
      phone,
      dob,
      nationality,
      gender,
      bloodGroup,
      medicalConditions,
      allergies,
      language,
      emergencyContact
    } = req.body;

    if (name) {
      tourist.nameEncrypted = encrypt(name.trim());
    }
    if (phone) {
      tourist.phoneEncrypted = encrypt(phone.trim());
    }
    if (dob !== undefined) {
      tourist.dob = dob ? new Date(dob) : null;
    }
    if (nationality !== undefined) {
      tourist.nationality = nationality;
    }
    if (gender !== undefined) {
      tourist.gender = gender;
    }
    if (bloodGroup !== undefined) {
      tourist.bloodGroup = bloodGroup;
    }
    if (medicalConditions !== undefined) {
      tourist.medicalConditions = medicalConditions;
    }
    if (allergies !== undefined) {
      tourist.allergies = allergies;
    }
    if (language !== undefined) {
      tourist.language = language;
    }
    if (emergencyContact) {
      tourist.emergencyContactEncrypted = encrypt(JSON.stringify(emergencyContact));
    }

    await tourist.save();

    const safeData = {
      touristId: tourist.touristId,
      name: tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : null,
      phone: tourist.phoneEncrypted ? decrypt(tourist.phoneEncrypted) : null,
      email: tourist.email,
      role: tourist.role,
      groupId: tourist.groupId || null,
      dayWiseItinerary: tourist.dayWiseItinerary,
      dob: tourist.dob,
      nationality: tourist.nationality,
      gender: tourist.gender,
      bloodGroup: tourist.bloodGroup,
      medicalConditions: tourist.medicalConditions,
      allergies: tourist.allergies,
      emergencyContact: tourist.emergencyContactEncrypted
        ? JSON.parse(decrypt(tourist.emergencyContactEncrypted))
        : null,
      language: tourist.language,
      createdAt: tourist.createdAt,
      expiresAt: tourist.expiresAt,
      audit: tourist.audit
    };

    return res.status(200).json(safeData);
  } catch (err) {
    console.error("updateTouristProfile error:", err);
    next(err);
  }
};

exports.getAllTourists = async (req, res, next) => {
  try {
    const tourists = await Tourist.find();

    const safe = tourists.map((tourist) => ({
      touristId: tourist.touristId,
      name: tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : null,
      phone: tourist.phoneEncrypted ? decrypt(tourist.phoneEncrypted) : null,
      email: tourist.email,
      itinerary: tourist.itineraryEncrypted
        ? JSON.parse(decrypt(tourist.itineraryEncrypted))
        : null,
      emergencyContact: tourist.emergencyContactEncrypted
        ? JSON.parse(decrypt(tourist.emergencyContactEncrypted))
        : null,
      language: tourist.language,
      safetyScore: tourist.safetyScore,
      createdAt: tourist.createdAt,
      expiresAt: tourist.expiresAt,
      audit: tourist.audit,
    }));

    res.json(safe);
  } catch (err) {
    console.error("❌ getAllTourists error:", err);
    next(err);
  }
};





