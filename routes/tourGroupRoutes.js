const express = require("express");
const { verifyToken, isTourAdmin } = require("../middlewares/authMiddleware");
const {
  createGroup,
  joinGroup,
  getGroupDashboard,
  updateGroupItinerary,
} = require("../controllers/tourGroupController");

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Only tour-admins can create groups
router.post("/create", isTourAdmin, createGroup);

// Group members can join (no additional role check)
router.post("/join", joinGroup);

// Both tour-admins and group-members can view dashboard
router.get("/dashboard", getGroupDashboard);

// Only tour-admins can update group itinerary (additional check in controller)
router.put("/update", isTourAdmin, updateGroupItinerary);

module.exports = router;
