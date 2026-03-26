const Staff = require("../../models/harsh/Staff");
const { encryptData, decryptData ,logger} = require("../../utils/enc_dec_admin");
const { validateAdminRequest,validateAdminRequestPost } = require("../../middlewares/adminValidation");

const fs = require("fs");
const path = require("path");

function renameUploadedFile(oldPath, rollNo, fieldname) {
    if (!oldPath) return null;

    const uploadDir = "uploads/Staff";

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

// ========================
// ADD STAFF
// ========================
const AddStaff = async (req, res) => {
    let uploadedPhoto = null;

    try {
        logger.info("Add Staff Request Received");

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
        console.log(fullName, phone, date_of_birth, address, gender,uuid);
        if (!fullName || !phone || !gender) {
            return res.status(400).json({ message: "fullName and phone and gender are required" });
        }
        if (uuid) {
            const existingStaff = await Staff.findOne({ uuid, delete: false });
            if (existingStaff) {
                return res.status(400).json({ message: "Staff with this UUID already exists" });
            }
        }
        // Check duplicate phone
        const exists = await Staff.findOne({ phone, delete: false });
        if (exists) return res.status(400).json({ message: "Staff with this phone already exists" });

        // Generate Roll No: STA + YY + 4 digits
        const year = new Date().getFullYear().toString().slice(-2);
        const count = await Staff.countDocuments({});
        const roll_no = `STA${year}${String(count + 1).padStart(3, "0")}`;

        // Handle photo
        const oldFile = req.files?.staff_photo?.[0]?.filename || null;
        const staff_photo = oldFile ? renameUploadedFile(oldFile, roll_no, "staff_photo") : null;
        uploadedPhoto = staff_photo;

        const staff = await Staff.create({
            uuid: uuid || '',
            roll_no,
            fullName,
            gender,
            phone,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
            address: address || "",
            staff_photo
        });

        logger.info(`Staff Added: ${roll_no}`);
        return res.status(200).json({
            message: "Staff Added Successfully",
            data: encryptData(staff)
        });

    } catch (err) {
        logger.error(`AddStaff Error: ${err.message}`);

        // Rollback photo
        if (uploadedPhoto) {
            const filePath = path.join(__dirname, "../../uploads", uploadedPhoto);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// EDIT STAFF
// ========================
const EditStaff = async (req, res) => {
    let oldPhoto = null;

    try {
        logger.info("Edit Staff Request");

        const result = await validateAdminRequestPost(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id,uuid, fullName, phone, date_of_birth, address, active,gender } = decryptedData;
        if (!id) return res.status(400).json({ message: "ID required" });

        const staff = await Staff.findById(id);
        if (!staff || staff.delete) return res.status(404).json({ message: "Staff Not Found" });

        // Phone conflict check
        if (phone && phone !== staff.phone) {
            const exists = await Staff.findOne({ phone, delete: false, _id: { $ne: id } });
            if (exists) return res.status(400).json({ message: "Phone already in use" });
        }

        oldPhoto = staff.staff_photo;
        const newFile = req.files?.staff_photo?.[0]?.filename || null;
        if (newFile) {
            staff.staff_photo = renameUploadedFile(newFile, staff.roll_no, "staff_photo");
        }
        
        staff.uuid = uuid || staff.uuid;
        staff.fullName = fullName || staff.fullName;
        staff.gender = gender || staff.gender;
        staff.phone = phone || staff.phone;
        staff.date_of_birth = date_of_birth ? new Date(date_of_birth) : staff.date_of_birth;
        staff.address = address !== undefined ? address : staff.address;
        staff.active = active !== undefined ? active : staff.active;

        await staff.save();

        // Delete old photo
        if (newFile && oldPhoto) {
            const oldPath = path.join(__dirname, "../../uploads", oldPhoto);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        return res.status(200).json({
            message: "Staff Updated Successfully",
            data: encryptData(staff)
        });

    } catch (err) {
        logger.error(`EditStaff Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// SOFT DELETE STAFF
// ========================
const DeleteStaff = async (req, res) => {
    try {
        logger.info("Delete Staff Request");

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

        const staff = await Staff.findById(id);
        if (!staff || staff.delete) return res.status(404).json({ message: "Staff Not Found" });

        staff.delete = true;
        staff.active = false;
        await staff.save();

        return res.status(200).json({
            message: "Staff Deleted Successfully",
            data: encryptData({ success: true })
        });

    } catch (err) {
        logger.error(`DeleteStaff Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// VIEW ALL STAFF (NO PAGINATION)
// ========================
const ViewAllStaff = async (req, res) => {
    try {
        logger.info("View All Staff Request");

        const result = await validateAdminRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        const staff = await Staff.find({ delete: false })
            .sort({ createdAt: -1 })
            .select("roll_no fullName gender phone active staff_photo date_of_birth address")
            .lean();

        return res.status(200).json({
            message: "All Staff Fetched",
            data: encryptData({ staff })
        });

    } catch (err) {
        logger.error(`ViewAllStaff Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

// ========================
// VIEW SINGLE STAFF
// ========================

const ViewSingleStaff = async (req, res) => {
    try {
        logger.info("View Single Staff");

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

        const staff = await Staff.findOne({ _id: id, delete: false });
        if (!staff) return res.status(404).json({ message: "Staff Not Found" });

        return res.status(200).json({
            message: "Staff Details",
            data: encryptData(staff)
        });

    } catch (err) {
        logger.error(`ViewSingleStaff Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};


// ========================
// Mark Active or Inactive
// ========================

const ToggleStaffActiveStatus = async (req, res) => {
    try {
        logger.info("Toggle Staff Active Status Request");

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

        const staff = await Staff.findById(id);
        if (!staff || staff.delete) return res.status(404).json({ message: "Staff Not Found" });
        
        if (staff.active == true) {
            staff.active = false;
        } else {
            staff.active = true;
        }

        await staff.save();

        return res.status(200).json({
            message: `Staff is now ${staff.active ? "Active" : "Inactive"}`,
            data: encryptData(staff)
        });

    } catch (err) {
        logger.error(`ToggleStaffActiveStatus Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
}

// ========================
// SEARCH STAFF
// ========================
const SearchStaff = async (req, res) => {
    try {
        logger.info("Search Staff Request");

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

        const staff = await Staff.find({
            delete: false,
            $or: [
                { uuid: regex },
                { fullName: regex },
                { gender: regex },
                { phone: regex },
                { roll_no: regex }
            ]
        }).sort({ createdAt: -1 }).lean();

        return res.status(200).json({
            message: "Search Results",
            data: encryptData({ staff })
        });

    } catch (err) {
        logger.error(`SearchStaff Error: ${err.message}`);
        return res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    AddStaff,
    EditStaff,
    DeleteStaff,
    ViewAllStaff,
    ViewSingleStaff,
    SearchStaff,
    ToggleStaffActiveStatus
};
