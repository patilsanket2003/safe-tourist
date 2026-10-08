const jwt = require("jsonwebtoken");
const Tourist = require("../models/Tourist.js");
const bcrypt = require("bcryptjs");
const { encrypt } = require("../utils/encrypt.js");
const { decrypt } = require("../utils/encrypt.js");
const { sha256Hex } = require("../utils/hash.js");
const { hex64ToBytes32 } = require("../utils/ethFormat.js");
const blockchain = require("../services/blockchainService.js");
const QRCode = require("qrcode");

const { JWT_SECRET, JWT_EXPIRES_IN, GOVID_SALT} = require("../config/config");
const SERVER_URL= "https://smart-tourist-safety-app-backend-1.onrender.com";
const QR_SIGN_SECRET = `${JWT_SECRET}_qr`;
const QR_TOKEN_EXPIRES_IN = "180d";

const normalizeHex = (h) =>
  h ? (h.startsWith("0x") ? h.toLowerCase() : `0x${h.toLowerCase()}`) : h;

const escapeHtml = (value) => {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

exports.registerTourist = async (req, res, next) => {
  try {
    const {
      name,
      govId,
      phone,
      email,
      dayWiseItinerary,
      emergencyContact,
      password,
      language,
      tripEndDate,
      role,
      // New fields
      dob,
      nationality,
      gender,
      bloodGroup,
      medicalConditions,
      allergies,
    } = req.body;
    const { consent } = req.body;

    // Basic validation
    if (!name || !govId || !phone || !emergencyContact || !password || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingTourist = await Tourist.findOne({ email });

    if (existingTourist) {
      const error = new Error("tourist already exists");
      error.statusCode = 409;
      throw error;
    }

    // Generate internal touristId
    const touristId =
      "T" + Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 999);

    // Encrypt sensitive fields
    const nameEnc = encrypt(name);
    const phoneEnc = encrypt(phone);

    // Only process itinerary if provided (Solo travelers or one-step flow)
    // const dayWiseItineraryEnc =
    //   dayWiseItinerary && dayWiseItinerary.length > 0
    //     ? encrypt(JSON.stringify(dayWiseItinerary))
    //     : []; // Default to empty array for Admins/Members initially

    const emergencyEnc = encrypt(JSON.stringify(emergencyContact));

    // Password hashing
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Government ID hash
    const govSalt = GOVID_SALT 
    const govIdHash = sha256Hex(govId + govSalt);

    // Deterministic fields for blockchain/audit
    const registeredAtIso = new Date().toISOString();
    // Use empty string hash if no itinerary yet
    const dayWiseItineraryHash = sha256Hex(
      JSON.stringify(dayWiseItinerary || ""),
    );
    const payload = `${touristId}|${govIdHash}|${dayWiseItineraryHash}|${registeredAtIso}`;
    const payloadHash = sha256Hex(payload);
    // Debug log for blockchain audit troubleshooting
    console.log('register: touristId=', touristId);
    console.log('register: govIdHash=', govIdHash);
    console.log('register: dayWiseItineraryHash=', dayWiseItineraryHash);
    console.log('register: registeredAtIso=', registeredAtIso);
    console.log('register: payload=', payload);
    console.log('register: payloadHash=', payloadHash);

    // Create Tourist record
    const tourist = new Tourist({
      touristId,
      role: role || "solo", // Default to solo
      nameEncrypted: nameEnc,
      govIdHash,
      phoneEncrypted: phoneEnc,
      email,
      dayWiseItinerary: dayWiseItinerary,
      emergencyContactEncrypted: emergencyEnc,
      passwordHash,
      language: language || "en",

      // Personal & Medical Info
      dob,
      nationality,
      gender,
      bloodGroup,
      medicalConditions,
      allergies,

      // Preferences for Commuters (Safe Pulse / Routes)
      // preferences: preferences || {},

      consent: {
        tracking: consent?.tracking || false,
        dataRetention: consent?.dataRetention || false,
        emergencySharing: consent?.emergencySharing || false,
      },
      createdAt: new Date(),
      expiresAt: tripEndDate ? new Date(tripEndDate) : null,
    });

    await tourist.save();

    // Blockchain push - Proceed regardless of itinerary presence (Log Identity Creation)
    const { v4: uuidv4 } = await import("uuid");
    const eventIdRaw = uuidv4() + "|" + touristId;
    const eventIdHash = sha256Hex(eventIdRaw);
    const eventIdBytes32 = hex64ToBytes32(eventIdHash);
    const payloadHashBytes32 = hex64ToBytes32(payloadHash);

    let txHash;
    try {
      txHash = await blockchain.storeEvent(eventIdBytes32, payloadHashBytes32);
      if (txHash) {
        console.log("transaction hash returned correctly");
      }
    } catch (err) {
      console.error("Blockchain tx failed:", err);
      txHash = null;
    }

    tourist.audit = {
      regHash: payloadHash,
      regTxHash: txHash || "not-recorded",
      eventId: eventIdHash,
      dayWiseItineraryHash: dayWiseItineraryHash, // might be empty hash for admins
      registeredAtIso: registeredAtIso,
    };

    await tourist.save();

    // Generate Token for immediate login
    const tokenPayload = {
      touristId: tourist.touristId,
      id: tourist._id,
      role: tourist.role,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: "Registered successfully.",
      touristId,
      token,
      role: tourist.role,
      audit: {
        regHash: payloadHash,
        regTxHash: txHash,
        eventId: eventIdHash,
      },
    });
  } catch (err) {
    console.error("registerTourist error", err);
    next(err);
  }
};

