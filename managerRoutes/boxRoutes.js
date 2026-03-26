const express = require('express');
const router = express.Router();
const {AddAcademy,EditAcademy,ViewAcademy,DeleteAcademy} = require("../adminControllers/academyController");

router.get('/add-box/:data', AddAcademy);

router.get('/edit-box/:data', EditAcademy);

router.get('/delete-box/:data', DeleteAcademy);

router.get('/view-box/:data', ViewAcademy);

module.exports = router;
