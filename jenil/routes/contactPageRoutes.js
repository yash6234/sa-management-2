const express = require('express');
const router = express.Router();
const contactPageController = require('../controllers/contactPageController');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', contactPageController.getContactData);

// 2. CONTACT MESSAGE SUBMISSION (User Response)
router.post('/submit', contactPageController.submitContactMessage);

// 3. ADMIN SECTION MANAGEMENT (Standardized pattern)
// --- HERO ---
router.get('/hero', contactPageController.getSection('hero'));
router.post('/hero/add', contactPageController.updateSection('hero'));
router.put('/hero/update', contactPageController.updateSection('hero'));
router.delete('/hero/delete', contactPageController.deleteSection('hero'));

// --- CONTACT DETAILS ---
router.get('/details', contactPageController.getSection('contactDetails'));
router.post('/details/add', contactPageController.updateSection('contactDetails'));
router.put('/details/update', contactPageController.updateSection('contactDetails'));
router.delete('/details/delete', contactPageController.deleteSection('contactDetails'));

// --- FORM CONTENT (Title & Description of the form) ---
router.get('/form-content', contactPageController.getSection('formContent'));
router.post('/form-content/add', contactPageController.updateSection('formContent'));
router.put('/form-content/update', contactPageController.updateSection('formContent'));
router.delete('/form-content/delete', contactPageController.deleteSection('formContent'));

// --- CONTACT MAP ---
router.get('/map', contactPageController.getSection('mapIframe'));
router.post('/map/add', contactPageController.updateSection('mapIframe'));
router.put('/map/update', contactPageController.updateSection('mapIframe'));
router.delete('/map/delete', contactPageController.deleteSection('mapIframe'));

// 4. ADMIN SUBMISSION MANAGEMENT
router.get('/submissions', contactPageController.getAllSubmissions);
router.put('/submissions/:id/update', contactPageController.updateSubmissionStatus);
router.delete('/submissions/:id/delete', contactPageController.deleteSubmission);


module.exports = router;
