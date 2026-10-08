const TourGroup = require("../models/TourGroup");
const Tourist = require("../models/Tourist");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { encrypt, decrypt } = require("../utils/encrypt");
const { sha256Hex } = require("../utils/hash");
const {
  sendWelcomeEmail,
  sendProfileUpdateEmail,
  sendBulkWelcomeEmails,
} = require("../services/emailService");

// Helper function to format member response with decrypted data
const formatMemberResponse = (tourist, memberStatus = null) => {
  try {
    const response = {
      touristId: tourist._id,
      name: decrypt(tourist.nameEncrypted),
      email: tourist.email,
      phone: decrypt(tourist.phoneEncrypted),
      dob: tourist.dob,
      nationality: tourist.nationality,
      gender: tourist.gender,
      bloodGroup: tourist.bloodGroup,
      medicalConditions: tourist.medicalConditions,
      allergies: tourist.allergies,
      emergencyContact: tourist.emergencyContactEncrypted
        ? JSON.parse(decrypt(tourist.emergencyContactEncrypted))
        : null,
      role: tourist.role,
      safetyScore: tourist.safetyScore,
      createdAt: tourist.createdAt,
    };

    // Add member-specific status if provided
    if (memberStatus) {
      response.status = memberStatus.status;
      response.joinedAt = memberStatus.joinedAt;
      response.isOnline =
        memberStatus.lastKnownLocation?.coordinates?.length > 0;
    }

    return response;
  } catch (err) {
    console.error("Error formatting member response:", err);
    throw err;
  }
};

// GET /api/group/members - Get all members of admin's group with decrypted data
exports.getAllMembers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, search } = req.query;

    const tourist = await Tourist.findById(userId);
    if (!tourist) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Determine group
    const targetGroupId =
      tourist.role === "tour-admin" ? tourist.ownedGroupId : tourist.groupId;

    if (!targetGroupId) {
      return res.status(404).json({
        success: false,
        message: "No active group found for this user",
      });
    }

    // Get group with populated members
    const group = await TourGroup.findById(targetGroupId)
      .populate({
        path: "members.touristId",
        select:
          "touristId nameEncrypted email phoneEncrypted dob nationality gender bloodGroup medicalConditions allergies emergencyContactEncrypted safetyScore createdAt",
      })
      .lean();

    if (!group) {
      return res
        .status(404)
        .json({ success: false, message: "Group not found" });
    }

    // Decrypt and format members
    let formattedMembers = group.members
      .map((m) => {
        const t = m.touristId;
        if (!t) return null;

        try {
          const member = formatMemberResponse(t, m);
          return member;
        } catch (err) {
          console.error("Error formatting member:", err);
          return null;
        }
      })
      .filter(Boolean);

    // Filter by status if provided
    if (status && status !== "all") {
      formattedMembers = formattedMembers.filter((m) => m.status === status);
    }

    // Search by name if provided
    if (search) {
      const searchLower = search.toLowerCase();
      formattedMembers = formattedMembers.filter((m) =>
        m.name.toLowerCase().includes(searchLower),
      );
    }

    res.status(200).json({
      success: true,
      count: formattedMembers.length,
      members: formattedMembers,
    });
  } catch (err) {
    console.error("getAllMembers error:", err);
    next(err);
  }
};

// GET /api/group/members/:memberId - Get single member details
exports.getMemberById = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;

    // Validate admin
    const admin = await Tourist.findById(adminId);
    if (!admin || !admin.ownedGroupId) {
      return res.status(403).json({
        success: false,
        message: "Only tour admins with a group can access member details",
      });
    }

    // Find member
    const member = await Tourist.findById(memberId).lean();
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // Verify member belongs to admin's group
    if (
      !member.groupId ||
      member.groupId.toString() !== admin.ownedGroupId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This member does not belong to your group",
      });
    }

    // Get member status from group
    const group = await TourGroup.findById(admin.ownedGroupId).lean();
    const memberStatus = group.members.find(
      (m) => m.touristId.toString() === memberId,
    );

    const formattedMember = formatMemberResponse(member, memberStatus);

    res.status(200).json({
      success: true,
      member: formattedMember,
    });
  } catch (err) {
    console.error("getMemberById error:", err);
    next(err);
  }
};

