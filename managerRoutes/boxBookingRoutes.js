const express = require('express');
const router = express.Router();
const {AddBoxBooking, DeleteBoxBooking, EditBoxBooking, ViewAllBoxBookingWeb, ViewSingleBoxBooking} =
    require("../managerControllers/harsh/boxBookingControllers");

router.get('/book-box/:data', AddBoxBooking);

router.get('/edit-booking/:data', EditBoxBooking);

router.get('/view-all-bookings/:data', ViewAllBoxBookingWeb);

router.get('/view-selected-booking/:data', ViewSingleBoxBooking);

router.get('/view-all-booking-web/:data', ViewAllBoxBookingWeb);

router.get('/delete-booking/:data', EditAcademyPlan);

router.get('/complete-booking/:data', EditAcademyPlan);

router.get('/create-booking-receipt/:data', EditAcademyPlan);

module.exports = router;
