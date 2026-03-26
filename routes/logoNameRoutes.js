const express = require('express');
const router = express.Router();
const { FetchName,LogoName,ChangeLogo} = require("../controllers/logoNameController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Set destination & filename
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = "uploads/students/";
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
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error("Invalid file type"));
  }
});

router.get('/name', FetchName);

router.get('/logo', LogoName);

// router.get('/change-logo',upload.fields([
//   { name: 'photo', maxCount: 1 },
// ]), ChangeLogo);

module.exports = router;