// POST /api/group/members - Add new member to group
exports.addMember = async (req, res, next) => {
  try {
    console.log('[addMember] Request received');
    console.log('[addMember] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[addMember] Admin ID:', req.user?.id);
    
    const {
      name,
      email,
      phone,
      govId,
      dob,
      nationality,
      gender,
      bloodGroup,
      medicalConditions,
      allergies,
      emergencyContact,
    } = req.body;
    const adminId = req.user.id;

    // 1. Validate admin owns a group
    console.log('[addMember] Validating admin');
    const admin = await Tourist.findById(adminId);
    console.log('[addMember] Admin found:', !!admin);
    console.log('[addMember] Admin role:', admin?.role);
    console.log('[addMember] Admin ownedGroupId:', admin?.ownedGroupId);
    
    if (!admin || !admin.ownedGroupId) {
      console.error('[addMember] Admin validation failed');
      return res.status(403).json({
        success: false,
        message: "Only tour admins with a group can add members",
      });
    }

    // 2. Validate required fields
    console.log('[addMember] Validating required fields');
    if (!name || !email || !phone) {
      console.error('[addMember] Required fields missing:', { name: !!name, email: !!email, phone: !!phone });
      return res.status(400).json({
        success: false,
        message: "Name, email, and phone are required fields",
      });
    }

    // 3. Check if email already exists
    console.log('[addMember] Checking for existing email:', email);
    const existing = await Tourist.findOne({ email });
    if (existing) {
      console.error('[addMember] Email already exists:', email);
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists",
      });
    }

    // 4. Generate touristId
    const touristId =
      "T" + Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 999);
    console.log('[addMember] Generated touristId:', touristId);

    // 5. Encrypt sensitive fields
    const nameEnc = encrypt(name);
    const phoneEnc = encrypt(phone);
    const emergencyEnc = emergencyContact
      ? encrypt(JSON.stringify(emergencyContact))
      : null;

    // 6. Hash govId
    const govSalt = process.env.GOVID_SALT || "static-salt-for-dev";
    const govIdHash = govId ? sha256Hex(govId + govSalt) : sha256Hex("TEMP_ID_" + touristId);

    // 7. No password needed - group members login with 3 codes only
    // Using a placeholder hash that will never match any actual password
    const passwordHash = await bcrypt.hash("NO_PASSWORD_LOGIN_WITH_CODES_ONLY", 12);

    // 8. Get group to inherit trip dates
    console.log('[addMember] Fetching group:', admin.ownedGroupId);
    const group = await TourGroup.findById(admin.ownedGroupId);
    if (!group) {
      console.error('[addMember] Group not found:', admin.ownedGroupId);
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }
    console.log('[addMember] Group found:', group.groupName);

    // 9. Create new Tourist
    console.log('[addMember] Creating new Tourist document');
    const newMember = new Tourist({
      touristId,
      role: "group-member",
      nameEncrypted: nameEnc,
      email,
      phoneEncrypted: phoneEnc,
      govIdHash,
      dob: dob ? new Date(dob) : null,
      nationality,
      gender,
      bloodGroup,
      medicalConditions,
      allergies,
      emergencyContactEncrypted: emergencyEnc,
      passwordHash,
      groupId: admin.ownedGroupId,
      language: "en",
      safetyScore: 100,
      consent: {
        tracking: true,
        dataRetention: true,
        emergencySharing: true,
      },
      createdAt: new Date(),
      expiresAt: group.endDate, // Inherit from group
    });

    await newMember.save();
    console.log('[addMember] New member saved to database, ID:', newMember._id);

    // 10. Add to group's members array
    console.log('[addMember] Adding member to group members array');
    
    // Create member object without lastKnownLocation to avoid MongoDB geo index errors
    const memberEntry = {
      touristId: newMember._id,
      status: "active",
      joinedAt: new Date(),
    };
    
    group.members.push(memberEntry);
    await group.save();
    console.log('[addMember] Group updated, total members:', group.members.length);

    // 11. Return response (email will be sent when admin clicks "Send Welcome Email" button)
    console.log('[addMember] Member added successfully');
    res.status(201).json({
      success: true,
      message: "Member added successfully. Use 'Send Welcome Email' to notify them.",
      data: {
        touristId: newMember.touristId,
        memberObjectId: newMember._id,
        name: decrypt(newMember.nameEncrypted),
        email: newMember.email,
      },
    });
  } catch (err) {
    console.error("addMember error:", err);
    console.error("addMember error stack:", err.stack);
    next(err);
  }
};

