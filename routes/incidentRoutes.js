const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST /api/incidents - Report a new incident
router.post('/', verifyToken, incidentController.reportIncident);

module.exports = router;
