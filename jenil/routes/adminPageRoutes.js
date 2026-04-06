const express = require('express');
const router = express.Router();
const adminPageController = require('../controllers/adminPageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');

/**
 * @route   GET /acade360/admin/sections/list
 * @desc    Get list of all available pages in the CMS
 * @access  Admin only (requires admin auth headers)
 */
router.get('/list', adminPageController.getAvailablePages);

/**
 * @route   GET /acade360/admin/sections/view
 * @desc    Get all data for a specific page section-wise
 * @access  Admin only (requires pageName in query params)
 */
router.get('/view', adminPageController.getPageDataSectionWise);

/**
 * @route   POST /acade360/admin/sections/update
 * @desc    Update a specific section on a page
 * @access  Admin only (requires pageName, sectionId, and payload in body)
 */
router.post('/update', upload.any(), standardizeFilePath, adminPageController.updatePageSection);

/**
 * @route   DELETE /acade360/admin/sections/delete
 * @desc    Reset/delete a specific section on a page
 * @access  Admin only (requires pageName and sectionId in query params)
 */
router.delete('/delete', adminPageController.deletePageSection);

module.exports = router;