// PUT /api/group/members/:memberId - Update member details
exports.updateMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const updates = req.body;

    // 1. Validate admin
    const admin = await Tourist.findById(adminId);
    if (!admin || !admin.ownedGroupId) {
      return res.status(403).json({
        success: false,
        message: "Only tour admins can update members",
      });
    }

    // 2. Find member
    const member = await Tourist.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // 3. Verify member belongs to admin's group
    if (
      !member.groupId ||
      member.groupId.toString() !== admin.ownedGroupId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This member does not belong to your group",
      });
    }

    // 4. Update fields (encrypt where needed)
    const updatedFields = [];
    
    if (updates.name) {
      member.nameEncrypted = encrypt(updates.name);
      updatedFields.push("Full Name");
    }
    if (updates.phone) {
      member.phoneEncrypted = encrypt(updates.phone);
      updatedFields.push("Phone Number");
    }
    if (updates.email) {
      // Check if new email is already taken
      const existingEmail = await Tourist.findOne({
        email: updates.email,
        _id: { $ne: memberId },
      });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "This email is already in use",
        });
      }
      member.email = updates.email;
      updatedFields.push("Email Address");
    }
    if (updates.dob) {
      member.dob = new Date(updates.dob);
      updatedFields.push("Date of Birth");
    }
    if (updates.nationality !== undefined) {
      member.nationality = updates.nationality;
      updatedFields.push("Nationality");
    }
    if (updates.gender) {
      member.gender = updates.gender;
      updatedFields.push("Gender");
    }
    if (updates.bloodGroup) {
      member.bloodGroup = updates.bloodGroup;
      updatedFields.push("Blood Group");
    }
    if (updates.medicalConditions !== undefined) {
      member.medicalConditions = updates.medicalConditions;
      updatedFields.push("Medical Conditions");
    }
    if (updates.allergies !== undefined) {
      member.allergies = updates.allergies;
      updatedFields.push("Allergies");
    }
    if (updates.emergencyContact) {
      member.emergencyContactEncrypted = encrypt(
        JSON.stringify(updates.emergencyContact),
      );
      updatedFields.push("Emergency Contact");
    }
    if (updates.govId) {
      const govSalt = process.env.GOVID_SALT || "static-salt-for-dev";
      member.govIdHash = sha256Hex(updates.govId + govSalt);
      updatedFields.push("Government ID");
    }

    await member.save();

    // 5. Send profile update email if fields were changed
    if (updatedFields.length > 0) {
      const memberName = decrypt(member.nameEncrypted);
      const adminName = decrypt(admin.nameEncrypted);
      
      const emailResult = await sendProfileUpdateEmail(
        member.email,
        memberName,
        updatedFields,
        adminName
      );

      if (!emailResult.success) {
        console.warn("Failed to send profile update email:", emailResult.error);
      }
    }

    // 6. Return updated member
    const formattedMember = formatMemberResponse(member);

    res.status(200).json({
      success: true,
      message: "Member updated successfully",
      member: formattedMember,
      emailSent: updatedFields.length > 0,
    });
  } catch (err) {
    console.error("updateMember error:", err);
    next(err);
  }
};

