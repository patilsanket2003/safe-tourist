const express = require('express');
const router = express.Router();
const daminiController = require('../controllers/daminiController');

router.post('/', daminiController.processChat);

module.exports = router;
