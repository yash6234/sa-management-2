const express = require('express');
const router = express.Router();
const {MarkAttendance, ViewSelectedAttendance, SearchAttendanceWeb, SearchAttendance, ViewDailyAttendance, ViewDailyAttendanceWeb } =
    require("../../adminControllers/harsh/attendanceControllers");


router.get('/mark/:data', MarkAttendance);

router.get('/view-selected/:data', ViewSelectedAttendance);

router.get('/search-web/:data', SearchAttendanceWeb);

router.get('/search/:data', SearchAttendance);

router.get('/view-web-daily/:data', ViewDailyAttendanceWeb);

router.get('/view-daily/:data', ViewDailyAttendance);

module.exports = router;
