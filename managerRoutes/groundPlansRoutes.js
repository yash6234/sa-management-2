const express = require('express');
const router = express.Router();
const {AddGroundPlan,EditGroundPlan,ViewAllGroundPlan,
    ViewGroundPlan,DeleteGroundPlan} =
    require("../managerControllers/harsh/groundPlanControllers");

router.get('/add-ground-plan/:data', AddGroundPlan);

router.get('/edit-ground-plan/:data', EditGroundPlan);

// router.get('/delete-ground-plan/:data', DeleteGroundPlan);

router.get('/view-ground-plans/:data', ViewGroundPlan);

router.get('/view-all-ground-plans/:data', ViewAllGroundPlan);

module.exports = router;
