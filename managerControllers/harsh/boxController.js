const Box = require("../../models/harsh/Booking");
const { encryptData, decryptData, logger } = require("../../utils/enc_dec_m");
const { validateManagerRequest, validateManagerRequestPost } = require("../../middlewares/managerValidation");
const path = require("path");
const fs = require("fs");


function sanitizeFileName(str) {
    return str.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
}

function renameUploadedFile(oldPath, prefix, fieldname) {
    if (!oldPath) return null;
    const uploadDir = "uploads/box";
    const ext = path.extname(oldPath);
    const newName = `${prefix}-${fieldname}${ext}`;
    const newPath = path.join(uploadDir, newName);
    try {
        fs.renameSync(path.join(uploadDir, oldPath), newPath);
        return newName;
    } catch (e) {
        console.log("Rename failed:", e);
        return oldPath;
    }
}

// ADD BOX
const AddBox = async (req, res) => {
    try {
        logger.info('Adding New Box Request Received');
        const result = await validateManagerRequestPost(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { name, box_no, description, capacity = 10, advanced = 300 } = decryptedData;
        if (!name || !box_no) return res.status(400).json({ message: "Name and Box No required" });

        const exists = await Box.findOne({ box_no, delete: false });
        if (exists) return res.status(400).json({ message: "Box No already exists" });

        const images_old = Array.isArray(req.files?.images) ? req.files.images.map(f => f.filename) : [];
        const images = images_old.map((f, i) => renameUploadedFile(f, sanitizeFileName(box_no), `img${i}`));

        const box = await Box.create({ name, box_no, description, capacity, advanced, images });
        logger.info(`Box Created: ${box_no}`);

        return res.status(200).json({ message: 'Box Created Successfully', data: encryptData(box) });
    } catch (err) {
        logger.error(`AddBox Error: ${err.message}`);
        return res.status(500).json({ message: 'SERVER ERROR' });
    }
};

// EDIT BOX
const EditBox = async (req, res) => {
    try {
        logger.info("Edit Box Request Received");
        const result = await validateManagerRequestPost(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, "+");
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { box_id, name, box_no, description, capacity, advanced, removeImages = [] } = decryptedData;
        if (!box_id) return res.status(400).json({ message: "Box ID required" });

        const box = await Box.findById(box_id);
        if (!box || box.delete) return res.status(404).json({ message: "Box not found" });

        if (box_no && box_no !== box.box_no) {
            const exists = await Box.findOne({ box_no, delete: false, _id: { $ne: box_id } });
            if (exists) return res.status(400).json({ message: "Box No already used" });
        }

        let updatedImages = [...box.images];
        if (Array.isArray(removeImages)) {
            for (const img of removeImages) {
                updatedImages = updatedImages.filter(i => i !== img);
                try { fs.unlinkSync(path.join("uploads/box", img)); } catch (e) {}
            }
        }

        const uploaded = Array.isArray(req.files?.images) ? req.files.images.map(f => f.filename) : [];
        const newImages = uploaded.map((f, i) => renameUploadedFile(f, sanitizeFileName(box_no || box.box_no), `img${updatedImages.length + i}`));
        updatedImages = [...updatedImages, ...newImages];

        box.name = name || box.name;
        box.box_no = box_no || box.box_no;
        box.description = description ?? box.description;
        box.capacity = capacity || box.capacity;
        box.advanced = advanced || box.advanced;
        box.images = updatedImages;

        await box.save();
        return res.status(200).json({ message: "Box Updated Successfully" });
    } catch (err) {
        logger.error("EditBox Error: " + err.message);
        return res.status(500).json({ message: "SERVER ERROR" });
    }
};

// VIEW ALL BOXES
const ViewAllBox = async (req, res) => {
    try {
        logger.info('View All Boxes Request');
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        const boxes = await Box.find({ delete: false }).sort({ createdAt: -1 });
        return res.status(200).json({ message: 'Boxes Fetched', data: encryptData(boxes) });
    } catch (err) {
        logger.error(`ViewAllBox Error: ${err.message}`);
        return res.status(500).json({ message: 'SERVER ERROR' });
    }
};

// DELETE BOX (Soft)
const DeleteBox = async (req, res) => {
    try {
        logger.info('Delete Box Request');
        const result = await validateManagerRequest(req, res);
        if (result.error) return res.status(result.status).json({ message: result.message });

        let decryptedData;
        try { decryptedData = decryptData(req.params.data); } catch (error) {
            return res.status(400).json({ message: "Invalid data" });
        }

        const { id } = decryptedData;
        const box = await Box.findById(id);
        if (!box || box.delete) return res.status(404).json({ message: "Box not found" });

        box.delete = true;
        box.active = false;
        await box.save();

        return res.status(200).json({ message: `Box Deleted: ${box.name}` });
    } catch (err) {
        logger.error(`DeleteBox Error: ${err.message}`);
        return res.status(500).json({ message: 'SERVER ERROR' });
    }
};

module.exports = { AddBox, EditBox, ViewAllBox, DeleteBox };
