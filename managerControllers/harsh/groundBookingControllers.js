
const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_m");
const {validateManagerRequest} = require("../../middlewares/managerValidation");

const fs = require("fs");
const path = require("path");
const {AddTransactionAdmin} = require("../../utils/Trans_Fn");
const Accounts = require("../../models/Accounts");
const {generateDynamicReceipt} = require("../../middlewares/receiptGenerator");

const Ground = require("../../models/Ground");

const GroundPlans = require("../../models/GroundPlans");
const GroundSessions = require("../../models/GroundSessions");
const GroundBooking = require("../../models/GroundBookings");
const mongoose = require("mongoose");

const AddGroundBooking = async (req, res) => {
    try {
        logger.info("Ground Booking Request Received");

        // 1) Validate Admin
        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }

        // 2) Decrypt payload
        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error("Decryption failed:", error.message);
            return res.status(400).json({ message: "Invalid encrypted data" });
        }

        const {
            name,
            mobile_no,
            date,
            ground_id,
            session_id,
            plan_id,
            amount,
            payment_type,
            payment_method = "CASH",   // <-- FIXED
            transactions
        } = decryptedData;

        // Required fields
        if (!name || !mobile_no || !date || !ground_id || !session_id) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // 3) Ground
        const ground = await Ground.findById(ground_id);
        if (!ground) return res.status(404).json({ message: "Ground not found" });

        // 4) Session
        const gSession = await GroundSessions.findById(session_id); // <-- FIXED name
        if (!gSession) return res.status(404).json({ message: "Session not found" });

        // 5) Plan
        let plan = null;
        if (plan_id) {
            plan = await GroundPlans.findById(plan_id);
            if (!plan) return res.status(404).json({ message: "Plan not found" });
        }

        // --------------------------------
        // 6) TIME CONFLICT CHECK
        // --------------------------------
        const toDateTime = (date, timeStr) => {
            const [h, m] = timeStr.split(":").map(Number);
            const dt = new Date(date);
            dt.setHours(h, m, 0, 0);
            return dt;
        };

        const newStart = toDateTime(date, gSession.time_from);
        const newEnd   = toDateTime(date, gSession.time_to);

        const existingBookings = await GroundBooking.find({
            ground: ground_id,
            date: new Date(date),
            active: true,
            delete: false
        });

        for (const b of existingBookings) {
            const bStart = toDateTime(b.date, b.time_from);
            const bEnd   = toDateTime(b.date, b.time_to);

            if (newStart < bEnd && bStart < newEnd) {
                return res.status(409).json({
                    message: `Time conflict: Slot already booked (${b.time_from} - ${b.time_to})`
                });
            }
        }

        // --------------------------------
        // 7) Amount & Transactions
        // --------------------------------
        const finalAmount = Number(amount || 0);

        const safeTransactions = Array.isArray(transactions) ? transactions : [];
        const paid = safeTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

        for (const tr of safeTransactions) {
            tr.pay_for = "GroundBooking"; // fixed label
        }

        const totalPaid = Number(paid || 0);
        const pendingAmount = finalAmount - totalPaid;

        // payment status
        let finalPaymentType = payment_type;
        if (!payment_type) {
            if (pendingAmount <= 0) finalPaymentType = "Paid";
            else if (totalPaid > 0) finalPaymentType = "Partial";
            else finalPaymentType = "Pending";
        }

        // --------------------------------
        // 8) Create Booking
        // --------------------------------
        const newBooking = new GroundBooking({
            name,
            mobile_no,
            date: new Date(date),
            ground: ground_id,
            ground_name: ground.name,
            session_id,
            session_name: gSession.name,
            time_from: gSession.time_from,
            time_to: gSession.time_to,

            plan_id: plan?._id || null,
            plan_name: plan?.name || null,
            plan_amount: plan?.amount || null,

            amount: finalAmount,
            paid: totalPaid,
            leftover: pendingAmount > 0,
            payment_type: finalPaymentType,
            transactions: safeTransactions,

            booking_by: result.user.name,
            booking_by_id: result.user._id,
            booking_by_role: result.user.role
        });

        await newBooking.save();

        // --------------------------------
        // 9) Add Transaction in Accounts
        // --------------------------------
        if (totalPaid > 0) {
            await AddTransactionAdmin(
                new Date(date),
                totalPaid,
                "IN",
                `Ground Booking | ${ground.name} | ${gSession.name} | ${name}`,
                newBooking._id,
                payment_method       // CASH / UPI / CARD
            );
        }

        // --------------------------------
        // 10) Response
        // --------------------------------
        return res.status(200).json({
            message: "Ground Booking Added Successfully",
            data: encryptData({
                booking_id: newBooking._id,
                amount: newBooking.amount,
                paid: newBooking.paid,
                payment_type: newBooking.payment_type
            }),
        });

    } catch (err) {
        logger.error("Error in AddGroundBooking:", err.message);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

const EditGroundBooking = async (req, res) => {
  try {
    logger.info("Edit Ground Booking Request Received");

    // 1) Validate Admin
    const result = await validateManagerRequest(req, res);
    if (result.error) {
      return res.status(result.status).json({ message: result.message });
    }

    // 2) Decrypt payload
    let decryptedData;
    try {
      decryptedData = decryptData(req.params.data);
    } catch (error) {
      logger.error("Decryption failed:", error.message);
      return res.status(400).json({ message: "Invalid encrypted data" });
    }

    const {
      booking_id,           // REQUIRED: id of booking to edit
      name,
      mobile_no,
      date,                 // optional, new date (string/ISO)
      ground_id,
      session_id,
      plan_id,
      amount,               // optional manual amount (if no plan)
      payment_type,         // optional override
      payment_method = "CASH", // default for transactions
      transactions = [],    // NEW transactions to add (only these will be appended)
      note                  // optional note to store in edit_logs
    } = decryptedData;

    if (!booking_id) {
      return res.status(400).json({ message: "Missing booking_id" });
    }

    // 3) Load existing booking
    const booking = await GroundBooking.findById(booking_id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 4) Resolve target ground/session/plan (use new ids if provided else existing)
    const targetGroundId = ground_id || booking.ground;
    const targetSessionId = session_id || booking.session_id;
    const targetPlanId = plan_id || booking.plan_id;
    const targetDate = date ? new Date(date) : new Date(booking.date);

    const ground = await Ground.findById(targetGroundId);
    if (!ground) return res.status(404).json({ message: "Ground not found" });

    const gSession = await GroundSessions.findById(targetSessionId);
    if (!gSession) return res.status(404).json({ message: "Session not found" });

    let plan = null;
    if (targetPlanId) {
      plan = await GroundPlans.findById(targetPlanId);
      if (!plan) return res.status(404).json({ message: "Plan not found" });
    }

    // 5) TIME CONFLICT CHECK (exclude the booking being edited)
    const toDateTime = (d, timeStr) => {
      const [h, m] = (timeStr || "00:00").split(":").map(Number);
      const dt = new Date(d);
      dt.setHours(h, m, 0, 0);
      return dt;
    };

    const newStart = toDateTime(targetDate, gSession.time_from);
    const newEnd = toDateTime(targetDate, gSession.time_to);

    const existingBookings = await GroundBooking.find({
      ground: targetGroundId,
      date: new Date(targetDate),
      active: true,
      delete: false,
      _id: { $ne: booking._id } // exclude current booking
    });

    for (const b of existingBookings) {
      const bStart = toDateTime(b.date, b.time_from);
      const bEnd = toDateTime(b.date, b.time_to);
      if (newStart < bEnd && bStart < newEnd) {
        return res.status(409).json({
          message: `Time conflict: Slot already booked (${b.time_from} - ${b.time_to})`
        });
      }
    }

    // 6) Prepare edit_logs: compare fields and push changes
    const edits = [];
    const addEdit = (field, oldVal, newVal, noteForChange) => {
      // Only add when actual change (loose equality check)
      const oldJSON = oldVal instanceof Date ? oldVal.toISOString() : JSON.stringify(oldVal);
      const newJSON = newVal instanceof Date ? newVal.toISOString() : JSON.stringify(newVal);
      if (oldJSON !== newJSON) {
        edits.push({
          field,
          old: oldVal,
          new: newVal,
          changed_by: result.user.name || "Admin",
          changed_by_id: result.user._id || null,
          changed_by_role: result.user.role || null,
          changed_at: new Date(),
          note: noteForChange || note || ""
        });
      }
    };

    // Fields that may change
    addEdit("name", booking.name, name ?? booking.name);
    addEdit("mobile_no", booking.mobile_no, mobile_no ?? booking.mobile_no);
    addEdit("date", booking.date, targetDate);
    addEdit("ground", booking.ground, targetGroundId);
    addEdit("ground_name", booking.ground_name, ground.name);
    addEdit("session_id", booking.session_id, targetSessionId);
    addEdit("session_name", booking.session_name, gSession.name);
    addEdit("time_from", booking.time_from, gSession.time_from);
    addEdit("time_to", booking.time_to, gSession.time_to);
    addEdit("plan_id", booking.plan_id, plan ? plan._id : booking.plan_id);
    addEdit("plan_name", booking.plan_name, plan ? plan.name : booking.plan_name);
    addEdit("plan_amount", booking.plan_amount, plan ? plan.amount : booking.plan_amount);
    // If user provided manual amount explicitly, consider it. Otherwise booking.amount may be plan.amount.
    const newManualAmount = (typeof amount !== "undefined") ? Number(amount || 0) : booking.amount;
    addEdit("amount", booking.amount, newManualAmount);
    // payment_type potential change handled later

    // Append edit logs
    if (!Array.isArray(booking.edit_logs)) booking.edit_logs = [];
    booking.edit_logs = booking.edit_logs.concat(edits);

    // 7) Transactions handling (Option A: keep old entries, only append new ones)
    const safeNewTransactions = Array.isArray(transactions) ? transactions.map(tx => ({
      ...tx
    })) : [];

    // normalize and tag new transactions
    for (const tx of safeNewTransactions) {
      tx.amount = Number(tx.amount || 0);
      tx.method = tx.method || payment_method || "CASH";
      tx.date = tx.date ? new Date(tx.date) : new Date(); // ensure date
      // tag pay_for so we know what this transaction is for
      tx.pay_for = tx.pay_for || "GroundBooking";
      // optional: store reference to booking id (will add after booking.save())
    }

    // sum of new payments to add
    const newPaidSum = safeNewTransactions.reduce((s, t) => s + Number(t.amount || 0), 0);

    // update booking.transactions by appending new ones
    booking.transactions = Array.isArray(booking.transactions) ? booking.transactions.concat(safeNewTransactions) : safeNewTransactions;

    // 8) Recalculate paid/leftover/payment_type
    const existingPaid = Number(booking.paid || 0); // existing paid stored on booking
    const updatedPaid = existingPaid + newPaidSum;

    // If plan exists, finalize amount from plan else manual amount
    const computedAmount = plan ? Number(plan.amount || 0) : Number(newManualAmount || 0);

    const pendingAmount = computedAmount - updatedPaid;

    let finalPaymentType = payment_type || booking.payment_type;
    if (!payment_type) {
      if (pendingAmount <= 0) finalPaymentType = "Paid";
      else if (updatedPaid > 0) finalPaymentType = "Partial";
      else finalPaymentType = "Pending";
    }

    // 9) Apply core updates to booking
    booking.name = name ?? booking.name;
    booking.mobile_no = mobile_no ?? booking.mobile_no;
    booking.date = targetDate;
    booking.ground = targetGroundId;
    booking.ground_name = ground.name;
    booking.session_id = targetSessionId;
    booking.session_name = gSession.name;
    booking.time_from = gSession.time_from;
    booking.time_to = gSession.time_to;

    booking.plan_id = plan ? plan._id : booking.plan_id;
    booking.plan_name = plan ? plan.name : booking.plan_name;
    booking.plan_amount = plan ? plan.amount : booking.plan_amount;

    booking.amount = computedAmount;
    booking.paid = updatedPaid;
    booking.leftover = pendingAmount > 0;
    booking.payment_type = finalPaymentType;

    // booking edited_by details
    booking.updatedBy = result.user.name || booking.updatedBy;
    booking.updatedById = result.user._id || booking.updatedById;

    // 10) Save booking
    await booking.save();

    // 11) Add Account transactions for each new payment (do not modify old ones)
    if (newPaidSum > 0 && safeNewTransactions.length > 0) {
      // Add one Accounts entry per new transaction (keeps audit trail)
      for (const tx of safeNewTransactions) {
        try {
          // Use tx.method if present else fallback
          const methodToUse = tx.method || payment_method || "CASH";
          await AddTransactionAdmin(
            tx.date || new Date(),
            Number(tx.amount || 0),
            "IN",
            `Ground Booking Payment | ${ground.name} | ${gSession.name} | ${booking.name}`,
            booking._id,
            methodToUse,
            {} // no session passed
          );
        } catch (errTx) {
          // Log error but do not fail entire edit — we preserve booking and transactions array.
          logger.error(`Failed adding account transaction for booking ${booking._id}: ${errTx.message}`);
        }
      }
    }

    // 12) Response (encrypted)
    return res.status(200).json({
      message: "Ground Booking Edited Successfully",
      data: encryptData({
        booking_id: booking._id,
        amount: booking.amount,
        paid: booking.paid,
        payment_type: booking.payment_type
      })
    });

  } catch (err) {
    logger.error(`Error in EditGroundBooking: ${err.message}`);
    return res.status(500).json({ message: "SERVER ERROR" });
  }
};

// VIEW ALL GROUND BOOKINGS (Web - 50 per page)
const ViewAllGroundBookingWeb = async (req, res) => {
    try {
        logger.info("View All Ground Bookings Web Request Received");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { page = 1 } = decryptedData;
        const limit = 50;
        const skip = (parseInt(page) - 1) * limit;

        const total = await GroundBooking.countDocuments({ delete: false });

        const bookings = await GroundBooking.find({ delete: false })
            .populate("ground", "name")
            .populate("session_id", "name time_from time_to")
            .populate("plan_id", "name amount")
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            message: "Ground Bookings Fetched Successfully",
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
        logger.error(`ViewAllGroundBookingWeb Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// VIEW SINGLE GROUND BOOKING
const ViewGroundBooking = async (req, res) => {
    try {
        logger.info("View Single Ground Booking Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await GroundBooking.findOne({ _id: id, delete: false })
            .populate("ground session_id plan_id");

        if (!booking) return res.status(404).json({ message: "Booking not found" });

        return res.status(200).json({
            message: "Ground Booking Fetched Successfully",
            data: encryptData(booking),
        });
    } catch (err) {
        logger.error(`ViewGroundBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// DELETE GROUND BOOKING (Soft Delete)
const DeleteGroundBooking = async (req, res) => {
    try {
        logger.info("Delete Ground Booking Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await GroundBooking.findById(id);
        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        booking.delete = true;
        booking.active = false;
        await booking.save();

        logger.info(`Ground Booking Deleted: ${booking.name}`);
        return res.status(200).json({ message: "Ground Booking Deleted Successfully" });
    } catch (err) {
        logger.error(`DeleteGroundBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// MARK BOOKING AS COMPLETED
const CompleteGroundBooking = async (req, res) => {
    try {
        logger.info("Complete Ground Booking Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await GroundBooking.findById(id);
        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        if (booking.completed) {
            return res.status(400).json({ message: "Booking already completed" });
        }

        booking.completed = true;
        await booking.save();

        logger.info(`Ground Booking Marked Complete: ${booking.name}`);
        return res.status(200).json({ message: "Booking Marked as Completed" });
    } catch (err) {
        logger.error(`CompleteGroundBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// GENERATE RECEIPT
const GroundBookingReceipt = async (req, res) => {
    try {
        logger.info("Ground Booking Receipt Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Booking ID required" });

        const booking = await GroundBooking.findById(id)
            .populate("ground", "name")
            .populate("session_id", "name time_from time_to")
            .populate("plan_id", "name amount");

        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        generateDynamicReceipt({
            roll_no: `GB${booking._id.toString().slice(-6)}`,
            receivedFrom: booking.name,
            amount: booking.paid,
            transactions: booking.transactions,
            remarks: `Ground Booking - ${booking.ground_name} - ${booking.session_name} - ${new Date(booking.date).toLocaleDateString()}`
        });

        return res.status(200).json({ message: "Receipt Generated Successfully" });
    } catch (err) {
        logger.error(`GroundBookingReceipt Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// MARK ADDITIONAL PAYMENT
const MarkPaymentGround = async (req, res) => {
    try {
        logger.info("Mark Payment Ground Booking Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id, amount, method = "CASH" } = decryptedData;
        if (!id || !amount) return res.status(400).json({ message: "Booking ID and amount required" });

        const booking = await GroundBooking.findById(id);
        if (!booking || booking.delete) return res.status(404).json({ message: "Booking not found" });

        const paidAmount = Number(amount);
        const newTotalPaid = booking.paid + paidAmount;
        const leftover = newTotalPaid < booking.amount;

        booking.paid = newTotalPaid;
        booking.leftover = leftover;
        booking.payment_type = leftover ? "Partial" : "Paid";

        const tx = {
            amount: paidAmount,
            method,
            date: new Date(),
            pay_for: "GroundBooking"
        };
        booking.transactions.push(tx);
        await booking.save();

        await AddTransactionAdmin(
            new Date(),
            paidAmount,
            "IN",
            `Ground Booking Payment | ${booking.ground_name} | ${booking.name}`,
            booking._id,
            method
        );

        logger.info(`Payment Marked: ₹${paidAmount} for ${booking.name}`);
        return res.status(200).json({
            message: "Payment Marked Successfully",
            data: encryptData({ paid: booking.paid, payment_type: booking.payment_type })
        });
    } catch (err) {
        logger.error(`MarkPaymentGround Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// VIEW ALL GROUND BOOKINGS (MOBILE - 10 per page)
const ViewAllGroundBooking = async (req, res) => {
    try {
        logger.info("View All Ground Bookings (Mobile) Request Received");

        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            logger.error(`Decryption failed: ${error.message}`);
            return res.status(400).json({ message: "Invalid data" });
        }

        logger.info("User Verified Successfully");

        const { page = 1 } = decryptedData;

        const limit = 10;
        const skip = (parseInt(page) - 1) * limit;

        const total = await GroundBooking.countDocuments({
            delete: false,
        });

        const bookings = await GroundBooking.find({
            delete: false,
        })
            .populate("ground", "name")
            .populate("session_id", "name time_from time_to")
            .populate("plan_id", "name amount")
            .sort({ date: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            message: "Ground Bookings Fetched Successfully",
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
        logger.error(`ViewAllGroundBooking Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// const ViewAllGroundBooking = async (req, res) => {
//   try {
//     logger.info("Fetch All Ground Bookings Web Request Received");
//     const result = await validateManagerRequest(req, res);
//     if (result.error) {
//         return res.status(result.status).json({ message: result.message });
//     }
//     let decryptedData;
//     try {
//         decryptedData = decryptData(req.params.data);
//     } catch (error) {
//         logger.error(`Decryption failed: ${error.message}`);
//         return res.status(400).json({ message: "Invalid data" });
//     }
//     logger.info("User Verified Successfully");
//     const { page }=decryptedData;
//
//     const limit = 20;
//     const skip = (parseInt(page) - 1) * limit;
//
//     const totalAdm = await GroundBooking.countDocuments({
//       delete: false,
//     });
//
//     const dt = await GroundBooking.find({
//       delete: false,
//     })
//       .populate("plan_id").populate("session_id").populate("ground")
//       .sort({ date: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();
//
//     // ✅ 5. Send encrypted response
//     return res.status(200).json({
//       message: "Ground Bookings Web Fetched Successfully",
//       data: encryptData({
//         bookings: dt,
//         pagination: {
//           total: totalAdm,
//           current_page: Number(page),
//           total_pages: Math.ceil(totalAdm / limit),
//           per_page: limit,
//         },
//       }),
//     });
//
//   } catch (err) {
//     logger.error(`Error fetching Ground Bookings Web: ${err.message}`);
//     return res.status(500).json({ message: "SERVER ERROR" });
//   }
// };
//
// const ViewGroundBooking = async (req, res) => {
//   try {
//     logger.info("Fetch Ground Booking Request Received");
//     const result = await validateManagerRequest(req, res);
//     if (result.error) {
//         return res.status(result.status).json({ message: result.message });
//     }
//     let decryptedData;
//     try {
//         decryptedData = decryptData(req.params.data);
//     } catch (error) {
//         logger.error(`Decryption failed: ${error.message}`);
//         return res.status(400).json({ message: "Invalid data" });
//     }
//     logger.info("User Verified Successfully");
//     const { id }=decryptedData;
//
//     const dt = await GroundBooking.findOne({
//       delete: false,
//         _id:new mongoose.Types.ObjectId(id)
//
//     })
//       .populate("plan_id").populate("session_id").populate("ground")
//
//     // ✅ 5. Send encrypted response
//     return res.status(200).json({
//       message: "Ground Booking Fetched Successfully",
//       data: encryptData(dt),
//     });
//
//   } catch (err) {
//     logger.error(`Error fetching Ground Bookings: ${err.message}`);
//     return res.status(500).json({ message: "SERVER ERROR" });
//   }
// };
//
// const ViewAllGroundBookingWeb = async (req, res) => {
//   try {
//     logger.info("Fetch All Ground Bookings Request Received");
//     const result = await validateManagerRequest(req, res);
//     if (result.error) {
//         return res.status(result.status).json({ message: result.message });
//     }
//     let decryptedData;
//     try {
//         decryptedData = decryptData(req.params.data);
//     } catch (error) {
//         logger.error(`Decryption failed: ${error.message}`);
//         return res.status(400).json({ message: "Invalid data" });
//     }
//     logger.info("User Verified Successfully");
//     const { page }=decryptedData;
//
//     const limit = 50;
//     const skip = (parseInt(page) - 1) * limit;
//
//     const totalAdm = await GroundBooking.countDocuments({
//       delete: false,
//     });
//
//     const dt = await GroundBooking.find({
//       delete: false,
//     })
//       .populate("plan_id").populate("session_id").populate("ground")
//       .sort({ date: -1 })
//       .skip(skip)
//       .limit(limit)
//       .lean();
//
//     // ✅ 5. Send encrypted response
//     return res.status(200).json({
//       message: "Ground Bookings Fetched Successfully",
//       data: encryptData({
//         bookings: dt,
//         pagination: {
//           total: totalAdm,
//           current_page: Number(page),
//           total_pages: Math.ceil(totalAdm / limit),
//           per_page: limit,
//         },
//       }),
//     });
//
//   } catch (err) {
//     logger.error(`Error fetching Ground Bookings: ${err.message}`);
//     return res.status(500).json({ message: "SERVER ERROR" });
//   }
// };
//
// const DeleteGroundBooking = async (req, res) => {
//     try {
//         logger.info(" Ground Booking Request Received");
//         const result = await validateManagerRequest(req, res);
//         if (result.error) {
//             return res.status(result.status).json({ message: result.message });
//         }
//         let decryptedData;
//         try {
//             decryptedData = decryptData(req.params.data);
//         } catch (error) {
//             logger.error(`Decryption failed: ${error.message}`);
//             return res.status(400).json({ message: "Invalid data" });
//         }
//         logger.info("User Verified Successfully");
//         const {  }=decryptedData;
//
//
//
//         // ✅ 5. Send encrypted response
//         return res.status(200).json({
//             message: "Ground Bookings Fetched Successfully",
//             data: encryptData(),
//         });
//
//     } catch (err) {
//         logger.error(`Error in : ${err.message}`);
//         return res.status(500).json({ message: "SERVER ERROR" });
//     }
// };
//
// const CompleteGroundBooking = async (req, res) => {
//     try {
//         logger.info(" Ground Booking Request Received");
//         const result = await validateManagerRequest(req, res);
//         if (result.error) {
//             return res.status(result.status).json({ message: result.message });
//         }
//         let decryptedData;
//         try {
//             decryptedData = decryptData(req.params.data);
//         } catch (error) {
//             logger.error(`Decryption failed: ${error.message}`);
//             return res.status(400).json({ message: "Invalid data" });
//         }
//         logger.info("User Verified Successfully");
//         const {  }=decryptedData;
//
//
//
//         // ✅ 5. Send encrypted response
//         return res.status(200).json({
//             message: "Ground Bookings Fetched Successfully",
//             data: encryptData(),
//         });
//
//     } catch (err) {
//         logger.error(`Error in : ${err.message}`);
//         return res.status(500).json({ message: "SERVER ERROR" });
//     }
// };
//
// const GroundBookingReceipt = async (req, res) => {
//     try {
//         logger.info(" Ground Booking Request Received");
//         const result = await validateManagerRequest(req, res);
//         if (result.error) {
//             return res.status(result.status).json({ message: result.message });
//         }
//         let decryptedData;
//         try {
//             decryptedData = decryptData(req.params.data);
//         } catch (error) {
//             logger.error(`Decryption failed: ${error.message}`);
//             return res.status(400).json({ message: "Invalid data" });
//         }
//         logger.info("User Verified Successfully");
//         const {  }=decryptedData;
//
//
//
//         // ✅ 5. Send encrypted response
//         return res.status(200).json({
//             message: "Ground Bookings Fetched Successfully",
//             data: encryptData(),
//         });
//
//     } catch (err) {
//         logger.error(`Error in : ${err.message}`);
//         return res.status(500).json({ message: "SERVER ERROR" });
//     }
// };
//
// const MarkPaymentGround = async (req, res) => {
//     try {
//         logger.info(" Ground Booking Request Received");
//         const result = await validateManagerRequest(req, res);
//         if (result.error) {
//             return res.status(result.status).json({ message: result.message });
//         }
//         let decryptedData;
//         try {
//             decryptedData = decryptData(req.params.data);
//         } catch (error) {
//             logger.error(`Decryption failed: ${error.message}`);
//             return res.status(400).json({ message: "Invalid data" });
//         }
//         logger.info("User Verified Successfully");
//         const {  }=decryptedData;
//
//
//
//         // ✅ 5. Send encrypted response
//         return res.status(200).json({
//             message: "Ground Bookings Fetched Successfully",
//             data: encryptData(),
//         });
//
//     } catch (err) {
//         logger.error(`Error in : ${err.message}`);
//         return res.status(500).json({ message: "SERVER ERROR" });
//     }
// };

module.exports ={ AddGroundBooking,EditGroundBooking, ViewGroundBooking, ViewAllGroundBooking,
    ViewAllGroundBookingWeb, DeleteGroundBooking, CompleteGroundBooking, GroundBookingReceipt, MarkPaymentGround};
