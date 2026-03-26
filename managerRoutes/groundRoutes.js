const express = require('express');
const router = express.Router();
const { AddGround, EditGround, ViewGround, ViewAllGround, DeleteGround }
    = require("../managerControllers/harsh/groundController");
const groundUpload = require("../middlewares/groundUploads");

router.post('/add-ground',groundUpload.fields([
        { name: "images", maxCount: 5 }
]), AddGround);

//EXPECTED DATA IN BODY FOR EDIT

// {
//   "ground_id": "675123abc999",
//   "name": "New Ground Name",
//   "description": "Updated description",
//   "removeImages": ["old1.jpg", "old2.jpg"] // optional
// }

router.post('/edit-ground',groundUpload.fields([
        { name: "images", maxCount: 5 }
]), EditGround);

// router.get('/delete-ground/:data', DeleteGround);

router.get('/view-ground/:data', ViewGround);

router.get('/view-all-ground/:data',ViewAllGround);

module.exports = router;
