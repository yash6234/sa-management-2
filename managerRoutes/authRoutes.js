const express = require('express');
const router = express.Router();
const { Login,VerifyOTP,LoginApp,VerifyOTPApp} = require("../managerControllers/authController");

router.get('/login/:data', Login);

router.get('/verify/:data', VerifyOTP);

router.get('/login/app/:data', LoginApp);

router.get('/verify/app/:data', VerifyOTPApp);

module.exports = router;
