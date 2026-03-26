const {logger, encryptData, decryptData} = require("../../utils/enc_dec_c");
const Booking = require("../../models/harsh/Booking");
const BookingDetails = require("../../models/harsh/BookingDetails");
const BookingPlans = require("../../models/harsh/BookingPlans");
const BookingSports = require("../../models/harsh/BookingSports");
const BookingSessions = require("../../models/harsh/BookingSessions");

const ViewFacility = async (req, res) => {
    try{
        logger.info("Fetch Facility Request Received")

        const dt = await Booking.find({active:true,delete:false});
        console.log(dt);

        return res.status(200).json(
            {data:encryptData(dt),message:"Facilities Fetched Successfully"})
    } catch (err){
        logger.error("Error Fetching Facility : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const ViewSlots =  async (req, res) => {
    try{
        logger.info("Fetch Slots Request Received")

        const dt = await BookingSessions.find({active:true,delete:false});

        return res.status(200).json({data:encryptData(dt),message:"Sessions Fetched Successfully"})
    } catch (err){
        logger.error("Error Fetching Sessions : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const ViewSports =  async (req, res) => {
    try{
        logger.info("Fetch Sports Request Received")

        const dt = await BookingSports.find({active:true,delete:false});

        return res.status(200).json({data:encryptData(dt),message:"Sports Fetched Successfully"})
    } catch (err){
        logger.error("Error Fetching Sports : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const ViewPlans =  async (req, res) => {
    try{
        logger.info("Fetch Plans Request Received")

        const dt = await BookingPlans.find({active:true,delete:false});

        return res.status(200).json({data:encryptData(dt),message:"Plans Fetched Successfully"})
    } catch (err){
        logger.error("Error Fetching Plans : ",err);
        return res.status(500).send("SERVER ERROR");
    }
}

const ViewBookings = async (req, res) => {
    try {
        logger.info("Fetch Bookings Details Request Received");

        // decrypt date from payload
        const { date } = decryptData(req.params.data);

        // convert date to start & end of day
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // fetch only today's bookings
        const dt = await BookingDetails.find({
            active: true,
            delete: false,
            confirmed: true,
            date: { $gte: start, $lte: end }
        }).select("booking session_id time_from time_to date");

        return res.status(200).json({
            data: encryptData(dt),
            message: "Bookings Fetched Successfully"
        });

    } catch (err) {
        logger.error("Error Fetching Bookings : ", err);
        return res.status(500).send("SERVER ERROR");
    }
};


const CheckClashBooking = async (req, res) => {
    try {
        const { date, session_id, time_from, time_to } = decryptData(req.params.data);

        // Convert date to start and end of day
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // Find if any booking clashes
        const clash = await BookingDetails.findOne({
            active: true,
            delete: false,
            confirmed: true,
            session_id,
            date: { $gte: start, $lte: end },

            // Time clash condition
            $or: [
                {
                    time_from: { $lt: time_to },
                    time_to: { $gt: time_from }
                }
            ]
        }).select("name time_from time_to session_id date");

        return res.status(200).json({
            message: clash ? encryptData("Clash Found") : encryptData("No Clash")
        });

    } catch (err) {
        logger.error("Error Fetching Clash : ", err);
        return res.status(500).send("SERVER ERROR");
    }
};


const ConfirmBooking = async (req, res) => {
    try {
        logger.info("Confirm Booking Request Received");

        // 1) Decrypt payload from frontend
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (e) {
            logger.error("Payload Decryption Failed", e);
            return res.status(400).json({ message: "Invalid Encrypted Data" });
        }

        const {
            name,
            mobile_no,
            date,
            booking,
            session_id,
            time_from,
            time_to,
            plan_id
        } = decryptedData;

        // ------------------------------------------------------
        // 2) Time Clash Check
        // ------------------------------------------------------
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        const clash = await BookingDetails.findOne({
            active: true,
            delete: false,
            confirmed: true,
            session_id,
            date: { $gte: start, $lte: end },
            time_from: { $lt: time_to },
            time_to: { $gt: time_from }
        });

        if (clash) {
            return res.status(400).json({
                message: "Time slot already booked",
                data: encryptData({
                    clash: true,
                    existing: clash
                })
            });
        }

        // ------------------------------------------------------
        // 3) Fetch Plan, Session, Facility
        // ------------------------------------------------------

        const pdt = await BookingPlans.findById(plan_id);
        if (!pdt || pdt.active === false || pdt.delete === true) {
            return res.status(400).json({ message: "Plan Not Found" });
        }

        const sdt = await BookingSessions.findById(session_id);
        if (!sdt || sdt.active === false || sdt.delete === true) {
            return res.status(400).json({ message: "Session Not Found" });
        }

        const bdt = await Booking.findById(booking);
        if (!bdt || bdt.active === false || bdt.delete === true) {
            return res.status(400).json({ message: "Facility Not Found" });
        }

        // ------------------------------------------------------
        // 4) Save Booking (Confirmed)
        // ------------------------------------------------------

        const newBooking = new BookingDetails({
            name,
            mobile_no,
            date,
            booking,
            booking_name: bdt.name,
            session_id,
            session_name: sdt.name,
            time_from,
            time_to,

            plan_name: pdt.name,
            plan_id,
            plan_amount: pdt.amount,

            amount: pdt.amount,
            paid: 0,
            payment_type: "Pending",
            leftover: true,

            booking_by: "User",
            booking_by_id: null,
            booking_by_role: "User",

            confirmed: true
        });

        const saved = await newBooking.save();

        // ------------------------------------------------------
        // 5) Response
        // ------------------------------------------------------
        return res.status(200).json({
            data: encryptData(saved),
            message: "Booking Confirmed Successfully"
        });

    } catch (err) {
        logger.error("Error Confirming Booking : ", err);
        return res.status(500).send("SERVER ERROR");
    }
};


module.exports = { ViewFacility, ViewSlots, ViewSports, ViewPlans,ViewBookings, CheckClashBooking, ConfirmBooking, }
