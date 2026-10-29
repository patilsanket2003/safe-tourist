const express = require("express");
const { verifyToken } = require("../middlewares/authMiddleware");
const {
  searchMemberByEmail,
  getFamilyMembers,
  addMember,
  removeMember,
  setLiveSharing,
  getActiveSharedWithMe
} = require("../controllers/familyController");

const router = express.Router();

router.use(verifyToken);

router.get("/search", searchMemberByEmail);
router.get("/members", getFamilyMembers);
router.post("/add-member", addMember);
router.delete("/remove-member/:memberTouristId", removeMember);
router.post("/share-location", setLiveSharing);
router.get("/active-shared-with-me", getActiveSharedWithMe);

module.exports = router;
