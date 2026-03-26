const express = require('express');
const router = express.Router();
const {AddAcademyPlan,EditAcademyPlan,ViewAllAcademyPlan,
    ViewAcademyPlan,DeleteAcademyPlan} = 
    require("../adminControllers/academyPlanControllers");

router.get('/add-academy-plan/:data', AddAcademyPlan);

router.get('/edit-academy-plan/:data', EditAcademyPlan);

router.get('/delete-academy-plan/:data', DeleteAcademyPlan);

router.get('/view-academy-plans/:data', ViewAcademyPlan);

router.get('/view-all-academy-plans/:data', ViewAllAcademyPlan);

module.exports = router;
