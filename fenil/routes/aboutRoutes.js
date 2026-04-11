const express = require("express");
const router  = express.Router();
const upload  = require("../../middlewares/aboutUploads");
const {
    GetAbout,
    UpdateAbout,
    UploadAboutImage,
    GetAboutImages,
    DeleteAboutImage,
} = require("../controllers/aboutController");

router.get("/get/:data",    GetAbout);
router.get("/images/:data", GetAboutImages);
router.get("/update/:data", UpdateAbout);     

router.post("/delete-image", DeleteAboutImage);

router.post(
    "/upload-image",
    upload.fields([{ name: "founderImage", maxCount: 1 }]),
    UploadAboutImage
);

module.exports = router;