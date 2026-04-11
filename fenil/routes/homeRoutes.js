const express    = require("express");
const router     = express.Router();
const upload     = require("../../middlewares/homeUploads");
const {
    GetHome,
    UpdateHome,
    UploadHomeImage,
    GetHomeImages,
    DeleteHomeImage,
} = require("../controllers/homeController");

/*
 
   Route map                                                       
                                                                   
   GET  /api/home/get/:data        fetch full home + image paths  
   GET  /api/home/images/:data     fetch image records only       
   GET /api/home/update           update any JSON section        
   POST /api/home/upload-image     upload / replace one image     
   POST /api/home/delete-image     delete one image by imageId    

*/

router.get("/get/:data",    GetHome);
router.get("/update/:data", UpdateHome);
router.get("/images/:data", GetHomeImages);

router.post("/delete-image", DeleteHomeImage);

router.post(
    "/upload-image",
    upload.fields([
        { name: "heroImage",    maxCount: 1 },
        { name: "welcomeImage", maxCount: 1 },
        { name: "programImage", maxCount: 1 },
    ]),
    UploadHomeImage
);

module.exports = router;