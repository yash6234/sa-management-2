const express = require('express');
const router = express.Router();
const playgroundPageController = require('../controllers/playgroundPageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', playgroundPageController.getPlaygroundData);

// 2. USER SUBMISSION (Requested: ONLY POST to get response)
router.post('/submit', playgroundPageController.submitBooking);

// 3. ADMIN SECTION-WISE ENDPOINTS 
// --- HERO ---
router.get('/hero', playgroundPageController.getSection('hero'));
router.post('/hero/add', upload.single('backgroundImage'), standardizeFilePath, playgroundPageController.updateSection('hero'));
router.put('/hero/update', upload.single('backgroundImage'), standardizeFilePath, playgroundPageController.updateSection('hero'));
router.delete('/hero/delete', playgroundPageController.deleteSection('hero'));

// --- FORM SECTION (Unified Presentation + Config) ---
router.get('/form-section', playgroundPageController.getSection('formSection'));
router.post('/form-section/add', upload.single('image'), standardizeFilePath, playgroundPageController.updateSection('formSection'));
router.put('/form-section/update', upload.single('image'), standardizeFilePath, playgroundPageController.updateSection('formSection'));
router.delete('/form-section/delete', playgroundPageController.deleteSection('formSection'));

// --- CONFIG-SPECIFIC (Deep nested access if needed specifically) ---
router.get('/config', playgroundPageController.getSection('formSection.config'));
router.put('/config/update', playgroundPageController.updateSection('formSection.config'));

// --- ADMIN BOOKING MANAGEMENT ---
router.get('/bookings', playgroundPageController.getAllBookings);


module.exports = router;
