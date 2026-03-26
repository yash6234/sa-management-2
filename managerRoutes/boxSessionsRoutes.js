const express = require('express');
const router = express.Router();
const {AddAcademySession,EditAcademySession,ViewAllAcademySession,ViewAcademySession,DeleteAcademySession} = require("../adminControllers/academySessionsControllers");

router.get('/add-box-session/:data', AddAcademySession);

router.get('/edit-box-session/:data', EditAcademySession);

router.get('/delete-box-session/:data', DeleteAcademySession);

router.get('/view-box-session/:data', ViewAcademySession);

router.get('/view-all-box-session/:data', ViewAllAcademySession);

module.exports = router;
