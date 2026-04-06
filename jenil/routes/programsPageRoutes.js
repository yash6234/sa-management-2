const express = require('express');
const router = express.Router();
const programsPageController = require('../controllers/programsPageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT
router.get('/', programsPageController.getProgramsData);

// 2. ADMIN SECTION-WISE ENDPOINTS

// 1. HERO
router.get('/hero', programsPageController.getSection('hero'));
router.post('/hero/add', upload.any(), standardizeFilePath, programsPageController.updateSection('hero'));
router.put('/hero/update', upload.any(), standardizeFilePath, programsPageController.updateSection('hero'));
router.delete('/hero/delete', programsPageController.deleteSection('hero'));

// 2. LEVELS (Array-based with IDs)
router.get('/levels', programsPageController.getLevels);
router.get('/levels/:levelId', programsPageController.getLevelById);
router.post('/levels/add', upload.any(), standardizeFilePath, programsPageController.addLevel);
router.put('/levels/:levelId', upload.any(), standardizeFilePath, programsPageController.updateLevel);
router.delete('/levels/:levelId', programsPageController.deleteLevel);

// 3. LEVEL FEATURES (Nested array with IDs)
router.post('/levels/:levelId/features/add', programsPageController.addFeature);
router.put('/levels/:levelId/features/:featureId', programsPageController.updateFeature);
router.delete('/levels/:levelId/features/:featureId', programsPageController.deleteFeature);

module.exports = router;
