const express = require('express');
const { serveImage } = require('../controllers/imageController');
const router = express.Router();

router.get(/.*/, serveImage);

module.exports = router;
