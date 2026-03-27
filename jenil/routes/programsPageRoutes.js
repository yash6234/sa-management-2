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

// 2. LEVELS (All in one call)
router.get('/levels', programsPageController.getLevels);
router.post('/levels/add', upload.any(), standardizeFilePath, programsPageController.updateSection('levels'));
router.put('/levels/update', upload.any(), standardizeFilePath, programsPageController.updateSection('levels'));
router.delete('/levels/delete', programsPageController.deleteSection('levels'));

module.exports = router;
