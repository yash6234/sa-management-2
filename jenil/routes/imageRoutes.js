const express = require('express');
const { serveImage } = require('../controllers/imageController');
const router = express.Router();

router.get('/:token', serveImage);

module.exports = router;
