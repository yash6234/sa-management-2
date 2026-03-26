const express = require('express');
const router = express.Router();
const { AddGroundBooking,EditGroundBooking,ViewAllGroundBooking, ViewGroundBooking, ViewAllGroundBookingWeb,
    DeleteGroundBooking, CompleteGroundBooking, GroundBookingReceipt, MarkPaymentGround} =
    require("../managerControllers/harsh/groundBookingControllers");

router.get('/book-ground/:data', AddGroundBooking);

router.get('/edit-booking/:data', EditGroundBooking);

router.get('/view-all-bookings/:data', ViewAllGroundBooking);

router.get('/view-selected-booking/:data', ViewGroundBooking);

router.get('/view-all-booking-web/:data', ViewAllGroundBookingWeb);

router.get('/mark-payment-received/:data', MarkPaymentGround);

// router.get('/delete-booking/:data', DeleteGroundBooking);

router.get('/complete-booking/:data', CompleteGroundBooking);

router.get('/create-booking-receipt/:data', GroundBookingReceipt);

module.exports = router;