exports.loginTourist = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find tourist by email
    const tourist = await Tourist.findOne({ email: email });
    if (!tourist) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ⚠️ Block group members from email/password login - they must use 3-code login
    if (tourist.role === "group-member") {
      return res.status(403).json({ 
        error: "Group members must login using the 3-code system. Please use 'Group Member? Login with Codes' option.",
        code: "GROUP_MEMBER_USE_CODES"
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, tourist.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const payload = {
      id: tourist._id, // Standardize to id
      touristId: tourist.touristId,
      role: tourist.role || "solo",
      language: tourist.language,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(200).json({
      message: "Login successful",
      touristId: tourist.touristId,
      role: tourist.role || "solo",
      groupId: tourist.groupId,
      ownedGroupId: tourist.ownedGroupId,
      token,
    });
  } catch (err) {
    console.error("loginTourist error:", err);
    next(err);
  }
};

// POST /api/auth/login-with-codes - Login for group members using 3 codes
exports.loginWithCodes = async (req, res, next) => {
  try {
    const { guideId, touristId, groupAccessCode } = req.body;

    // 1. Validate all three codes are provided
    if (!guideId || !touristId || !groupAccessCode) {
      return res.status(400).json({
        success: false,
        error: "All three codes are required: Guide ID, Tourist ID, and Group Access Code",
      });
    }

    // 2. Find the tourist (group member) by touristId
    const tourist = await Tourist.findOne({ touristId: touristId }).populate('groupId');
    if (!tourist) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Please check your codes and try again.",
      });
    }

    // 3. Verify tourist is a group member
    if (tourist.role !== "group-member") {
      return res.status(403).json({
        success: false,
        error: "This login method is only for group members. Please use email/password login.",
      });
    }

    // 4. Verify tourist belongs to a group
    if (!tourist.groupId) {
      return res.status(401).json({
        success: false,
        error: "You are not assigned to any group. Please contact your tour guide.",
      });
    }

    // 5. Get the group to verify access code
    const TourGroup = require("../models/TourGroup");
    const group = await TourGroup.findById(tourist.groupId).populate('adminId');
    
    if (!group) {
      return res.status(401).json({
        success: false,
        error: "Group not found. Please contact your tour guide.",
      });
    }

    // 6. Verify group access code matches
    if (group.accessCode !== groupAccessCode) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Please check your codes and try again.",
      });
    }

    // 7. Verify guide ID matches the group admin
    const admin = group.adminId;
    if (!admin || admin.touristId !== guideId) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials. Please check your codes and try again.",
      });
    }

    // 8. All validations passed - Generate JWT
    const payload = {
      id: tourist._id,
      touristId: tourist.touristId,
      role: tourist.role,
      language: tourist.language,
    };

    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    // 9. Return success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        touristId: tourist.touristId,
        name: decrypt(tourist.nameEncrypted),
        role: tourist.role,
        groupId: tourist.groupId ? tourist.groupId.toString() : null,
        groupName: group.groupName,
        token,
      },
    });
  } catch (err) {
    console.error("loginWithCodes error:", err);
    next(err);
  }
};

