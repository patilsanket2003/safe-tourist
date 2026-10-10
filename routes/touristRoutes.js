const express = require('express');
const {
  getTouristById,
  updateTouristProfile,
  getAllTourists
} = require('../controllers/touristController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// A middleware 'verifyToken' is used to ensure the user is authenticated
router.get('/me', verifyToken, getTouristById);
router.patch('/me', verifyToken, updateTouristProfile);
router.put('/me', verifyToken, updateTouristProfile);
router.get('/', getAllTourists);

module.exports = router;