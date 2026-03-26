const express = require('express');
const router = express.Router();
const aboutAcademyController = require('../controllers/aboutAcademyController');
const { serveImage } = require('../controllers/imageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', aboutAcademyController.getAboutData);

// 2. ADMIN SECTION-WISE ENDPOINTS 

// 1. HERO
router.get('/hero', aboutAcademyController.getSection('hero'));
router.post('/hero/add', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.put('/hero/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.delete('/hero/delete', aboutAcademyController.deleteSection('hero'));

// 2. INTRO
router.get('/intro', aboutAcademyController.getSection('introSection'));
router.post('/intro/add', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.put('/intro/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.delete('/intro/delete', aboutAcademyController.deleteSection('introSection'));

// 3. MISSION
router.get('/mission', aboutAcademyController.getSection('mission'));
router.post('/mission/add', upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('mission.items'));
router.put('/mission/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('mission'));
router.delete('/mission/delete', aboutAcademyController.deleteSection('mission'));
router.put('/mission/:itemId/update', upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('mission.items'));
router.delete('/mission/:itemId/delete', aboutAcademyController.deleteArrayItem('mission.items'));

// 4. DIRECTOR'S MESSAGE
router.get('/directors-message', aboutAcademyController.getSection('directorsMessage'));
router.post('/directors-message/add', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));
router.put('/directors-message/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));
router.delete('/directors-message/delete', aboutAcademyController.deleteSection('directorsMessage'));

// 5. FOUNDERS
router.get('/founders', aboutAcademyController.getSection('founders'));
router.post('/founders/add', upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('founders.list'));
router.put('/founders/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('founders'));
router.delete('/founders/delete', aboutAcademyController.deleteSection('founders'));
router.put('/founders/:itemId/update', upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('founders.list'));
router.delete('/founders/:itemId/delete', aboutAcademyController.deleteArrayItem('founders.list'));

// 6. JOURNEY
router.get('/journey', aboutAcademyController.getSection('journey'));
router.post('/journey/add', aboutAcademyController.addArrayItem('journey.list'));
router.put('/journey/update', aboutAcademyController.updateSection('journey'));
router.delete('/journey/delete', aboutAcademyController.deleteSection('journey'));
router.put('/journey/:itemId/update', aboutAcademyController.updateArrayItem('journey.list'));
router.delete('/journey/:itemId/delete', aboutAcademyController.deleteArrayItem('journey.list'));

// 7. VALUES
router.get('/values', aboutAcademyController.getSection('values'));
router.post('/values/add', aboutAcademyController.addArrayItem('values.list'));
router.put('/values/update', aboutAcademyController.updateSection('values'));
router.delete('/values/delete', aboutAcademyController.deleteSection('values'));
router.put('/values/:itemId/update', aboutAcademyController.updateArrayItem('values.list'));
router.delete('/values/:itemId/delete', aboutAcademyController.deleteArrayItem('values.list'));

// 8. WHY CHOOSE US
router.get('/why-choose-us', aboutAcademyController.getSection('whyChooseUs'));
router.post('/why-choose-us/add', aboutAcademyController.addArrayItem('whyChooseUs.features'));
router.put('/why-choose-us/update', aboutAcademyController.updateSection('whyChooseUs'));
router.delete('/why-choose-us/delete', aboutAcademyController.deleteSection('whyChooseUs'));
router.delete('/why-choose-us/:index/delete', async (req, res) => {
    try {
        const AboutAcademy = require('../models/AboutAcademy');
        const about = await AboutAcademy.findOne({ isActive: true });
        about.whyChooseUs.features.splice(req.params.index, 1);
        await about.save();
        res.status(200).json({ success: true, data: about.whyChooseUs.features });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 3. IMAGE PROXY ENDPOINT
router.get('/:token', serveImage);

module.exports = router;
