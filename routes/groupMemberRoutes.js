const express = require("express");
const { verifyToken, isTourAdmin } = require("../middlewares/authMiddleware");
const {
  getAllMembers,
  getMemberById,
  addMember,
  updateMember,
  removeMember,
  bulkAddMembers,
  sendWelcomeEmailsToAll,
} = require("../controllers/groupMemberController");

const router = express.Router();

// All routes require authentication and tour-admin role
router.use(verifyToken,isTourAdmin);

// GET /api/group/members - Get all members with optional filters
router.get("/", getAllMembers);

// POST /api/group/members/send-welcome-all - Send welcome emails to all members
router.post("/send-welcome-all", sendWelcomeEmailsToAll);

// POST /api/group/members/bulk - Bulk add members
router.post("/bulk", bulkAddMembers);

// POST /api/group/members - Add new member
router.post("/", addMember);

// GET /api/group/members/:memberId - Get single member details
router.get("/:memberId", getMemberById);

// PUT /api/group/members/:memberId - Update member information
router.put("/:memberId", updateMember);

// DELETE /api/group/members/:memberId - Remove member from group
router.delete("/:memberId", removeMember);

module.exports = router;
