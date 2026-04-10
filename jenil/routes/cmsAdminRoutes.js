const express = require('express');
const router = express.Router();

// Controllers
const homeController = require('../controllers/Admin Controllers/homeControllerA');
const aboutAcademyController = require('../controllers/Admin Controllers/aboutAcademyControllerA');
const programsPageController = require('../controllers/Admin Controllers/programsPageControllerA');
const galleryPageController = require('../controllers/Admin Controllers/galleryPageControllerA');
const playgroundPageController = require('../controllers/Admin Controllers/playgroundPageControllerA');
const admissionsPageController = require('../controllers/Admin Controllers/admissionsPageControllerA');
const contactPageController = require('../controllers/Admin Controllers/contactPageControllerA');

// Middlewares
const { upload, standardizeFilePath } = require('../middlewares/upload');
const { optionalDecryptPayload, encryptResponse } = require('../middlewares/encryptedPayload');
const { middlewareAdmin, middlewareAdminPost } = require('../utils/ValidateAdmin');

// Apply encryption middlewares
router.use(optionalDecryptPayload);
router.use(encryptResponse);

// ==========================================
// 1. HOME PAGE ADMIN ROUTES
// ==========================================
router.get('/home/hero/:data', middlewareAdmin, homeController.getSection('hero'));
router.post('/home/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('hero'));
router.put('/home/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('hero'));
router.delete('/home/hero/delete', middlewareAdminPost, homeController.deleteSection('hero'));

router.get('/home/about/:data', middlewareAdmin, homeController.getSection('about'));
router.post('/home/about/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('about'));
router.put('/home/about/update', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('about'));
router.delete('/home/about/delete', middlewareAdminPost, homeController.deleteSection('about'));

router.get('/home/footer/:data', middlewareAdmin, homeController.getFooterData);
router.post('/home/footer/add', middlewareAdminPost, homeController.updateFooter);
router.put('/home/footer/update', middlewareAdminPost, homeController.updateFooter);

router.get('/home/programs-facilities/:data', middlewareAdmin, homeController.getSection('programsAndFacilities'));
router.post('/home/programs-facilities/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.put('/home/programs-facilities/update', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('programsAndFacilities'));
router.delete('/home/programs-facilities/delete', middlewareAdminPost, homeController.deleteSection('programsAndFacilities'));
router.post('/home/programs-facilities/features/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.addArrayItem('programsAndFacilities.facilitiesCard.features'));
router.put('/home/programs-facilities/features/:itemId', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateArrayItem('programsAndFacilities.facilitiesCard.features'));
router.delete('/home/programs-facilities/features/:itemId', middlewareAdminPost, homeController.deleteArrayItem('programsAndFacilities.facilitiesCard.features'));

router.get('/home/tournaments/:data', middlewareAdmin, homeController.getSection('tournamentsSection'));
router.post('/home/tournaments/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.put('/home/tournaments/update', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('tournamentsSection'));
router.delete('/home/tournaments/delete', middlewareAdminPost, homeController.deleteSection('tournamentsSection'));

router.get('/home/testimonials/:data', middlewareAdmin, homeController.getSection('testimonials'));
router.post('/home/testimonials/add', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.addArrayItem('testimonials.list'));
router.put('/home/testimonials/update', upload.any(), middlewareAdminPost, standardizeFilePath, homeController.updateSection('testimonials'));
router.delete('/home/testimonials/delete', middlewareAdminPost, homeController.deleteSection('testimonials'));

// ==========================================
// 2. ABOUT ACADEMY ADMIN ROUTES
// ==========================================
router.get('/about/hero/:data', middlewareAdmin, aboutAcademyController.getSection('hero'));
router.post('/about/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.put('/about/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('hero'));
router.delete('/about/hero/delete', middlewareAdminPost, aboutAcademyController.deleteSection('hero'));

router.get('/about/intro/:data', middlewareAdmin, aboutAcademyController.getSection('introSection'));
router.post('/about/intro/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.put('/about/intro/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('introSection'));
router.delete('/about/intro/delete', middlewareAdminPost, aboutAcademyController.deleteSection('introSection'));

router.get('/about/intro-mission/:data', middlewareAdmin, aboutAcademyController.getIntroMission);
router.post('/about/intro-mission/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateIntroMission);
router.put('/about/intro-mission/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateIntroMission);

router.get('/about/mission/:data', middlewareAdmin, aboutAcademyController.getSection('mission'));
router.put('/about/mission/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('mission'));

router.get('/about/directors-message/:data', middlewareAdmin, aboutAcademyController.getSection('directorsMessage'));
router.post('/about/directors-message/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));
router.put('/about/directors-message/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateSection('directorsMessage'));

router.get('/about/founders/:data', middlewareAdmin, aboutAcademyController.getSection('founders'));
router.post('/about/founders/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.addArrayItem('founders.list'));
router.put('/about/founders/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('founders'));
router.put('/about/founders/:itemId/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateArrayItem('founders.list'));
router.delete('/about/founders/:itemId/delete', middlewareAdminPost, aboutAcademyController.deleteArrayItem('founders.list'));

router.get('/about/journey/:data', middlewareAdmin, aboutAcademyController.getSection('journey'));
router.post('/about/journey/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.addArrayItem('journey.list'));
router.put('/about/journey/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('journey'));
router.put('/about/journey/:itemId/update', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateArrayItem('journey.list'));
router.delete('/about/journey/:itemId/delete', middlewareAdminPost, aboutAcademyController.deleteArrayItem('journey.list'));

router.get('/about/why-choose-us/:data', middlewareAdmin, aboutAcademyController.getSection('whyChooseUs'));
router.post('/about/why-choose-us/add', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.addArrayItem('whyChooseUs.features'));
router.put('/about/why-choose-us/update', middlewareAdminPost, upload.any(), standardizeFilePath, aboutAcademyController.updateSection('whyChooseUs'));
router.put('/about/why-choose-us/features/:itemId', upload.any(), middlewareAdminPost, standardizeFilePath, aboutAcademyController.updateArrayItem('whyChooseUs.features'));
router.delete('/about/why-choose-us/features/:itemId', middlewareAdminPost, aboutAcademyController.deleteArrayItem('whyChooseUs.features'));

// ==========================================
// 3. PROGRAMS PAGE ADMIN ROUTES
// ==========================================
router.get('/programs/hero/:data', middlewareAdmin, programsPageController.getSection('hero'));
router.post('/programs/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, programsPageController.updateSection('hero'));
router.put('/programs/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, programsPageController.updateSection('hero'));
router.delete('/programs/hero/delete', middlewareAdminPost, programsPageController.deleteSection('hero'));

router.get('/programs/levels/:data', middlewareAdmin, programsPageController.getLevels);
router.post('/programs/levels/add', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.addLevel);
router.put('/programs/levels/:levelId', middlewareAdminPost, upload.any(), standardizeFilePath, programsPageController.updateLevel);
router.delete('/programs/levels/:levelId', middlewareAdminPost, programsPageController.deleteLevel);

// ==========================================
// 4. GALLERY PAGE ADMIN ROUTES
// ==========================================
router.get('/gallery/hero/:data', middlewareAdmin, galleryPageController.getSection('hero'));
router.post('/gallery/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.updateSection('hero'));
router.put('/gallery/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.updateSection('hero'));

router.get('/gallery/categories/:data', middlewareAdmin, galleryPageController.getSection('categories'));
router.post('/gallery/categories/add', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.addArrayItem('categories'));
router.put('/gallery/categories/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('categories'));

router.get('/gallery/grid/:data', middlewareAdmin, galleryPageController.getSection('galleryGrid'));
router.post('/gallery/grid/add', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.addGalleryGridItem);
router.put('/gallery/grid/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));

router.get('/gallery/training-moments/:data', middlewareAdmin, galleryPageController.getSection('trainingMoments'));
router.post('/gallery/training-moments/add', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.addTrainingMomentImage);
router.put('/gallery/training-moments/:itemId/update', middlewareAdminPost, upload.any(), standardizeFilePath, galleryPageController.updateTrainingMomentImage);
router.delete('/gallery/training-moments/:itemId/delete', middlewareAdminPost, galleryPageController.deleteTrainingMomentImage);

router.get('/gallery/images/:data', middlewareAdmin, galleryPageController.getSection('images'));
router.post('/gallery/images/add', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.addImage);
router.put('/gallery/images/:itemId/update', upload.any(), middlewareAdminPost, standardizeFilePath, galleryPageController.updateImage);
router.delete('/gallery/images/:itemId/delete', middlewareAdminPost, galleryPageController.deleteImage);

// ==========================================
// 5. PLAYGROUND PAGE ADMIN ROUTES
// ==========================================
router.get('/playground/hero/:data', middlewareAdmin, playgroundPageController.getSection('hero'));
router.post('/playground/hero/add', upload.single('backgroundImage'), middlewareAdminPost, standardizeFilePath, playgroundPageController.updateSection('hero'));
router.put('/playground/hero/update', upload.single('backgroundImage'), middlewareAdminPost, standardizeFilePath, playgroundPageController.updateSection('hero'));

router.get('/playground/form-section/:data', middlewareAdmin, playgroundPageController.getSection('formSection'));
router.post('/playground/form-section/add', upload.single('image'), middlewareAdminPost, standardizeFilePath, playgroundPageController.updateSection('formSection'));
router.put('/playground/form-section/update', upload.single('image'), middlewareAdminPost, standardizeFilePath, playgroundPageController.updateSection('formSection'));

router.get('/playground/bookings/:data', middlewareAdmin, playgroundPageController.getAllBookings);

// ==========================================
// 6. ADMISSIONS PAGE ADMIN ROUTES
// ==========================================
router.get('/admissions/hero/:data', middlewareAdmin, admissionsPageController.getSection('hero'));
router.post('/admissions/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, admissionsPageController.updateSection('hero'));
router.put('/admissions/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, admissionsPageController.updateSection('hero'));

router.get('/admissions/form-content/:data', middlewareAdmin, admissionsPageController.getSection('formContent'));
router.post('/admissions/form-content/add', middlewareAdminPost, admissionsPageController.updateSection('formContent'));
router.put('/admissions/form-content/update', middlewareAdminPost, admissionsPageController.updateSection('formContent'));

router.get('/admissions/submissions/:data', middlewareAdmin, admissionsPageController.getAllSubmissions);
router.put('/admissions/submissions/:id/update', middlewareAdminPost, admissionsPageController.updateSubmissionStatus);
router.delete('/admissions/submissions/:id/delete', middlewareAdminPost, admissionsPageController.deleteSubmission);

// ==========================================
// 7. CONTACT PAGE ADMIN ROUTES
// ==========================================
router.get('/contact/hero/:data', middlewareAdmin, contactPageController.getSection('hero'));
router.post('/contact/hero/add', upload.any(), middlewareAdminPost, standardizeFilePath, contactPageController.updateSection('hero'));
router.put('/contact/hero/update', upload.any(), middlewareAdminPost, standardizeFilePath, contactPageController.updateSection('hero'));

router.get('/contact/details/:data', middlewareAdmin, contactPageController.getSection('contactDetails'));
router.post('/contact/details/add', upload.any(), middlewareAdminPost, standardizeFilePath, contactPageController.updateSection('contactDetails'));
router.put('/contact/details/update', upload.any(), middlewareAdminPost, standardizeFilePath, contactPageController.updateSection('contactDetails'));

router.get('/contact/submissions/:data', middlewareAdmin, contactPageController.getAllSubmissions);
router.put('/contact/submissions/:id/update', middlewareAdminPost, contactPageController.updateSubmissionStatus);
router.delete('/contact/submissions/:id/delete', middlewareAdminPost, contactPageController.deleteSubmission);

module.exports = router;
