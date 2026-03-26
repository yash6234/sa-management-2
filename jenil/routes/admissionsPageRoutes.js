const express = require('express');
const router = express.Router();
const admissionsPageController = require('../controllers/admissionsPageController');
const { serveImage } = require('../controllers/imageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', admissionsPageController.getAdmissionsData);

// 2. ADMISSION ENQUIRY SUBMISSION (With field names for file uploads)
router.post('/submit', upload.any(), standardizeFilePath, admissionsPageController.submitAdmissionEnquiry);

// 3. ADMIN CONFIG SECTIONS (Standardized pattern)
// --- HERO ---
router.get('/hero', admissionsPageController.getSection('hero'));
router.post('/hero/add', upload.any(), standardizeFilePath, admissionsPageController.updateSection('hero'));
router.put('/hero/update', upload.any(), standardizeFilePath, admissionsPageController.updateSection('hero'));
router.delete('/hero/delete', admissionsPageController.deleteSection('hero'));

// --- FORM CONTENT ---
router.get('/form-content', admissionsPageController.getSection('formContent'));
router.post('/form-content/add', admissionsPageController.updateSection('formContent'));
router.put('/form-content/update', admissionsPageController.updateSection('formContent'));
router.delete('/form-content/delete', admissionsPageController.deleteSection('formContent'));

// --- INFO SECTION (What to Expect & Requirements) ---
router.get('/info-section', admissionsPageController.getSection('infoSection'));
router.post('/info-section/add', admissionsPageController.updateSection('infoSection'));
router.put('/info-section/update', admissionsPageController.updateSection('infoSection'));
router.delete('/info-section/delete', admissionsPageController.deleteSection('infoSection'));

// --- CONFIG ---
router.get('/config', admissionsPageController.getSection('config'));
router.post('/config/add', admissionsPageController.updateSection('config'));
router.put('/config/update', admissionsPageController.updateSection('config'));
router.delete('/config/delete', admissionsPageController.deleteSection('config'));

// 4. ADMIN SUBMISSION MANAGEMENT
router.get('/submissions', admissionsPageController.getAllSubmissions);
router.put('/submissions/:id/update', admissionsPageController.updateSubmissionStatus);
router.delete('/submissions/:id/delete', admissionsPageController.deleteSubmission);

// 5. IMAGE PROXY ENDPOINT
router.get('/:token', serveImage);

module.exports = router;
