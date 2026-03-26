const express = require('express');
const router = express.Router();
const dynamicController = require('../controllers/dynamicController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// Most basic catch-all that avoids the path-to-regexp v8.0 parser issues entirely
router.use(upload.single('image'));
router.use(standardizeFilePath);
router.use(dynamicController.dispatchedHandler);

module.exports = router;
