const express = require('express');
const {
  getTouristById,
  getAllTourists
} = require('../controllers/touristController');
const { verifyToken } = require('../middlewares/authMiddleware');

const router = express.Router();

// A middleware 'verifyToken' is used to ensure the user is authenticated
// The specific role-based authorization can be added here or in the controller.

router.get('/me',verifyToken, getTouristById);
router.get('/',getAllTourists)

module.exports = router;