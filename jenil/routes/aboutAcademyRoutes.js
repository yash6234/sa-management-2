const express = require('express');
const router = express.Router();
const aboutAcademyController = require('../controllers/aboutAcademyController');
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

// 2b. INTRO + MISSION (Merged)
router.get('/intro-mission', aboutAcademyController.getIntroMission);
router.post('/intro-mission/add', upload.any(), standardizeFilePath, aboutAcademyController.updateIntroMission);
router.put('/intro-mission/update', upload.any(), standardizeFilePath, aboutAcademyController.updateIntroMission);
router.delete('/intro-mission/delete', aboutAcademyController.deleteIntroMission);

// 3. MISSION
router.get('/mission', aboutAcademyController.getSection('mission'));
router.put('/mission/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('mission'));
router.delete('/mission/delete', aboutAcademyController.deleteSection('mission'));

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
router.post('/journey/add', upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('journey.list'));
router.put('/journey/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('journey'));
router.delete('/journey/delete', aboutAcademyController.deleteSection('journey'));
router.put('/journey/:itemId/update', upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('journey.list'));
router.delete('/journey/:itemId/delete', aboutAcademyController.deleteArrayItem('journey.list'));

// 7. WHY CHOOSE US
router.get('/why-choose-us', aboutAcademyController.getSection('whyChooseUs'));
router.post('/why-choose-us/add', upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('whyChooseUs.features'));
router.put('/why-choose-us/update', upload.any(), standardizeFilePath, aboutAcademyController.updateSection('whyChooseUs'));
router.delete('/why-choose-us/delete', aboutAcademyController.deleteSection('whyChooseUs'));
router.delete('/why-choose-us/:index/delete', async (req, res) => {
    try {
        const AboutAcademy = require('../models/AboutAcademy');
        let about = await AboutAcademy.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!about) about = await AboutAcademy.create({ isActive: true });
        about.whyChooseUs.features.splice(req.params.index, 1);
        await about.save();
        res.status(200).json({ success: true, data: about.whyChooseUs.features });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


module.exports = router;
