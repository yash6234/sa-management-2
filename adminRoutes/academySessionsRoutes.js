const express = require('express');
const router = express.Router();
const {AddAcademySession,EditAcademySession,ViewAllAcademySession,ViewAcademySession,DeleteAcademySession} = require("../adminControllers/academySessionsControllers");

router.get('/add-academy-session/:data', AddAcademySession);

router.get('/edit-academy-session/:data', EditAcademySession);

router.get('/delete-academy-session/:data', DeleteAcademySession);

router.get('/view-academy-session/:data', ViewAcademySession);

router.get('/view-all-academy-session/:data', ViewAllAcademySession);

module.exports = router;
