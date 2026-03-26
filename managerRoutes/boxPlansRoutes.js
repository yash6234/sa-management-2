const express = require('express');
const router = express.Router();
const {AddAcademyPlan,EditAcademyPlan,ViewAllAcademyPlan,
    ViewAcademyPlan,DeleteAcademyPlan} =
    require("../adminControllers/academyPlanControllers");

router.get('/add-box-plan/:data', AddAcademyPlan);

router.get('/edit-box-plan/:data', EditAcademyPlan);

router.get('/delete-box-plan/:data', DeleteAcademyPlan);

router.get('/view-box-plans/:data', ViewAcademyPlan);

router.get('/view-all-box-plans/:data', ViewAllAcademyPlan);

module.exports = router;
