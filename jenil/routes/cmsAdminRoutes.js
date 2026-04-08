const express = require('express');
const router = express.Router();

// Controllers
const homeController = require('../controllers/homeController');
const aboutAcademyController = require('../controllers/aboutAcademyController');
const programsPageController = require('../controllers/programsPageController');
const galleryPageController = require('../controllers/galleryPageController');
const playgroundPageController = require('../controllers/playgroundPageController');
const admissionsPageController = require('../controllers/admissionsPageController');
const contactPageController = require('../controllers/contactPageController');

// Middlewares
const { upload, standardizeFilePath } = require('../middlewares/upload');
const { optionalDecryptPayload, encryptResponse } = require('../middlewares/encryptedPayload');
const { middlewareAdmin, middlewareAdminPost } = require('../../middlewares/adminValidation');

// Apply encryption middlewares
router.use(optionalDecryptPayload);
router.use(encryptResponse);

// ==========================================
// 1. HOME PAGE ADMIN ROUTES
// ==========================================
router.get('/home/hero', middlewareAdmin, homeController.getSection('hero'));
router.post('/home/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('hero'));
router.put('/home/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('hero'));
router.delete('/home/hero/delete', middlewareAdminPost, homeController.deleteSection('hero'));

router.get('/home/about', middlewareAdmin, homeController.getSection('about'));
router.post('/home/about/add', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('about'));
router.put('/home/about/update', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('about'));
router.delete('/home/about/delete', middlewareAdminPost, homeController.deleteSection('about'));

router.get('/home/footer', middlewareAdmin, homeController.getFooterData);
router.post('/home/footer/add', middlewareAdminPost, homeController.updateFooter);
router.put('/home/footer/update', middlewareAdminPost, homeController.updateFooter);

router.get('/home/programs-facilities', middlewareAdmin, homeController.getSection('programsAndFacilities'));
router.post('/home/programs-facilities/add', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.put('/home/programs-facilities/update', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.delete('/home/programs-facilities/delete', middlewareAdminPost, homeController.deleteSection('programsAndFacilities'));

router.get('/home/tournaments', middlewareAdmin, homeController.getSection('tournamentsSection'));
router.post('/home/tournaments/add', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.put('/home/tournaments/update', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.delete('/home/tournaments/delete', middlewareAdminPost, homeController.deleteSection('tournamentsSection'));

router.get('/home/testimonials', middlewareAdmin, homeController.getSection('testimonials'));
router.post('/home/testimonials/add', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.addArrayItem('testimonials.list'));
router.put('/home/testimonials/update', middlewareAdminPost, upload.any(), standardizeFilePath, homeController.updateSection('testimonials'));
router.delete('/home/testimonials/delete', middlewareAdminPost, homeController.deleteSection('testimonials'));

// ==========================================
// 2. ABOUT ACADEMY ADMIN ROUTES
// ==========================================
router.get('/about/hero', middlewareAdmin, aboutAcademyController.getSection('hero'));
router.post('/about/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.put('/about/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.delete('/about/hero/delete', middlewareAdminPost, aboutAcademyController.deleteSection('hero'));

router.get('/about/intro', middlewareAdmin, aboutAcademyController.getSection('introSection'));
router.post('/about/intro/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.put('/about/intro/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.delete('/about/intro/delete', middlewareAdminPost, aboutAcademyController.deleteSection('introSection'));

router.get('/about/intro-mission', middlewareAdmin, aboutAcademyController.getIntroMission);
router.post('/about/intro-mission/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateIntroMission);
router.put('/about/intro-mission/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateIntroMission);

router.get('/about/mission', middlewareAdmin, aboutAcademyController.getSection('mission'));
router.put('/about/mission/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('mission'));

router.get('/about/directors-message', middlewareAdmin, aboutAcademyController.getSection('directorsMessage'));
router.post('/about/directors-message/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));
router.put('/about/directors-message/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));

router.get('/about/founders', middlewareAdmin, aboutAcademyController.getSection('founders'));
router.post('/about/founders/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('founders.list'));
router.put('/about/founders/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('founders'));
router.put('/about/founders/:itemId/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('founders.list'));
router.delete('/about/founders/:itemId/delete', middlewareAdminPost, aboutAcademyController.deleteArrayItem('founders.list'));

router.get('/about/journey', middlewareAdmin, aboutAcademyController.getSection('journey'));
router.post('/about/journey/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('journey.list'));
router.put('/about/journey/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('journey'));
router.put('/about/journey/:itemId/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('journey.list'));
router.delete('/about/journey/:itemId/delete', middlewareAdminPost, aboutAcademyController.deleteArrayItem('journey.list'));

router.get('/about/why-choose-us', middlewareAdmin, aboutAcademyController.getSection('whyChooseUs'));
router.post('/about/why-choose-us/add', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.addArrayItem('whyChooseUs.features'));
router.put('/about/why-choose-us/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('whyChooseUs'));
router.put('/about/why-choose-us/features/:itemId', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateArrayItem('whyChooseUs.features'));
router.delete('/about/why-choose-us/features/:itemId', middlewareAdminPost, aboutAcademyController.deleteArrayItem('whyChooseUs.features'));

// ==========================================
// 3. PROGRAMS PAGE ADMIN ROUTES
// ==========================================
router.get('/programs/hero', middlewareAdmin, programsPageController.getSection('hero'));
router.post('/programs/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.updateSection('hero'));
router.put('/programs/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.updateSection('hero'));
router.delete('/programs/hero/delete', middlewareAdminPost, programsPageController.deleteSection('hero'));

router.get('/programs/levels', middlewareAdmin, programsPageController.getLevels);
router.post('/programs/levels/add', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.addLevel);
router.put('/programs/levels/:levelId', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.updateLevel);
router.delete('/programs/levels/:levelId', middlewareAdminPost, programsPageController.deleteLevel);

// ==========================================
// 4. GALLERY PAGE ADMIN ROUTES
// ==========================================
router.get('/gallery/hero', middlewareAdmin, galleryPageController.getSection('hero'));
router.post('/gallery/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('hero'));
router.put('/gallery/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('hero'));

router.get('/gallery/categories', middlewareAdmin, galleryPageController.getSection('categories'));
router.post('/gallery/categories/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.addArrayItem('categories'));
router.put('/gallery/categories/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('categories'));

router.get('/gallery/grid', middlewareAdmin, galleryPageController.getSection('galleryGrid'));
router.post('/gallery/grid/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.addGalleryGridItem);
router.put('/gallery/grid/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));

router.get('/gallery/training-moments', middlewareAdmin, galleryPageController.getSection('trainingMoments'));
router.post('/gallery/training-moments/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.addTrainingMomentImage);
router.put('/gallery/training-moments/:itemId/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateTrainingMomentImage);
router.delete('/gallery/training-moments/:itemId/delete', middlewareAdminPost, galleryPageController.deleteTrainingMomentImage);

router.get('/gallery/images', middlewareAdmin, galleryPageController.getSection('images'));
router.post('/gallery/images/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.addImage);
router.put('/gallery/images/:itemId/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateImage);
router.delete('/gallery/images/:itemId/delete', middlewareAdminPost, galleryPageController.deleteImage);

// ==========================================
// 5. PLAYGROUND PAGE ADMIN ROUTES
// ==========================================
router.get('/playground/hero', middlewareAdmin, playgroundPageController.getSection('hero'));
router.post('/playground/hero/add', middlewareAdminPost, upload.single('backgroundImage'), standardizeFilePath, playgroundPageController.updateSection('hero'));
router.put('/playground/hero/update', middlewareAdminPost, upload.single('backgroundImage'), standardizeFilePath, playgroundPageController.updateSection('hero'));

router.get('/playground/form-section', middlewareAdmin, playgroundPageController.getSection('formSection'));
router.post('/playground/form-section/add', middlewareAdminPost, upload.single('image'), standardizeFilePath, playgroundPageController.updateSection('formSection'));
router.put('/playground/form-section/update', middlewareAdminPost, upload.single('image'), standardizeFilePath, playgroundPageController.updateSection('formSection'));

router.get('/playground/bookings', middlewareAdmin, playgroundPageController.getAllBookings);

// ==========================================
// 6. ADMISSIONS PAGE ADMIN ROUTES
// ==========================================
router.get('/admissions/hero', middlewareAdmin, admissionsPageController.getSection('hero'));
router.post('/admissions/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, admissionsPageController.updateSection('hero'));
router.put('/admissions/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, admissionsPageController.updateSection('hero'));

router.get('/admissions/form-content', middlewareAdmin, admissionsPageController.getSection('formContent'));
router.post('/admissions/form-content/add', middlewareAdminPost, admissionsPageController.updateSection('formContent'));
router.put('/admissions/form-content/update', middlewareAdminPost, admissionsPageController.updateSection('formContent'));

router.get('/admissions/submissions', middlewareAdmin, admissionsPageController.getAllSubmissions);
router.put('/admissions/submissions/:id/update', middlewareAdminPost, admissionsPageController.updateSubmissionStatus);
router.delete('/admissions/submissions/:id/delete', middlewareAdminPost, admissionsPageController.deleteSubmission);

// ==========================================
// 7. CONTACT PAGE ADMIN ROUTES
// ==========================================
router.get('/contact/hero', middlewareAdmin, contactPageController.getSection('hero'));
router.post('/contact/hero/add', middlewareAdminPost, upload.any(), standardizeFilePath, contactPageController.updateSection('hero'));
router.put('/contact/hero/update', middlewareAdminPost, upload.any(), standardizeFilePath, contactPageController.updateSection('hero'));

router.get('/contact/details', middlewareAdmin, contactPageController.getSection('contactDetails'));
router.post('/contact/details/add', middlewareAdminPost, upload.any(), standardizeFilePath, contactPageController.updateSection('contactDetails'));
router.put('/contact/details/update', middlewareAdminPost, upload.any(), standardizeFilePath, contactPageController.updateSection('contactDetails'));

router.get('/contact/submissions', middlewareAdmin, contactPageController.getAllSubmissions);
router.put('/contact/submissions/:id/update', middlewareAdminPost, contactPageController.updateSubmissionStatus);
router.delete('/contact/submissions/:id/delete', middlewareAdminPost, contactPageController.deleteSubmission);

module.exports = router;
