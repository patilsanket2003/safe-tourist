const express = require('express');
const router = express.Router();
const exploreController = require('../controllers/exploreController');

// 1. Categories
router.get('/categories', exploreController.getCategories);

// 2. States
router.get('/states', exploreController.getStates);
router.get('/states/:stateId/cities', exploreController.getCitiesByState);

// 3. Category Cities
router.get('/categories/:categoryId/cities', exploreController.getCitiesByCategory);

// 4. City Details & Places
router.get('/cities/:cityId', exploreController.getCityDetails);
router.get('/cities/:cityId/places', exploreController.getPlacesByCity);
router.post('/cities/:cityId/sync-live', exploreController.syncCityLiveAttractions);

// 5. Place Details
router.get('/places/:placeId', exploreController.getPlaceDetails);

// 6. Nearby & Search
router.get('/nearby', exploreController.getNearbyPlaces);
router.get('/search', exploreController.searchExplore);

module.exports = router;
