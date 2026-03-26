// controllers/bookingSessionController.js
const BoxSessions = require("../../models/harsh/BookingSessions");
const Box = require("../../models/harsh/Booking");
const { encryptData, decryptData, logger } = require("../../utils/enc_dec_m");
const { validateManagerRequest } = require("../../middlewares/managerValidation");

// ADD SESSION
const AddBoxSession = async (req, res) => {
    try {
        logger.info("Add Box Session Request");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try { decryptedData = decryptData(req.params.data); } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { name, time_from, time_to, box_id } = decryptedData;
        if (!name || !time_from || !time_to || !box_id) {
            return res.status(400).json({ message: "All fields required" });
        }

        const box = await Box.findById(box_id);
        if (!box || box.delete) return res.status(404).json({ message: "Box not found" });

        const session = await BoxSessions.create({
            name,
            time_from,
            time_to,
            box: box._id,
            box_name: box.name,
        });

        return res.status(200).json({
            message: "Session Created",
            data: encryptData(session),
        });
    } catch (err) {
        logger.error(`AddBoxSession Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// VIEW ALL SESSIONS
const ViewBoxSessions = async (req, res) => {
    try {
        logger.info("View Box Sessions");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        const sessions = await BoxSessions.find({ delete: false, active: true })
            .populate("box", "name box_no")
            .sort({ time_from: 1 });

        return res.status(200).json({
            message: "Sessions Fetched",
            data: encryptData(sessions),
        });
    } catch (err) {
        logger.error(`ViewBoxSessions Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// EDIT SESSION
const EditBoxSession = async (req, res) => {
    try {
        logger.info("Edit Box Session");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try { decryptedData = decryptData(req.params.data); } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id, name, time_from, time_to, box_id, active } = decryptedData;
        const session = await BoxSessions.findById(id);
        if (!session) return res.status(404).json({ message: "Session not found" });

        if (box_id) {
            const box = await Box.findById(box_id);
            if (!box) return res.status(404).json({ message: "Box not found" });
            session.box = box._id;
            session.box_name = box.name;
        }

        session.name = name || session.name;
        session.time_from = time_from || session.time_from;
        session.time_to = time_to || session.time_to;
        session.active = active !== undefined ? active : session.active;

        await session.save();
        return res.status(200).json({ message: "Session Updated" });
    } catch (err) {
        logger.error(`EditBoxSession Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// DELETE SESSION
const DeleteBoxSession = async (req, res) => {
    try {
        logger.info("Delete Box Session");
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try { decryptedData = decryptData(req.params.data); } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        const session = await BoxSessions.findById(id);
        if (!session) return res.status(404).json({ message: "Session not found" });

        session.delete = true;
        session.active = false;
        await session.save();

        return res.status(200).json({ message: "Session Deleted" });
    } catch (err) {
        logger.error(`DeleteBoxSession Error: ${err.message}`);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

module.exports = { AddBoxSession, ViewBoxSessions, EditBoxSession, DeleteBoxSession };
