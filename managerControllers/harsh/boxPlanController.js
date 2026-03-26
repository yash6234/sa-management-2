// controllers/bookingPlanController.js

const BoxPlans = require("../../models/harsh/BookingPlans");
const BoxSessions = require("../../models/harsh/BookingSessions");
const Box = require("../../models/harsh/Booking");
const { encryptData, decryptData, logger } = require("../../utils/enc_dec_m");
const { validateManagerRequest } = require("../../middlewares/managerValidation");

// ========================
// ADD BOX PLAN
// ========================
const AddBoxPlan = async (req, res) => {
    try {
        logger.info("Add Box Plan Request Received");

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

        const { name, session_id, amount, hours = 1 } = decryptedData;

        if (!name || !session_id || !amount) {
            return res.status(400).json({ message: "Name, session, and amount are required" });
        }

        const session = await BoxSessions.findById(session_id).populate("box");
        if (!session || session.delete || !session.active) {
            logger.error(`Session Not Found or Inactive: ${session_id}`);
            return res.status(404).json({ message: "Session not found or inactive" });
        }

        if (!session.box || session.box.delete) {
            return res.status(404).json({ message: "Associated Box not found" });
        }

        const existingPlan = await BoxPlans.findOne({
            name: new RegExp(`^${name.trim()}$`, "i"),
            session_id,
            delete: false
        });

        if (existingPlan) {
            return res.status(400).json({ message: "Plan with this name already exists for this session" });
        }

        const plan = await BoxPlans.create({
            name,
            session_id: session._id,
            time_from: session.time_from,
            time_to: session.time_to,
            box: session.box._id,
            box_name: session.box.name,
            amount: Number(amount),
            hours: Number(hours),
        });

        logger.info(`New Box Plan Created Successfully - ${name} for Box: ${session.box.name}`);
        return res.status(200).json({
            message: "Box Plan Created Successfully",
            data: encryptData(plan),
        });

    } catch (err) {
        logger.error(`AddBoxPlan Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// VIEW ACTIVE BOX PLANS (For Booking Form)
// ========================
const ViewBoxPlans = async (req, res) => {
    try {
        logger.info("View Active Box Plans Request Received");

        const result = await validateManagerRequest(req, res);
        if (result.error) {
            return res.status(result.status).json({ message: result.message });
        }

        const plans = await BoxPlans.find({ active: true, delete: false })
            .populate({
                path: "session_id",
                select: "name time_from time_to",
                populate: { path: "box", select: "name box_no images" }
            })
            .sort({ createdAt: -1 })
            .lean();

        logger.info("Active Box Plans Fetched Successfully");
        return res.status(200).json({
            message: "Box Plans Fetched Successfully",
            data: encryptData(plans),
        });

    } catch (err) {
        logger.error(`ViewBoxPlans Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// VIEW ALL BOX PLANS (Admin Panel - With Pagination)
// ========================
const ViewAllBoxPlansWeb = async (req, res) => {
    try {
        logger.info("View All Box Plans Web Request Received");

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

        const { page = 1 } = decryptedData;
        const limit = 50;
        const skip = (parseInt(page) - 1) * limit;

        const total = await BoxPlans.countDocuments({ delete: false });

        const plans = await BoxPlans.find({ delete: false })
            .populate({
                path: "session_id",
                select: "name time_from time_to",
                populate: { path: "box", select: "name box_no" }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        return res.status(200).json({
            message: "All Box Plans Fetched Successfully",
            data: encryptData({
                plans,
                pagination: {
                    total,
                    current_page: Number(page),
                    total_pages: Math.ceil(total / limit),
                    per_page: limit,
                },
            }),
        });

    } catch (err) {
        logger.error(`ViewAllBoxPlansWeb Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// EDIT BOX PLAN
// ========================
const EditBoxPlan = async (req, res) => {
    try {
        logger.info("Edit Box Plan Request Received");

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

        const { id, name, session_id, amount, hours, active } = decryptedData;

        if (!id) {
            return res.status(400).json({ message: "Plan ID is required" });
        }

        const existingPlan = await BoxPlans.findById(id);
        if (!existingPlan || existingPlan.delete) {
            logger.error("Box Plan Not Found");
            return res.status(404).json({ message: "Box Plan not found" });
        }

        let updatedFields = {};

        if (name && name !== existingPlan.name) {
            const nameExists = await BoxPlans.findOne({
                name: new RegExp(`^${name.trim()}$`, "i"),
                session_id: session_id || existingPlan.session_id,
                _id: { $ne: id },
                delete: false
            });
            if (nameExists) return res.status(400).json({ message: "Plan name already exists for this session" });
            updatedFields.name = name;
        }

        if (amount !== undefined && Number(amount) !== existingPlan.amount) {
            updatedFields.amount = Number(amount);
        }

        if (hours !== undefined && Number(hours) !== existingPlan.hours) {
            updatedFields.hours = Number(hours);
        }

        if (active !== undefined && active !== existingPlan.active) {
            updatedFields.active = active;
        }

        if (session_id && !existingPlan.session_id.equals(session_id)) {
            const session = await BoxSessions.findById(session_id).populate("box");
            if (!session || session.delete || !session.active) {
                return res.status(404).json({ message: "Session not found or inactive" });
            }

            updatedFields.session_id = session._id;
            updatedFields.time_from = session.time_from;
            updatedFields.time_to = session.time_to;
            updatedFields.box = session.box._id;
            updatedFields.box_name = session.box.name;
        }

        if (Object.keys(updatedFields).length === 0) {
            return res.status(200).json({ message: "No changes detected" });
        }

        await BoxPlans.findByIdAndUpdate(id, updatedFields, { new: true });

        logger.info(`Box Plan Updated Successfully - ID: ${id}`);
        return res.status(200).json({ message: "Box Plan Updated Successfully" });

    } catch (err) {
        logger.error(`EditBoxPlan Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// ========================
// SOFT DELETE BOX PLAN
// ========================
const DeleteBoxPlan = async (req, res) => {
    try {
        logger.info("Delete Box Plan Request Received");

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

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "Plan ID required" });

        const plan = await BoxPlans.findById(id);
        if (!plan || plan.delete) {
            logger.error("Box Plan Not Found");
            return res.status(404).json({ message: "Plan not found" });
        }

        plan.delete = true;
        plan.active = false;
        await plan.save();

        logger.info(`Box Plan Successfully Deleted - ${plan.name}`);
        return res.status(200).json({
            message: `Box Plan Deleted Successfully: ${plan.name}`,
        });

    } catch (err) {
        logger.error(`DeleteBoxPlan Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

module.exports = {
    AddBoxPlan,
    ViewBoxPlans,
    ViewAllBoxPlansWeb,
    EditBoxPlan,
    DeleteBoxPlan,
};
