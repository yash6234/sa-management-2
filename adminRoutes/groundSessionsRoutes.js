const express = require('express');
const router = express.Router();
const {AddGroundSession,EditGroundSession,ViewAllGroundSession,
    ViewGroundSession,DeleteGroundSession} =
    require("../adminControllers/groundSessionsControllers");

router.get('/add-ground-session/:data', AddGroundSession);

router.get('/edit-ground-session/:data', EditGroundSession);

router.get('/delete-ground-session/:data', DeleteGroundSession);

router.get('/view-ground-session/:data', ViewGroundSession);

router.get('/view-all-ground-session/:data', ViewAllGroundSession);

module.exports = router;
