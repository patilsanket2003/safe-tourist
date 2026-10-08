const express = require('express');
const router = express.Router();
const { verifyToken, isSolo } = require('../middlewares/authMiddleware');
const itineraryController = require('../controllers/itineraryController');

// Get user's itinerary (solo only)
router.get('/', verifyToken, isSolo, itineraryController.getItinerary);

// Create itinerary if none exists (solo only)
router.post('/:id', verifyToken, isSolo, itineraryController.addItinerary);

// Replace entire itinerary (solo only)
router.put('/', verifyToken, isSolo, itineraryController.replaceItinerary);

// Update single day - upsert (solo only)
router.put('/day/:dayNumber', verifyToken, isSolo, itineraryController.updateDay);

// Clear itinerary (solo only)
router.delete('/', verifyToken, isSolo, itineraryController.clearItinerary);

module.exports = router;
