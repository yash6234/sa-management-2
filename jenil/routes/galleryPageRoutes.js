const express = require('express');
const router = express.Router();
const galleryPageController = require('../controllers/galleryPageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

// 1. PUBLIC AGGREGATED ENDPOINT 
router.get('/', galleryPageController.getGalleryData);

// 2. ADMIN SECTION-WISE ENDPOINTS 

// 1. HERO
router.get('/hero', galleryPageController.getSection('hero'));
router.post('/hero/add', upload.any(), standardizeFilePath, galleryPageController.updateSection('hero'));
router.put('/hero/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('hero'));
router.delete('/hero/delete', galleryPageController.deleteSection('hero'));

// 2. CATEGORIES
router.get('/categories', galleryPageController.getSection('categories'));
router.post('/categories/add', upload.any(), standardizeFilePath, galleryPageController.addArrayItem('categories'));
router.put('/categories/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('categories'));
router.delete('/categories/delete', galleryPageController.deleteSection('categories'));

// 2b. GALLERY GRID (Categories + Images in one section)
router.get('/gallery-grid', galleryPageController.getSection('galleryGrid'));
router.post('/gallery-grid/add', upload.any(), standardizeFilePath, galleryPageController.addGalleryGridItem);
router.post('/gallery-grid/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));
router.put('/gallery-grid/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));
router.delete('/gallery-grid/delete', galleryPageController.deleteSection('galleryGrid'));

// Aliases (frontend-friendly)
router.get('/grid', galleryPageController.getSection('galleryGrid'));
router.post('/grid/add', upload.any(), standardizeFilePath, galleryPageController.addGalleryGridItem);
router.post('/grid/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));
router.put('/grid/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('galleryGrid'));
router.delete('/grid/delete', galleryPageController.deleteSection('galleryGrid'));

// 3. TRAINING MOMENTS
router.get('/training-moments', galleryPageController.getSection('trainingMoments'));
router.post('/training-moments/add', upload.any(), standardizeFilePath, galleryPageController.addTrainingMomentImage);
router.put('/training-moments/update', upload.any(), standardizeFilePath, galleryPageController.updateSection('trainingMoments'));
router.delete('/training-moments/delete', galleryPageController.deleteSection('trainingMoments'));
router.put('/training-moments/:itemId/update', upload.any(), standardizeFilePath, galleryPageController.updateTrainingMomentImage);
router.delete('/training-moments/:itemId/delete', galleryPageController.deleteTrainingMomentImage);

// 4. IMAGES (Masonry Grid)
router.get('/images', galleryPageController.getSection('images'));
router.post('/images/add', upload.any(), standardizeFilePath, galleryPageController.addImage);
router.put('/images/:itemId/update', upload.any(), standardizeFilePath, galleryPageController.updateImage);
router.delete('/images/:itemId/delete', galleryPageController.deleteImage);


module.exports = router;
