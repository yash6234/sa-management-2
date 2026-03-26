const express = require('express');
const router = express.Router();
const {AddCoach, DeleteCoach, EditCoach, SearchCoach, ViewAllCoach, ViewSingleCoach, ToggleCoachActiveStatus } =
    require("../../adminControllers/harsh/coachControllers");

const coachUpload = require("../../middlewares/coachUploads");


router.post('/add-new-coach',coachUpload.fields([
    { name: "coach_photo", maxCount: 1 },]), AddCoach );
router.post('/edit-coach',coachUpload.fields([{ name: "coach_photo", maxCount: 1 }]), EditCoach );

router.get('/delete-coach/:data', DeleteCoach);
router.get('/view-all-coach/:data', ViewAllCoach);
router.get('/view-selected-coach/:data', ViewSingleCoach);
router.get('/search-coach/:data', SearchCoach);
router.get('/change-coach-status/:data', ToggleCoachActiveStatus);

// router.get('/send-receipt/:data', SendReceipt);

module.exports = router;
