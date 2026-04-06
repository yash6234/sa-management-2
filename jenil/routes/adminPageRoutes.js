const express = require('express');
const router = express.Router();
const adminPageController = require('../controllers/adminPageController');

/**
 * @route   GET /acade360/admin/sections/:data
 * @desc    Get list of all available pages in the CMS
 * @access  Admin only (requires encrypted data in :data)
 */
router.get('/list/:data', adminPageController.getAvailablePages);

/**
 * @route   GET /acade360/admin/sections/view/:data
 * @desc    Get all data for a specific page section-wise
 * @access  Admin only (requires encrypted data in :data containing pageName)
 */
router.get('/view/:data', adminPageController.getPageDataSectionWise);

/**
 * @route   POST /acade360/admin/sections/update
 * @desc    Update a specific section on a page
 * @access  Admin only (requires encrypted data in req.body.data containing pageName, sectionId, and payload)
 */
const { upload, standardizeFilePath } = require('../middlewares/upload');
router.post('/update', upload.any(), standardizeFilePath, adminPageController.updatePageSection);

/**
 * @route   GET /acade360/admin/sections/delete/:data
 * @desc    Reset/delete a specific section on a page
 * @access  Admin only (requires encrypted data containing pageName and sectionId)
 */
router.get('/delete/:data', adminPageController.deletePageSection);

module.exports = router;
