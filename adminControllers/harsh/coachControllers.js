const Coach = require("../../models/harsh/Coach");
const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_admin");
const { validateAdminRequest,validateAdminRequestPost } = require("../../middlewares/adminValidation");

const fs = require("fs");
const path = require("path");

function renameUploadedFile(oldPath, rollNo, fieldname) {
    if (!oldPath) return null;

    const uploadDir = "uploads/Coach";

    const ext = path.extname(oldPath);
    const newName = `${rollNo}-${fieldname}${ext}`;
    const newPath = path.join(uploadDir, newName);

    try {
        fs.renameSync(path.join(uploadDir, oldPath), newPath);
        return newName;
    } catch (e) {
        console.log("Rename failed:", e);
        return oldPath;
    }
}
const AddCoach = async (req, res) => {
    let uploadedPhoto = null;
    console.log(req.files)

    try {
        logger.info("Add Coach Request Received");

        const result = await validateAdminRequestPost(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { uuid,fullName, phone, date_of_birth, address, gender } = decryptedData;

        //  if uuid number is exist then return error
        if (uuid) {
            const existingCoach = await Coach.findOne({ uuid, delete: false });
            if (existingCoach) {
                return res.status(400).json({ message: "Coach with this UUID already exists" });
            }
        }
        if (!fullName || !phone || !gender) {
            return res.status(400).json({ message: "fullName and phone and gender are required" });
        }

        // Check duplicate phone
        const exists = await Coach.findOne({ phone, delete: false });
        if (exists) return res.status(400).json({ message: "Coach with this phone already exists" });

        // Generate Roll No: COA + YY + 4 digits
        const year = new Date().getFullYear().toString().slice(-2);
        const count = await Coach.countDocuments({});
        const roll_no = `COA${year}${String(count + 1).padStart(3, "0")}`;
        console.log("Generated Roll No:", roll_no);

        // Handle photo upload
        const oldFile = req.files?.coach_photo?.[0]?.filename || null;
        console.log("Uploaded Photo Filename:", oldFile);
        const coach_photo = oldFile ? renameUploadedFile(oldFile, roll_no, "coach_photo") : null;
        console.log("Renamed Photo Filename:", coach_photo);
        uploadedPhoto = coach_photo;

        const coach = await Coach.create({
            uuid: uuid || '',
            roll_no,
            fullName,
            gender,
            phone,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
            address: address || "",
            coach_photo
        });

        logger.info(`Coach Added Successfully: ${roll_no}`);
        return res.status(200).json({
            message: "Coach Added Successfully",
            data: encryptData(coach)
        });

    } catch (err) {
        logger.error(`AddCoach Error: ${err.message}`);

        // Rollback: delete uploaded photo
        if (uploadedPhoto) {
            const filePath = path.join(__dirname, "../../uploads", uploadedPhoto);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// EDIT COACH
// ========================
const EditCoach = async (req, res) => {
    let oldPhoto = null;

    try {
        logger.info("Edit Coach Request");

        const result = await validateAdminRequestPost(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }


        const { id, uuid,fullName, phone, date_of_birth, address, active, gender } = decryptedData;
        if (!id) return res.status(400).json({ message: "ID required" });
        if (uuid) {
            const existingCoach = await Coach.findOne({ uuid, delete: false });
            if (existingCoach) {
                return res.status(400).json({ message: "Coach with this UUID already exists" });
            }
        }
        const coach = await Coach.findById(id);
        if (!coach || coach.delete) return res.status(404).json({ message: "Coach Not Found" });

        // Phone conflict check
        if (phone && phone !== coach.phone) {
            const exists = await Coach.findOne({ phone, delete: false, _id: { $ne: id } });
            if (exists) return res.status(400).json({ message: "Phone already in use by another coach" });
        }

        oldPhoto = coach.coach_photo;
        const newFile = req.files?.coach_photo?.[0]?.filename || null;
        if (newFile) {
            coach.coach_photo = renameUploadedFile(newFile, coach.roll_no, "coach_photo");
        }

        coach.uuid = uuid || coach.uuid;
        coach.fullName = fullName || coach.fullName;
        coach.gender = gender || coach.gender;
        coach.phone = phone || coach.phone;
        coach.date_of_birth = date_of_birth ? new Date(date_of_birth) : coach.date_of_birth;
        coach.address = address !== undefined ? address : coach.address;
        coach.active = active !== undefined ? active : coach.active;

        await coach.save();

        // Delete old photo if replaced
        if (newFile && oldPhoto) {
            const oldPath = path.join(__dirname, "../../uploads", oldPhoto);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        return res.status(200).json({
            message: "Coach Updated Successfully",
            data: encryptData(coach)
        });

    } catch (err) {
        logger.error(`EditCoach Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// SOFT DELETE COACH
// ========================
const DeleteCoach = async (req, res) => {
    try {
        logger.info("Delete Coach Request");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "ID required" });

        const coach = await Coach.findById(id);
        if (!coach || coach.delete) return res.status(404).json({ message: "Coach Not Found" });

        coach.delete = true;
        coach.active = false;
        await coach.save();

        return res.status(200).json({
            message: "Coach Deleted Successfully",
            data: encryptData({ success: true })
        });

    } catch (err) {
        logger.error(`DeleteCoach Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};
// ========================
// Mark Active or Inactive
// ========================

const ToggleCoachActiveStatus = async (req, res) => {
    try {
        logger.info("Toggle Coach Active Status Request");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id} = decryptedData;
        console.log("Toggle Active Status Data:", id);
        if (!id === undefined) return res.status(400).json({ message: "ID and active status required" });

        const coach = await Coach.findById(id);
        if (!coach || coach.delete) return res.status(404).json({ message: "Coach Not Found" });

        if (coach.active == true) {
            coach.active = false;
        } else {
            coach.active = true;
        }
        await coach.save();

        return res.status(200).json({
            message: `Coach marked as ${ coach.active ? "Active" : "Inactive"} successfully`,
            data: encryptData(coach)
        });

    } catch (err) {
        logger.error(`ToggleCoachActiveStatus Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
}

// ========================
// VIEW ALL COACHES (NO PAGINATION)
// ========================
const ViewAllCoach = async (req, res) => {
    try {
        logger.info("View All Coaches Request");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        const coaches = await Coach.find({ delete: false })
            .sort({ createdAt: -1 })
            .select("roll_no fullName gender phone active coach_photo date_of_birth address")
            .lean();

        return res.status(200).json({
            message: "All Coaches Fetched",
            data: encryptData({ coaches })
        });

    } catch (err) {
        logger.error(`ViewAllCoach Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// VIEW SINGLE COACH
// ========================
const ViewSingleCoach = async (req, res) => {
    try {
        logger.info("View Single Coach");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        if (!id) return res.status(400).json({ message: "ID required" });

        const coach = await Coach.findOne({ _id: id, delete: false });
        if (!coach) return res.status(404).json({ message: "Coach Not Found" });

        return res.status(200).json({
            message: "Coach Details",
            data: encryptData(coach)
        });

    } catch (err) {
        logger.error(`ViewSingleCoach Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// SEARCH COACH
// ========================
const SearchCoach = async (req, res) => {
    try {
        logger.info("Search Coach Request");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            decryptedData = decryptData(req.params.data);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { search = "" } = decryptedData;
        const regex = new RegExp(search, "i");

        const coaches = await Coach.find({
            delete: false,
            $or: [
                { fullName: regex },
                { gender: regex },
                { phone: regex },
                { roll_no: regex }
            ]
        })
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            message: "Search Results",
            data: encryptData({ coaches })
        });

    } catch (err) {
        logger.error(`SearchCoach Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    AddCoach,
    EditCoach,
    DeleteCoach,
    ViewAllCoach,
    ViewSingleCoach,
    SearchCoach,
    ToggleCoachActiveStatus,
};
