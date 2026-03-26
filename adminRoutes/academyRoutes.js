const express = require('express');
const router = express.Router();
const {AddAcademy,EditAcademy,ViewAcademy,DeleteAcademy} = require("../adminControllers/academyController");

router.get('/add-academy/:data', AddAcademy);

router.get('/edit-academy/:data', EditAcademy);

router.get('/delete-academy/:data', DeleteAcademy);

router.get('/view-academy/:data', ViewAcademy);

module.exports = router;
