// controllers/boxBookingController.js

const BoxBooking = require("../../models/harsh/BookingDetails");
const Box = require("../../models/harsh/Booking");
const BoxSessions = require("../../models/harsh/BookingSessions");
const BoxPlans = require("../../models/harsh/BookingPlans");
const { encryptData, decryptData, logger } = require("../../utils/enc_dec_m");
const { validateManagerRequest } = require("../../middlewares/managerValidation");
const { AddTransactionAdmin } = require("../../utils/Trans_Fn");
const mongoose = require("mongoose");

// Helper: Convert date + time string → Date object
const toDateTime = (dateStr, timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    const dt = new Date(dateStr);
    dt.setHours(h, m, 0, 0);
    return dt;
};

// ========================
// ADD BOX BOOKING
// ========================
const AddBoxBooking = async (req, res) => {
    try {
        logger.info("Add Box Booking Request Received");

        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const {
            name,
            mobile_no,
            date,
            box_id,
            session_id,
            plan_id,
            amount,
            transactions = []
        } = decryptedData;

        if (!name || !mobile_no || !date || !box_id || !session_id) {
            return res.status(400).json({ message: "Name, mobile, date, box, and session are required" });
        }

        const box = await Box.findById(box_id);
        if (!box || box.delete || !box.active) return res.status(404).json({ message: "Box not found or inactive" });

        const session = await BoxSessions.findById(session_id);
        if (!session || session.delete || !session.active) return res.status(404).json({ message: "Session not found" });

        let plan = null;
        if (plan_id) {
            plan = await BoxPlans.findById(plan_id);
            if (!plan || plan.delete || !plan.active) return res.status(404).json({ message: "Plan not found" });
        }

        // CONFLICT CHECK
        const newStart = toDateTime(date, session.time_from);
        const newEnd = toDateTime(date, session.time_to);

        const conflict = await BoxBooking.findOne({
            box: box_id,
            date: { $gte: new Date(date).setHours(0,0,0,0), $lte: new Date(date).setHours(23,59,59,999) },
            active: true,
            delete: false,
            $or: [
                { time_from: { $lt: session.time_to }, time_to: { $gt: session.time_from } }
            ]
        });

        if (conflict) {
            return res.status(409).json({
                message: `Slot already booked from ${conflict.time_from} - ${conflict.time_to} by ${conflict.name}`
            });
        }

        const finalAmount = Number(amount || plan?.amount || 0);
        const paid = transactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
        const leftover = paid < finalAmount;
        const payment_type = paid >= finalAmount ? "Paid" : paid > 0 ? "Partial" : "Pending";

        const booking = await BoxBooking.create({
            name,
            mobile_no,
            date: new Date(date),
            box: box._id,
            box_name: box.name,
            session_id: session._id,
            session_name: session.name,
            time_from: session.time_from,
            time_to: session.time_to,
            plan_id: plan?._id || null,
            plan_name: plan?.name || null,
            plan_amount: plan?.amount || null,
            amount: finalAmount,
            paid,
            leftover,
            payment_type,
            transactions,
            booking_by: result.user.name,
            booking_by_id: result.user._id,
            booking_by_role: result.user.role || "Admin"
        });

        // Add to Accounts
        if (paid > 0) {
            await AddTransactionAdmin(
                new Date(),
                paid,
                "IN",
                `Box Booking | ${box.name} | ${session.name} | ${name}`,
                booking._id,
                transactions[0]?.method || "CASH"
            );
        }

        logger.info(`Box Booking Created: ${name} - ${box.name} - ${session.name}`);
        return res.status(200).json({
            message: "Box Booking Created Successfully",
            data: encryptData({
                booking_id: booking._id,
                amount: finalAmount,
                paid,
                payment_type
            })
        });

    } catch (err) {
        logger.error(`AddBoxBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// EDIT BOX BOOKING (With Edit Logs)
// ========================
const EditBoxBooking = async (req, res) => {
    try {
        logger.info("Edit Box Booking Request Received");

        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const {
            booking_id,
            name,
            mobile_no,
            date,
            box_id,
            session_id,
            plan_id,
            amount,
            transactions = [],
            note
        } = decryptedData;

        if (!booking_id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await BoxBooking.findById(booking_id);
        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        const targetBoxId = box_id || booking.box;
        const targetSessionId = session_id || booking.session_id;
        const targetPlanId = plan_id || booking.plan_id;
        const targetDate = date ? new Date(date) : booking.date;

        const box = await Box.findById(targetBoxId);
        const session = await BoxSessions.findById(targetSessionId);
        if (!box || !session) return res.status(404).json({ message: "Invalid Box or Session" });

        let plan = null;
        if (targetPlanId) {
            plan = await BoxPlans.findById(targetPlanId);
        }

        // CONFLICT CHECK (exclude current booking)
        const newStart = toDateTime(targetDate, session.time_from);
        const newEnd = toDateTime(targetDate, session.time_to);

        const conflict = await BoxBooking.findOne({
            _id: { $ne: booking._id },
            box: targetBoxId,
            date: { $gte: targetDate.setHours(0,0,0,0), $lte: targetDate.setHours(23,59,59,999) },
            active: true,
            delete: false,
            $or: [
                { time_from: { $lt: session.time_to }, time_to: { $gt: session.time_from } }
            ]
        });

        if (conflict) {
            return res.status(409).json({ message: `Slot conflict with ${conflict.name}'s booking` });
        }

        // Edit Logs
        const edits = [];
        const addEdit = (field, oldVal, newVal) => {
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                edits.push({
                    field,
                    old: oldVal,
                    new: newVal,
                    changed_by: result.user.name,
                    changed_by_id: result.user._id,
                    changed_by_role: result.user.role,
                    changed_at: new Date(),
                    note: note || ""
                });
            }
        };

        addEdit("name", booking.name, name || booking.name);
        addEdit("mobile_no", booking.mobile_no, mobile_no || booking.mobile_no);
        addEdit("date", booking.date, targetDate);
        addEdit("box", booking.box_name, box.name);
        addEdit("session", booking.session_name, session.name);
        addEdit("plan", booking.plan_name, plan?.name || null);

        // Append new transactions
        const newTx = transactions.map(tx => ({
            ...tx,
            amount: Number(tx.amount || 0),
            method: tx.method || "CASH",
            date: tx.date ? new Date(tx.date) : new Date(),
            pay_for: "BoxBooking"
        }));
        const newPaid = newTx.reduce((s, t) => s + t.amount, 0);

        booking.transactions = [...(booking.transactions || []), ...newTx];
        booking.paid += newPaid;
        booking.leftover = booking.paid < (amount || booking.amount);
        booking.payment_type = booking.paid >= (amount || booking.amount) ? "Paid" : booking.paid > 0 ? "Partial" : "Pending";

        // Update core fields
        booking.name = name || booking.name;
        booking.mobile_no = mobile_no || booking.mobile_no;
        booking.date = targetDate;
        booking.box = box._id;
        booking.box_name = box.name;
        booking.session_id = session._id;
        booking.session_name = session.name;
        booking.time_from = session.time_from;
        booking.time_to = session.time_to;
        booking.plan_id = plan?._id || null;
        booking.plan_name = plan?.name || null;
        booking.plan_amount = plan?.amount || null;
        booking.amount = Number(amount || booking.amount);
        booking.edit_logs = [...(booking.edit_logs || []), ...edits];

        await booking.save();

        if (newPaid > 0) {
            await AddTransactionAdmin(new Date(), newPaid, "IN", `Box Booking Payment | ${box.name}`, booking._id, "CASH");
        }

        return res.status(200).json({
            message: "Box Booking Updated",
            data: encryptData({ booking_id: booking._id })
        });

    } catch (err) {
        logger.error(`EditBoxBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// VIEW ALL BOX BOOKINGS (Web - Paginated)
// ========================
const ViewAllBoxBookingWeb = async (req, res) => {
    try {
        logger.info("View All Box Bookings Web Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { page = 1 } = decryptedData;
        const limit = 50;
        const skip = (parseInt(page) - 1) * limit;

        const total = await BoxBooking.countDocuments({ delete: false });

        const bookings = await BoxBooking.find({ delete: false })
            .populate("box", "name box_no")
            .populate("session_id", "name time_from time_to")
            .populate("plan_id", "name amount")
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            message: "Box Bookings Fetched",
            data: encryptData({
                bookings,
                pagination: {
                    total,
                    current_page: Number(page),
                    total_pages: Math.ceil(total / limit),
                    per_page: limit,
                },
            }),
        });
    } catch (err) {
        logger.error(`ViewAllBoxBookingWeb Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// VIEW SINGLE BOX BOOKING
// ========================
const ViewSingleBoxBooking = async (req, res) => {
    try {
        logger.info("View Single Box Booking");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await BoxBooking.findOne({ _id: id, delete: false })
            .populate("box session_id plan_id");

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        return res.status(200).json({
            message: "Booking Details",
            data: encryptData(booking),
        });
    } catch (err) {
        logger.error(`ViewSingleBoxBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// SOFT DELETE BOOKING
// ========================
const DeleteBoxBooking = async (req, res) => {
    try {
        logger.info("Delete Box Booking Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        const booking = await BoxBooking.findById(id);
        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        booking.delete = true;
        booking.active = false;
        await booking.save();

        return res.status(200).json({ message: "Box Booking Deleted" });
    } catch (err) {
        logger.error(`DeleteBoxBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

module.exports = {
    AddBoxBooking,
    EditBoxBooking,
    ViewAllBoxBookingWeb,
    ViewSingleBoxBooking,
    DeleteBoxBooking
};
