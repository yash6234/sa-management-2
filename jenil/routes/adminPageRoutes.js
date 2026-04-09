const express = require('express');
const router = express.Router();
const adminPageController = require('../controllers/adminPageController');
const { upload, standardizeFilePath } = require('../middlewares/upload');
const { middlewareAdmin, middlewareAdminPost } = require('../utils/ValidateAdmin');

/**
 * @route   GET /acade360/admin/sections/list
 * @desc    Get list of all available pages in the CMS
 * @access  Admin only (requires admin auth headers)
 */
router.get('/list/:data', middlewareAdmin, adminPageController.getAvailablePages);

/**
 * @route   GET /acade360/admin/sections/view
 * @desc    Get all data for a specific page section-wise
 * @access  Admin only (requires pageName in query params)
 */
router.get('/view/:data', middlewareAdmin, adminPageController.getPageDataSectionWise);

/**
 * @route   POST /acade360/admin/sections/update
 * @desc    Update a specific section on a page
 * @access  Admin only (requires pageName, sectionId, and payload in body)
 */
router.post('/update', middlewareAdminPost, upload.any(), standardizeFilePath, adminPageController.updatePageSection);

/**
 * @route   DELETE /acade360/admin/sections/delete
 * @desc    Reset/delete a specific section on a page
 * @access  Admin only (requires pageName and sectionId in query params)
 */
router.delete('/delete', middlewareAdminPost, adminPageController.deletePageSection);

module.exports = router;
