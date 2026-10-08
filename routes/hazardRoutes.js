const express = require('express');
const { getNearbyHazards } = require('../controllers/hazardController');

const router = express.Router();

router.get('/nearby', getNearbyHazards);

module.exports = router;