// GET /api/auth/qr/:touristId - Generate signed QR payload + image for tourist verification
exports.generateTouristQR = async (req, res, next) => {
  try {
    const { touristId } = req.params;

    const tourist = await Tourist.findOne({ touristId }).select("touristId role nationality expiresAt audit nameEncrypted");
    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" });
    }

    if (!tourist.audit?.eventId || !tourist.audit?.regHash) {
      return res.status(400).json({
        error: "Tourist does not have complete blockchain audit data",
      });
    }

    const qrToken = jwt.sign(
      {
        touristId: tourist.touristId,
        eventId: tourist.audit.eventId,
        regTxHash: tourist.audit.regTxHash,
      },
      QR_SIGN_SECRET,
      { expiresIn: QR_TOKEN_EXPIRES_IN },
    );

    const scanPath = `/api/auth/qr/scan/${qrToken}`;
    const scanUrl = SERVER_URL ? `${SERVER_URL}${scanPath}` : scanPath;
    const qrImageDataUrl = await QRCode.toDataURL(scanUrl, { margin: 2, width: 320 });

    return res.status(200).json({
      message: "QR generated successfully",
      touristId: tourist.touristId,
      scanUrl,
      qrToken,
      qrImageDataUrl,
      preview: {
        name: tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : "Unknown",
        role: tourist.role,
        nationality: tourist.nationality || null,
      },
      blockchain: {
        eventId: tourist.audit.eventId,
        regTxHash: tourist.audit.regTxHash,
      },
    });
  } catch (err) {
    console.error("generateTouristQR error:", err);
    next(err);
  }
};

