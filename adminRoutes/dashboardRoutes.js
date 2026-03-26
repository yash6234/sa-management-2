const express = require('express');
const router = express.Router();
const { Dashboard } = require("../adminControllers/dashboardControllers");

router.get('/dashboard-data/:data',Dashboard );

module.exports = router;
