const express = require('express');
const {
    registerTourist,
    loginTourist,
    loginWithCodes,
    generateTouristQR,
    scanTouristQR,
} = require('../controllers/authController');
const { verifyTouristRecord } = require('../controllers/verifyController');
const { authorityRegister,authorityLogin,authorityVerify,authorityLogOut } = require('../controllers/authority/authPage')

const router = express.Router();

// strict — blockchain write
router.post('/register', registerTourist);
router.post("/signup",authorityRegister);

// strict — auth routes
router.post("/login", loginTourist);
router.post("/login-with-codes", loginWithCodes);
router.post("/login-authority", authorityLogin)
const { loginEmergencyVehicle } = require('../controllers/authController');
router.post('/login-emergency', loginEmergencyVehicle);

const { verifyToken } = require('../middlewares/authMiddleware');

// relaxed — general routes
router.get('/verify/:touristId', verifyTouristRecord);
router.get('/qr/:touristId', generateTouristQR);
router.get('/qr/scan/:token', scanTouristQR);
router.get('/me', verifyToken, authorityVerify);


router.post('/logout',authorityLogOut);

module.exports = router;