const express = require('express');
const router = express.Router();
const { FetchSettingData ,ChangeLogo,EditSettingsData} = require("../adminControllers/settingControllers");
const logoUpload = require("../middlewares/logoUploads");

router.get('/fetch-settings-data/:data',FetchSettingData );

router.get('/edit-settings-data/:data',EditSettingsData );

router.post('/change-logo',logoUpload.fields([
        { name: "logo", maxCount: 1 },
    ]),ChangeLogo );

module.exports = router;