// GET /api/auth/qr/scan/:token - Public scan endpoint (basic profile + blockchain proof)
exports.scanTouristQR = async (req, res, next) => {
  try {
    const { token } = req.params;

    let decoded;
    try {
      decoded = jwt.verify(token, QR_SIGN_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired QR token" });
    }

    const tourist = await Tourist.findOne({ touristId: decoded.touristId }).select(
      "touristId role nationality createdAt expiresAt audit nameEncrypted",
    );
    if (!tourist) {
      return res.status(404).json({ error: "Tourist not found" });
    }

    if (!tourist.audit?.eventId) {
      return res.status(400).json({ error: "No blockchain eventId found for this tourist" });
    }

    const payloadHashToVerify = tourist.audit?.regHash;
    if (!payloadHashToVerify) {
      return res.status(400).json({ error: "No blockchain payload hash found for this tourist" });
    }

    let checkedContractAddress = blockchain.getConfiguredContractAddress();
    const contractAddressFromTx = tourist.audit?.regTxHash
      ? await blockchain.resolveContractAddressFromTx(tourist.audit.regTxHash)
      : null;

    let verified = await blockchain.verifyAuditRecord(
      hex64ToBytes32(tourist.audit.eventId),
      hex64ToBytes32(payloadHashToVerify),
    );

    if (!verified && contractAddressFromTx) {
      const normalizedDefault = checkedContractAddress ? checkedContractAddress.toLowerCase() : null;
      const normalizedFromTx = contractAddressFromTx.toLowerCase();

      if (!normalizedDefault || normalizedDefault !== normalizedFromTx) {
        verified = await blockchain.verifyAuditRecordAt(
          contractAddressFromTx,
          hex64ToBytes32(tourist.audit.eventId),
          hex64ToBytes32(payloadHashToVerify),
        );
        checkedContractAddress = contractAddressFromTx;
      }
    }

    const responsePayload = {
      source: "qr-scan",
      verified,
      basicTourist: {
        touristId: tourist.touristId,
        name: tourist.nameEncrypted ? decrypt(tourist.nameEncrypted) : "Unknown",
        role: tourist.role,
        nationality: tourist.nationality || null,
        registrationDate: tourist.createdAt,
        tripExpiryDate: tourist.expiresAt || null,
      },
      blockchain: {
        eventId: tourist.audit.eventId,
        regTxHash: tourist.audit.regTxHash,
        payloadHash: tourist.audit.regHash,
        payloadHashNormalized: normalizeHex(tourist.audit.regHash),
        contractAddressChecked: checkedContractAddress,
        contractAddressFromTx,
      },
    };

    if (req.query.format === "json") {
      return res.status(200).json(responsePayload);
    }

    const statusLabel = responsePayload.verified ? "Verified" : "Not Verified";
    const statusClass = responsePayload.verified ? "ok" : "bad";
    const registrationDate = responsePayload.basicTourist.registrationDate
      ? new Date(responsePayload.basicTourist.registrationDate).toLocaleString("en-IN")
      : "N/A";
    const expiryDate = responsePayload.basicTourist.tripExpiryDate
      ? new Date(responsePayload.basicTourist.tripExpiryDate).toLocaleString("en-IN")
      : "N/A";

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tourist Verification Card</title>
  <style>
    :root {
      --bg: #f2f6ff;
      --card: #ffffff;
      --text: #10223e;
      --muted: #5a6780;
      --line: #d9e2f1;
      --ok: #118a43;
      --bad: #c62828;
      --accent: #1f4d8f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif;
      background: radial-gradient(circle at 20% 10%, #e8f0ff, var(--bg));
      color: var(--text);
      padding: 24px;
    }
    .wrap {
      max-width: 920px;
      margin: 0 auto;
      display: grid;
      gap: 16px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 14px;
      box-shadow: 0 8px 24px rgba(31, 77, 143, 0.08);
      overflow: hidden;
    }
    .header {
      padding: 16px 20px;
      background: linear-gradient(135deg, #1f4d8f, #2f6bc2);
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .status {
      padding: 6px 12px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      background: #fff;
    }
    .status.ok { color: var(--ok); }
    .status.bad { color: var(--bad); }
    .body {
      padding: 18px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    .section {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 14px;
      background: #fcfdff;
    }
    .section h3 {
      margin: 0 0 12px;
      font-size: 15px;
      color: var(--accent);
    }
    .row {
      display: grid;
      grid-template-columns: 210px 1fr;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px dashed var(--line);
      font-size: 14px;
    }
    .row:last-child { border-bottom: none; }
    .key { color: var(--muted); font-weight: 600; }
    .value {
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      color: #1a2f52;
    }
    .value.normal {
      font-family: inherit;
      color: var(--text);
    }
    .footer-note {
      color: var(--muted);
      font-size: 12px;
      text-align: center;
      margin-top: 8px;
    }
    @media (max-width: 680px) {
      .row {
        grid-template-columns: 1fr;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card">
      <header class="header">
        <div class="title">Tourist Verification ID Card</div>
        <div class="status ${statusClass}">${statusLabel}</div>
      </header>
      <div class="body">
        <section class="section">
          <h3>Basic Tourist Details</h3>
          <div class="row"><div class="key">Tourist ID</div><div class="value normal">${escapeHtml(responsePayload.basicTourist.touristId)}</div></div>
          <div class="row"><div class="key">Name</div><div class="value normal">${escapeHtml(responsePayload.basicTourist.name)}</div></div>
          <div class="row"><div class="key">Role</div><div class="value normal">${escapeHtml(responsePayload.basicTourist.role || "N/A")}</div></div>
          <div class="row"><div class="key">Nationality</div><div class="value normal">${escapeHtml(responsePayload.basicTourist.nationality || "N/A")}</div></div>
          <div class="row"><div class="key">Registration Date</div><div class="value normal">${escapeHtml(registrationDate)}</div></div>
          <div class="row"><div class="key">Trip Expiry Date</div><div class="value normal">${escapeHtml(expiryDate)}</div></div>
        </section>

        <section class="section">
          <h3>Blockchain Audit Trail</h3>
          <div class="row"><div class="key">Event ID</div><div class="value">${escapeHtml(responsePayload.blockchain.eventId)}</div></div>
          <div class="row"><div class="key">Registration Tx Hash</div><div class="value">${escapeHtml(responsePayload.blockchain.regTxHash || "N/A")}</div></div>
          <div class="row"><div class="key">Payload Hash</div><div class="value">${escapeHtml(responsePayload.blockchain.payloadHash || "N/A")}</div></div>
          <div class="row"><div class="key">Payload Hash (Normalized)</div><div class="value">${escapeHtml(responsePayload.blockchain.payloadHashNormalized || "N/A")}</div></div>
          <div class="row"><div class="key">Contract Address Checked</div><div class="value">${escapeHtml(responsePayload.blockchain.contractAddressChecked || "N/A")}</div></div>
          <div class="row"><div class="key">Contract Address From Tx</div><div class="value">${escapeHtml(responsePayload.blockchain.contractAddressFromTx || "N/A")}</div></div>
        </section>

        <div class="footer-note">This page shows basic identity data and immutable blockchain proof for verification purposes.</div>
      </div>
    </section>
  </main>
</body>
</html>`;

    return res.status(200).type("html").send(html);
  } catch (err) {
    console.error("scanTouristQR error:", err);
    next(err);
  }
};

const EmergencyVehicle = require('../models/EmergencyVehicle');

exports.loginEmergencyVehicle = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'vehicleId is required' });

    const vehicle = await EmergencyVehicle.findOne({ vehicleId });
    if (!vehicle) return res.status(404).json({ success: false, message: 'Emergency vehicle not found' });
    if (!vehicle.isActive) return res.status(403).json({ success: false, message: 'Emergency vehicle is inactive' });

    const token = jwt.sign(
      { id: vehicle._id, vehicleId: vehicle.vehicleId, role: 'emergency_vehicle', type: vehicle.type },
      process.env.JWT_SECRET || JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.status(200).json({ success: true, token, vehicle });
  } catch (err) {
    next(err);
  }
};
