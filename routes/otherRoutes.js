const express = require('express');
const router = express.Router();
const { UpdateAcademyIDSecurely} = require("../controllers/otherControllers");

router.get('/academy-data/update/:data', UpdateAcademyIDSecurely);

module.exports = router;
