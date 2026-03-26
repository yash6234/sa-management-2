const express = require('express');
const router = express.Router();
const {AddAcademyAdmission,ViewSelectedAdmission,ViewAllAdmissions, ViewAdmissions,ViewAllAdmissionsWeb, ViewAdmissionsWeb,
    EditAdmission, DeleteAdmission, RenewAdmission, AddNewTransaction, GenerateIDCard,
    MarkCreatedIDCard, MarkGivenIDCard, GenerateReceipt, SendRenewalReminder, SendReceipt,
    ViewInactiveAdmissions , ViewInactiveAdmissionsWeb, SearchAcademyAdmissions, SearchAcademyAdmissionsWeb} =
    require("../adminControllers/academyAdmissionControllers");

const academyUpload = require("../middlewares/academyUploads");

router.post('/add-new-admission',academyUpload.fields([
        { name: "trainee_photo", maxCount: 1 },
        { name: "aadhar", maxCount: 1 },
        { name: "trainee_signature", maxCount: 1 },
        { name: "father_signature", maxCount: 1 },
        { name: "self_declaration", maxCount: 1 },
        { name: "medical_form", maxCount: 1 },
        { name: "other_docs", maxCount: 10 }
    ]), AddAcademyAdmission);

router.get('/view-selected-admission/:data', ViewSelectedAdmission);

router.get('/view-all-admissions/:data', ViewAllAdmissions);

router.get('/search-admissions/:data', SearchAcademyAdmissions);

router.get('/search-web-admissions/:data', SearchAcademyAdmissionsWeb);

router.get('/view-inactive-admissions/:data', ViewInactiveAdmissions); // Inactive Only

router.get('/view-admissions/:data', ViewAdmissions); // Active Only

router.get('/view-all-admissions-web/:data', ViewAllAdmissionsWeb);

router.get('/view-inactive-admissions-web/:data', ViewInactiveAdmissionsWeb); // Inactive Only

router.get('/view-admissions-web/:data', ViewAdmissionsWeb); // Active Only

router.post('/edit-admission',academyUpload.fields([
        { name: "trainee_photo", maxCount: 1 },
        { name: "aadhar", maxCount: 1 },
        { name: "trainee_signature", maxCount: 1 },
        { name: "father_signature", maxCount: 1 },
        { name: "self_declaration", maxCount: 1 },
        { name: "medical_form", maxCount: 1 },
        { name: "other_docs", maxCount: 10 }
    ]), EditAdmission);

router.get('/delete-admission/:data', DeleteAdmission);

router.get('/renew-admission/:data', RenewAdmission);

router.get('/add-transaction/:data', AddNewTransaction);

router.get('/generate-id-card/:data', GenerateIDCard);

router.get('/mark-created-id-card/:data', MarkCreatedIDCard);

router.get('/mark-given-id-card/:data', MarkGivenIDCard);

router.get('/generate-receipt/:data', GenerateReceipt);

router.get('/send-renewal-reminder/:data', SendRenewalReminder);

router.get('/send-receipt/:data', SendReceipt);

module.exports = router;
