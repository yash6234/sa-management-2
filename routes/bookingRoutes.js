    const express = require('express');
const router = express.Router();
const { ViewFacility, ViewSlots, ViewSports, ViewPlans,ViewBookings, CheckClashBooking, ConfirmBooking, } = require("../controllers/harsh/bookingController");

router.get('/view-facility', ViewFacility);

router.get('/clash-booking-check/:data', CheckClashBooking);

router.get('/confirm-booking/:data', ConfirmBooking);

module.exports = router;
