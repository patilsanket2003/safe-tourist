const express = require('express');
const {triggerSOS } = require('../controllers/SOSalertController');
const { verifyToken } = require('../middlewares/authMiddleware');
// const { arcjetSosMiddleware } = require('../middlewares/ArcjetMiddleware');

const router  = express.Router();

router.use(verifyToken);

router.post('/trigger',triggerSOS);

module.exports = router;