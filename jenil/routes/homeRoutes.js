const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const universalController = require('../controllers/universalController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', homeController.getHomePageData);

// 2. ADMIN SECTION-WISE ENDPOINTS 

// 1. HERO
router.get('/hero', homeController.getSection('hero'));
router.post('/hero/add', upload.any(), standardizeFilePath, homeController.updateSection('hero'));
router.put('/hero/update', upload.any(), standardizeFilePath, homeController.updateSection('hero'));
router.delete('/hero/delete', homeController.deleteSection('hero'));

// 2. ABOUT
router.get('/about', homeController.getSection('about'));
router.post('/about/add', upload.any(), standardizeFilePath, homeController.updateSection('about'));
router.put('/about/update', upload.any(), standardizeFilePath, homeController.updateSection('about'));
router.delete('/about/delete', homeController.deleteSection('about'));

// 3. FOOTER
router.get('/footer', homeController.getFooterData);
router.post('/footer/add', homeController.updateFooter);
router.put('/footer/update', homeController.updateFooter);
router.delete('/footer/delete', async (req, res) => {
    try {
        const Footer = require('../models/Footer');
        await Footer.deleteOne({ isActive: true });
        res.status(200).json({ success: true, message: 'Footer reset' });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// 4. PROGRAMS & FACILITIES
router.get('/programs-facilities', homeController.getSection('programsAndFacilities'));
router.post('/programs-facilities/add', upload.any(), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.put('/programs-facilities/update', upload.any(), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.delete('/programs-facilities/delete', homeController.deleteSection('programsAndFacilities'));

// 5. TOURNAMENTS
router.get('/tournaments', homeController.getSection('tournamentsSection'));
router.post('/tournaments/add', upload.any(), standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.put('/tournaments/update', upload.any(), standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.delete('/tournaments/delete', homeController.deleteSection('tournamentsSection'));
router.delete('/tournaments/social/:postKey', homeController.deleteSocialPost);


// 8. TESTIMONIALS
router.get('/testimonials', homeController.getSection('testimonials'));
router.post('/testimonials/add', upload.any(), standardizeFilePath, homeController.addArrayItem('testimonials.list'));
router.put('/testimonials/update', upload.any(), standardizeFilePath, homeController.updateSection('testimonials'));
router.delete('/testimonials/delete', homeController.deleteSection('testimonials'));

// 4. UNIVERSAL CRUD ENDPOINTS 
router.post('/u/:modelName', universalController.create);
router.get('/u/:modelName', universalController.getAll);
router.get('/u/:modelName/:id', universalController.getById);
router.put('/u/:modelName/:id', universalController.update);
router.delete('/u/:modelName/:id', universalController.delete);


module.exports = router;
