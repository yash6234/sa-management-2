const express = require('express');
const router = express.Router();
const {AddStaff, DeleteStaff, EditStaff, SearchStaff, ViewAllStaff, ViewSingleStaff, ToggleStaffActiveStatus} =
    require("../../adminControllers/harsh/staffControllers");

const staffUpload = require("../../middlewares/staffUploads");



router.post('/add-new-staff',staffUpload.fields([
    { name: "staff_photo", maxCount: 1 },]), AddStaff );
router.post('/edit-staff',staffUpload.fields([{ name: "staff_photo", maxCount: 1 }]), EditStaff );

router.get('/delete-staff/:data', DeleteStaff);
router.get('/view-all-staff/:data', ViewAllStaff);
router.get('/view-selected-staff/:data', ViewSingleStaff);
router.get('/search-staff/:data', SearchStaff);
router.get('/change-staff-status/:data', ToggleStaffActiveStatus);
// router.get('/send-receipt/:data', SendReceipt);

module.exports = router;
