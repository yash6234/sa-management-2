const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const universalController = require('../controllers/universalController');
const { serveImage } = require('../controllers/imageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', homeController.getHomePageData);

// 2. ADMIN SECTION-WISE ENDPOINTS 

// 1. HERO
router.get('/hero', homeController.getSection('hero'));
router.post('/hero/add', upload.single('backgroundImage'), standardizeFilePath, homeController.updateSection('hero'));
router.put('/hero/update', upload.single('backgroundImage'), standardizeFilePath, homeController.updateSection('hero'));
router.delete('/hero/delete', homeController.deleteSection('hero'));

// 2. ABOUT
router.get('/about', homeController.getSection('about'));
router.post('/about/add', upload.single('image'), standardizeFilePath, homeController.updateSection('about'));
router.put('/about/update', upload.single('image'), standardizeFilePath, homeController.updateSection('about'));
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
router.post('/programs-facilities/add', upload.single('image'), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.put('/programs-facilities/update', upload.single('image'), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.delete('/programs-facilities/delete', homeController.deleteSection('programsAndFacilities'));

// 5. TOURNAMENTS
router.get('/tournaments', homeController.getSection('tournamentsSection'));
router.post('/tournaments/add', upload.single('image'), standardizeFilePath, homeController.addArrayItem('tournamentsSection.list'));
router.put('/tournaments/update', upload.single('image'), standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.delete('/tournaments/delete', homeController.deleteSection('tournamentsSection'));
router.put('/tournaments/:itemId/update', upload.single('image'), standardizeFilePath, homeController.updateArrayItem('tournamentsSection.list'));
router.delete('/tournaments/:itemId/delete', homeController.deleteArrayItem('tournamentsSection.list'));

// 6. SOCIAL FEED
router.get('/social', homeController.getSection('socialSection'));
router.post('/social/add', upload.single('image'), standardizeFilePath, homeController.addArrayItem('socialSection.posts'));
router.put('/social/update', upload.single('image'), standardizeFilePath, homeController.updateSection('socialSection'));
router.delete('/social/delete', homeController.deleteSection('socialSection'));
router.put('/social/:itemId/update', upload.single('image'), standardizeFilePath, homeController.updateArrayItem('socialSection.posts'));
router.delete('/social/:itemId/delete', homeController.deleteArrayItem('socialSection.posts'));

// 7. GALLERY
router.get('/gallery', homeController.getSection('gallery'));
router.post('/gallery/add', upload.single('image'), standardizeFilePath, homeController.addArrayItem('gallery'));
router.delete('/gallery/:itemId/delete', homeController.deleteArrayItem('gallery'));

// 8. TESTIMONIALS
router.get('/testimonials', homeController.getSection('testimonials'));
router.post('/testimonials/add', upload.single('image'), standardizeFilePath, homeController.addArrayItem('testimonials.list'));
router.put('/testimonials/update', upload.single('image'), standardizeFilePath, homeController.updateSection('testimonials'));
router.put('/testimonials/:itemId/update', upload.single('image'), standardizeFilePath, homeController.updateArrayItem('testimonials.list'));
router.delete('/testimonials/:itemId/delete', homeController.deleteArrayItem('testimonials.list'));

// 3. IMAGE PROXY ENDPOINT
router.get('/:token', serveImage);

// 4. UNIVERSAL CRUD ENDPOINTS 
router.post('/u/:modelName', universalController.create);
router.get('/u/:modelName', universalController.getAll);
router.get('/u/:modelName/:id', universalController.getById);
router.put('/u/:modelName/:id', universalController.update);
router.delete('/u/:modelName/:id', universalController.delete);

module.exports = router;
