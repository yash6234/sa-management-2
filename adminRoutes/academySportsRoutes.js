const express = require('express');
const router = express.Router();
const {AddAcademySports,EditAcademySports,ViewAllAcademySports,ViewAcademySports,DeleteAcademySports} = require("../adminControllers/academySportsControllers");

router.get('/add-academy-sports/:data', AddAcademySports);

router.get('/edit-academy-sports/:data', EditAcademySports);

router.get('/delete-academy-sports/:data', DeleteAcademySports);

router.get('/view-academy-sports/:data', ViewAcademySports);

router.get('/view-all-academy-sports/:data', ViewAllAcademySports);

module.exports = router;
