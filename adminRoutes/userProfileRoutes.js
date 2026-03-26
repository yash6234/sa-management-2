const express = require('express');
const router = express.Router();
const {ViewProfile,EditProfile,ChangePassword} = require("../adminControllers/userProfileController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set destination & filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/profile_photos/";
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept only jpg, png, pdf
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  }
});
router.get('/view-profile/:data', ViewProfile);

router.get('/edit-profile/:data',upload.fields([
  { name: 'photo', maxCount: 1 }]), EditProfile);

router.get('/change-password/:data', ChangePassword);

module.exports = router;
