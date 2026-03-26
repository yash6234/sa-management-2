const express = require('express');
const router = express.Router();
const programsPageController = require('../controllers/programsPageController');
const { serveImage } = require('../controllers/imageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', programsPageController.getProgramsData);

// 2. ADMIN SECTION-WISE ENDPOINTS 

// 1. HERO
router.get('/hero', programsPageController.getSection('hero'));
router.post('/hero/add', upload.single('backgroundImage'), standardizeFilePath, programsPageController.updateSection('hero'));
router.put('/hero/update', upload.single('backgroundImage'), standardizeFilePath, programsPageController.updateSection('hero'));
router.delete('/hero/delete', programsPageController.deleteSection('hero'));

// 2. LEVELS
// Beginner
router.get('/beginner', programsPageController.getSection('levels.beginner'));
router.post('/beginner/add', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.beginner'));
router.put('/beginner/update', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.beginner'));
router.delete('/beginner/delete', programsPageController.deleteSection('levels.beginner'));

// Intermediate
router.get('/intermediate', programsPageController.getSection('levels.intermediate'));
router.post('/intermediate/add', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.intermediate'));
router.put('/intermediate/update', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.intermediate'));
router.delete('/intermediate/delete', programsPageController.deleteSection('levels.intermediate'));

// Advanced
router.get('/advanced', programsPageController.getSection('levels.advanced'));
router.post('/advanced/add', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.advanced'));
router.put('/advanced/update', upload.single('image'), standardizeFilePath, programsPageController.updateSection('levels.advanced'));
router.delete('/advanced/delete', programsPageController.deleteSection('levels.advanced'));

// 3. SUMMER CAMPS / SPECIAL PROGRAMS
router.get('/summer-camp', programsPageController.getSection('specialPrograms'));
router.post('/summer-camp/add', upload.single('image'), standardizeFilePath, programsPageController.addArrayItem('specialPrograms.list'));
router.put('/summer-camp/update', upload.single('image'), standardizeFilePath, programsPageController.updateSection('specialPrograms'));
router.put('/summer-camp/:itemId/update', upload.single('image'), standardizeFilePath, programsPageController.updateArrayItem('specialPrograms.list'));
router.delete('/summer-camp/:itemId/delete', programsPageController.deleteArrayItem('specialPrograms.list'));

// 3. IMAGE PROXY ENDPOINT
router.get('/:token', serveImage);

module.exports = router;