// DELETE /api/group/members/:memberId - Remove member from group
exports.removeMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;
    const adminId = req.user.id;
    const { deleteAccount } = req.query; // ?deleteAccount=true for hard delete

    // 1. Validate admin
    const admin = await Tourist.findById(adminId);
    if (!admin || !admin.ownedGroupId) {
      return res.status(403).json({
        success: false,
        message: "Only tour admins can remove members",
      });
    }

    // 2. Find member
    const member = await Tourist.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    // 3. Verify member belongs to admin's group
    if (
      !member.groupId ||
      member.groupId.toString() !== admin.ownedGroupId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "This member does not belong to your group",
      });
    }

    // 4. Remove from group
    const group = await TourGroup.findById(admin.ownedGroupId);
    group.members = group.members.filter(
      (m) => m.touristId.toString() !== memberId,
    );
    await group.save();

    // 5. Handle member account based on deleteAccount flag
    if (deleteAccount === "true") {
      // Hard delete - completely remove account
      await Tourist.findByIdAndDelete(memberId);
    } else {
      // Soft delete - convert to solo user
      member.role = "solo";
      member.groupId = null;
      await member.save();
    }

    res.status(200).json({
      success: true,
      message: deleteAccount === "true"
        ? "Member removed and account deleted"
        : "Member removed from group",
    });
  } catch (err) {
    console.error("removeMember error:", err);
    next(err);
  }
};

// POST /api/group/members/bulk - Bulk add members
exports.bulkAddMembers = async (req, res, next) => {
  try {
    const { members } = req.body; // Array of member objects
    const adminId = req.user.id;

    // 1. Validate admin
    const admin = await Tourist.findById(adminId);
    if (!admin || !admin.ownedGroupId) {
      return res.status(403).json({
        success: false,
        message: "Only tour admins with a group can add members",
      });
    }

    // 2. Validate input
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Members array is required and must not be empty",
      });
    }

    // 3. Get group
    const group = await TourGroup.findById(admin.ownedGroupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    const results = {
      success: [],
      failed: [],
    };

    // 4. Process each member
    for (const memberData of members) {
      try {
        const {
          name,
          email,
          phone,
          govId,
          dob,
          nationality,
          gender,
          bloodGroup,
          medicalConditions,
          allergies,
          emergencyContact,
        } = memberData;

        // Validate required fields
        if (!name || !email || !phone) {
          results.failed.push({
            email: email || "unknown",
            reason: "Missing required fields (name, email, phone)",
          });
          continue;
        }

        // Check if email already exists
        const existing = await Tourist.findOne({ email });
        if (existing) {
          results.failed.push({
            email,
            reason: "Email already exists",
          });
          continue;
        }

        // Generate touristId
        const touristId =
          "T" +
          Math.floor(Date.now() / 1000) +
          Math.floor(Math.random() * 999);

        // Encrypt sensitive fields
        const nameEnc = encrypt(name);
        const phoneEnc = encrypt(phone);
        const emergencyEnc = emergencyContact
          ? encrypt(JSON.stringify(emergencyContact))
          : null;

        // Hash govId
        const govSalt = process.env.GOVID_SALT || "static-salt-for-dev";
        const govIdHash = govId ? sha256Hex(govId + govSalt) : sha256Hex("TEMP_ID_" + touristId);

        // No password needed - group members login with 3 codes only
        const passwordHash = await bcrypt.hash("NO_PASSWORD_LOGIN_WITH_CODES_ONLY", 12);

        // Create new Tourist
        const newMember = new Tourist({
          touristId,
          role: "group-member",
          nameEncrypted: nameEnc,
          email,
          phoneEncrypted: phoneEnc,
          govIdHash,
          dob: dob ? new Date(dob) : null,
          nationality,
          gender,
          bloodGroup,
          medicalConditions,
          allergies,
          emergencyContactEncrypted: emergencyEnc,
          passwordHash,
          groupId: admin.ownedGroupId,
          language: "en",
          safetyScore: 100,
          consent: {
            tracking: true,
            dataRetention: true,
            emergencySharing: true,
          },
          createdAt: new Date(),
          expiresAt: group.endDate,
        });

        await newMember.save();

        // Add to group's members array
        group.members.push({
          touristId: newMember._id,
          status: "active",
          joinedAt: new Date(),
        });

        results.success.push({
          touristId: newMember._id,
          name: decrypt(newMember.nameEncrypted),
          email: newMember.email,
        });
      } catch (err) {
        console.error("Error adding member:", memberData.email, err);
        results.failed.push({
          email: memberData.email || "unknown",
          reason: err.message,
        });
      }
    }

    // Save group with all new members
    await group.save();

    res.status(201).json({
      success: true,
      message: `Bulk add completed: ${results.success.length} succeeded, ${results.failed.length} failed. Use 'Send Welcome Email' to notify members.`,
      results,
    });
  } catch (err) {
    console.error("bulkAddMembers error:", err);
    next(err);
  }
};

