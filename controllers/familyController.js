const Tourist = require("../models/Tourist");
const { decrypt } = require("../utils/encrypt");
const realtimeService = require("../services/realtimeService");

const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Search for a registered user by email
 * GET /api/family/search?email=xyz@example.com
 */
exports.searchMemberByEmail = async (req, res) => {
  try {
    const email = req.query.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: "Email ID is required", message: "Email ID is required" });
    }

    const currentTouristId = req.user.touristId;

    // Look up user by email (case-insensitive safe match)
    const targetUser = await Tourist.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(email)}$`, "i") }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: "No account found with this email ID. Only registered users who have an account in the app can be added.",
        message: "No account found with this email ID. Only registered users who have an account in the app can be added."
      });
    }

    if (targetUser.touristId === currentTouristId) {
      return res.status(400).json({
        error: "You cannot add yourself to your family circle.",
        message: "You cannot add yourself to your family circle."
      });
    }

    const name = targetUser.nameEncrypted ? decrypt(targetUser.nameEncrypted) : "Registered Tourist";
    const phone = targetUser.phoneEncrypted ? decrypt(targetUser.phoneEncrypted) : "";

    return res.status(200).json({
      success: true,
      user: {
        touristId: targetUser.touristId,
        name,
        email: targetUser.email,
        phone,
        role: targetUser.role
      }
    });
  } catch (err) {
    console.error("searchMemberByEmail error:", err);
    return res.status(500).json({ error: "Failed to search for user", message: "Failed to search for user" });
  }
};

/**
 * Get all members in the current user's family circle
 * GET /api/family/members
 */
exports.getFamilyMembers = async (req, res) => {
  try {
    const touristId = req.user.touristId;
    const tourist = await Tourist.findOne({ touristId });

    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" });
    }

    const members = tourist.familyCircle || [];
    
    // Check which members are currently sharing with this user
    const activeSharers = realtimeService.getFamilySharersForRecipient(touristId);

    const enrichedMembers = members.map((m) => {
      const isSharingWithMe = activeSharers.has(m.memberTouristId);
      return {
        memberTouristId: m.memberTouristId,
        name: m.name,
        email: m.email,
        phone: m.phone,
        relationship: m.relationship || "Family",
        isSharingWith: !!m.isSharingWith,
        isSharingWithMe,
        addedAt: m.addedAt
      };
    });

    return res.status(200).json({
      success: true,
      members: enrichedMembers
    });
  } catch (err) {
    console.error("getFamilyMembers error:", err);
    return res.status(500).json({ error: "Failed to fetch family members" });
  }
};

/**
 * Add a registered member to the family circle
 * POST /api/family/add-member
 * Body: { email, relationship }
 */
exports.addMember = async (req, res) => {
  try {
    const { email, relationship } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: "Email ID is required", message: "Email ID is required" });
    }

    const currentTouristId = req.user.touristId;
    const cleanEmail = email.trim().toLowerCase();

    // 1. Check if target user exists in DB
    const targetUser = await Tourist.findOne({
      email: { $regex: new RegExp(`^${escapeRegex(cleanEmail)}$`, "i") }
    });

    if (!targetUser) {
      return res.status(404).json({
        error: "User with this email ID doesn't exist. They must have an account in the app first.",
        message: "User with this email ID doesn't exist. They must have an account in the app first."
      });
    }

    if (targetUser.touristId === currentTouristId) {
      return res.status(400).json({
        error: "You cannot add yourself to your family circle.",
        message: "You cannot add yourself to your family circle."
      });
    }

    // 2. Load current user's profile
    const currentUser = await Tourist.findOne({ touristId: currentTouristId });
    if (!currentUser) {
      return res.status(404).json({ error: "Current user not found" });
    }

    if (!currentUser.familyCircle) {
      currentUser.familyCircle = [];
    }

    // 3. Check if already added
    const alreadyAdded = currentUser.familyCircle.some(
      (m) => m.memberTouristId === targetUser.touristId || m.email.toLowerCase() === cleanEmail
    );

    if (alreadyAdded) {
      return res.status(400).json({
        error: "This person is already in your family & friends circle.",
        message: "This person is already in your family & friends circle."
      });
    }

    const name = targetUser.nameEncrypted ? decrypt(targetUser.nameEncrypted) : "Registered Tourist";
    const phone = targetUser.phoneEncrypted ? decrypt(targetUser.phoneEncrypted) : "";

    const newMember = {
      memberTouristId: targetUser.touristId,
      name,
      email: targetUser.email,
      phone,
      relationship: relationship?.trim() || "Family",
      isSharingWith: false,
      addedAt: new Date()
    };

    currentUser.familyCircle.push(newMember);
    await currentUser.save();

    return res.status(200).json({
      success: true,
      message: `${name} has been added to your safety circle!`,
      member: newMember,
      members: currentUser.familyCircle
    });
  } catch (err) {
    console.error("addMember error:", err);
    return res.status(500).json({ error: "Failed to add member to circle" });
  }
};

/**
 * Remove a member from the family circle
 * DELETE /api/family/remove-member/:memberTouristId
 */
exports.removeMember = async (req, res) => {
  try {
    const { memberTouristId } = req.params;
    const currentTouristId = req.user.touristId;

    const currentUser = await Tourist.findOne({ touristId: currentTouristId });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Stop location sharing with this member if active
    realtimeService.stopFamilyShare(currentTouristId, memberTouristId);

    currentUser.familyCircle = (currentUser.familyCircle || []).filter(
      (m) => m.memberTouristId !== memberTouristId
    );

    await currentUser.save();

    return res.status(200).json({
      success: true,
      message: "Member removed from circle",
      members: currentUser.familyCircle
    });
  } catch (err) {
    console.error("removeMember error:", err);
    return res.status(500).json({ error: "Failed to remove member" });
  }
};

/**
 * Start or stop live location sharing with one or multiple selected members
 * POST /api/family/share-location
 * Body: { recipientTouristIds: string[], active: boolean }
 */
exports.setLiveSharing = async (req, res) => {
  try {
    const { recipientTouristIds, active } = req.body;
    const currentTouristId = req.user.touristId;

    if (!Array.isArray(recipientTouristIds)) {
      return res.status(400).json({ error: "recipientTouristIds must be an array" });
    }

    const currentUser = await Tourist.findOne({ touristId: currentTouristId });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const sharerName = currentUser.nameEncrypted
      ? decrypt(currentUser.nameEncrypted)
      : "Your Contact";

    // Update isSharingWith flag in database
    currentUser.familyCircle = (currentUser.familyCircle || []).map((m) => {
      if (recipientTouristIds.includes(m.memberTouristId)) {
        return {
          ...m.toObject(),
          isSharingWith: !!active
        };
      }
      return m;
    });

    await currentUser.save();

    // Update real-time sharing state
    if (active) {
      realtimeService.startFamilyShare(currentTouristId, recipientTouristIds, sharerName);
    } else {
      realtimeService.stopFamilyShare(currentTouristId, recipientTouristIds);
    }

    return res.status(200).json({
      success: true,
      message: active
        ? `Live location sharing started with ${recipientTouristIds.length} contact(s).`
        : `Live location sharing ended.`,
      active: !!active,
      recipientTouristIds
    });
  } catch (err) {
    console.error("setLiveSharing error:", err);
    return res.status(500).json({ error: "Failed to update location sharing status" });
  }
};

/**
 * Get active locations of all family/friends currently sharing live location with current user
 * GET /api/family/active-shared-with-me
 */
exports.getActiveSharedWithMe = async (req, res) => {
  try {
    const currentTouristId = req.user.touristId;
    const activeLocations = realtimeService.getActiveSharedLocationsForRecipient(currentTouristId);

    return res.status(200).json({
      success: true,
      locations: activeLocations
    });
  } catch (err) {
    console.error("getActiveSharedWithMe error:", err);
    return res.status(500).json({ error: "Failed to fetch shared locations" });
  }
};