// POST /api/group/members/send-welcome-all - Send welcome emails to all group members
exports.sendWelcomeEmailsToAll = async (req, res, next) => {
  try {
    const adminId = req.user.id;

    // 1. Validate admin
    const admin = await Tourist.findById(adminId);
    if (!admin || !admin.ownedGroupId) {
      return res.status(403).json({
        success: false,
        message: "Only tour admins with a group can send welcome emails",
      });
    }

    // 2. Get group with members
    const group = await TourGroup.findById(admin.ownedGroupId)
      .populate({
        path: "members.touristId",
        select: "touristId nameEncrypted email _id",
      })
      .lean();

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Group not found",
      });
    }

    // 3. Check if group has members
    if (!group.members || group.members.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No members in the group to send emails to",
      });
    }

    // 4. Prepare member data for emails (resend allowed for all valid members)
    const membersData = group.members
      .map((m) => {
        const tourist = m.touristId;
        if (!tourist || !tourist.email) return null;

        try {
          return {
            name: decrypt(tourist.nameEncrypted),
            email: tourist.email,
            touristId: tourist.touristId,
            _id: tourist._id,
          };
        } catch (err) {
          console.error("Error decrypting member data:", err);
          return null;
        }
      })
      .filter(Boolean);

    if (membersData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid members found with email addresses",
      });
    }

    // 5. Send bulk welcome emails
    const adminName = decrypt(admin.nameEncrypted);
    const guideId = admin.touristId;
    const groupAccessCode = group.accessCode;

    const emailResults = await sendBulkWelcomeEmails(
      membersData,
      guideId,
      groupAccessCode,
      group.groupName,
      adminName
    );

    const failedMessages = emailResults.results
      .map((result) => {
        if (result.status === "fulfilled" && !result.value?.success) {
          return result.value?.error;
        }
        if (result.status === "rejected") {
          return result.reason?.message || "Unknown email send error";
        }
        return null;
      })
      .filter(Boolean);

    if (emailResults.successful === 0) {
      return res.status(502).json({
        success: false,
        message: failedMessages[0] || "Failed to send welcome emails",
        data: {
          totalMembers: group.members.length,
          targetedMembers: membersData.length,
          emailsSent: 0,
          emailsFailed: emailResults.failed,
        },
      });
    }

    // 6. Update welcomeEmailSent flag for successfully sent emails
    const successfulEmails = emailResults.results
      .map((result, index) => {
        if (result.status === "fulfilled" && result.value.success) {
          return membersData[index]._id;
        }
        return null;
      })
      .filter(Boolean);

    if (successfulEmails.length > 0) {
      await Tourist.updateMany(
        { _id: { $in: successfulEmails } },
        { $set: { welcomeEmailSent: true } }
      );
      console.log(`Updated welcomeEmailSent flag for ${successfulEmails.length} members`);
    }

    // 7. Return results
    res.status(200).json({
      success: true,
      message: `Welcome emails sent: ${emailResults.successful}/${emailResults.total} successful`,
      data: {
        totalMembers: group.members.length,
        targetedMembers: membersData.length,
        emailsSent: emailResults.successful,
        emailsFailed: emailResults.failed,
      },
    });
  } catch (err) {
    console.error("sendWelcomeEmailsToAll error:", err);
    next(err);
  }
};
