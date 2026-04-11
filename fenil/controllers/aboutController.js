const fs = require("fs");
const { validateAdminRequest, validateAdminRequestPost } = require("../../middlewares/adminValidation");
const { encryptData, logger }                            = require("../../utils/enc_dec_admin");
const About      = require("../models/About");
const AboutImage = require("../models/AboutImage");

/* ─────────────────────────────────────────
   Internal helpers
───────────────────────────────────────── */

const safeDeleteFile = (filePath) => {
    if (!filePath) return;
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    catch (e) { logger.warn(`Could not delete file ${filePath}: ${e.message}`); }
};

/** Full default structure — ensures all nested sections always exist */
const DEFAULT_ABOUT = {
    about_section: {
        description: "",
        vision:      "",
        mission:     "",
        goals:       "",
    },
    directorsMessage: {
        intro:      "",
        smallIntro: "",
    },
    founders: {
        foundername: "",
        role:        "",
        description: "",
        image:       "",
    },
    whyChooseUs: {
        points: [],
    },
};

/** Returns the single About document, creating it with full structure if absent. */
const getOrCreateAbout = async () => {
    let doc = await About.findOne();
    if (!doc) {
        doc = await About.create({ about: DEFAULT_ABOUT });
    } else {
        // Patch any missing sections on existing doc (handles old empty docs)
        let patched = false;
        for (const key of Object.keys(DEFAULT_ABOUT)) {
            if (!doc.about[key]) {
                doc.about[key] = DEFAULT_ABOUT[key];
                patched = true;
            }
        }
        if (patched) {
            doc.markModified("about");
            await doc.save();
        }
    }
    return doc;
};

/** Merge live image paths from AboutImage into a plain about object. */
const attachImages = async (aboutObj) => {
    const images = await AboutImage.find({ isActive: true });
    const map    = {};
    images.forEach((img) => { map[img.fieldName] = img.filePath; });

    if (aboutObj.founders)
        aboutObj.founders.image = map.founderImage || aboutObj.founders.image || "";

    return aboutObj;
};

const FIELD_TO_SECTION = {
    founderImage: "founders",
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/about/get/:data
═══════════════════════════════════════════════════════════ */
const GetAbout = async (req, res) => {
    logger.info("GetAbout — request received");
    try {
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const doc       = await getOrCreateAbout();
        const aboutData = doc.toObject();
        aboutData.about = await attachImages(aboutData.about);

        logger.info("GetAbout — success");
        return res.status(200).json({
            success: true,
            message: "About fetched successfully",
            data:    encryptData(aboutData),
        });
    } catch (err) {
        logger.error(`GetAbout error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/about/update/:data
═══════════════════════════════════════════════════════════ */
const UpdateAbout = async (req, res) => {
    logger.info("UpdateAbout — request received");
    try {
        // GET validation — token comes via :data param (double decrypted)
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const { section, fields } = auth.adminData;

        if (!section || !fields || typeof fields !== "object") {
            return res.status(400).json({
                success: false,
                message: "'section' and 'fields' are required in payload",
            });
        }

        const ALLOWED = ["about_section", "directorsMessage", "founders", "whyChooseUs", "all"];
        if (!ALLOWED.includes(section)) {
            return res.status(400).json({
                success: false,
                message: `Invalid section. Allowed: ${ALLOWED.join(", ")}`,
            });
        }

        const doc = await getOrCreateAbout();

        if (section === "all") {
            doc.about = { ...doc.toObject().about, ...fields };
        } else {
            // Safely get existing section — falls back to default if somehow missing
            const existing = doc.about[section]?.toObject
                ? doc.about[section].toObject()
                : (doc.about[section] || DEFAULT_ABOUT[section] || {});

            doc.about[section] = { ...existing, ...fields };
        }

        doc.markModified("about");
        await doc.save();

        const aboutData = doc.toObject();
        aboutData.about = await attachImages(aboutData.about);

        logger.info(`UpdateAbout — section '${section}' updated`);
        return res.status(200).json({
            success: true,
            message: "About updated successfully",
            data:    encryptData(aboutData),
        });
    } catch (err) {
        logger.error(`UpdateAbout error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   POST  /acade360/website/about/upload-image
═══════════════════════════════════════════════════════════ */
const UploadAboutImage = async (req, res) => {
    logger.info("UploadAboutImage — request received");
    try {
        const auth = await validateAdminRequestPost(req, res);
        if (auth.error) {
            Object.values(req.files || {}).forEach((arr) => arr.forEach((f) => safeDeleteFile(f.path)));
            return res.status(auth.status).json({ success: false, message: auth.message });
        }

        const { fieldName } = auth.adminData;
        const VALID_FIELDS  = ["founderImage"];

        if (!fieldName || !VALID_FIELDS.includes(fieldName)) {
            Object.values(req.files || {}).forEach((arr) => arr.forEach((f) => safeDeleteFile(f.path)));
            return res.status(400).json({
                success: false,
                message: `'fieldName' in payload must be one of: ${VALID_FIELDS.join(", ")}`,
            });
        }

        const uploaded = req.files?.[fieldName]?.[0];
        if (!uploaded) {
            return res.status(400).json({
                success: false,
                message: `No file received. Send the image under the form-data key '${fieldName}'`,
            });
        }

        // Delete old image record + disk file
        const old = await AboutImage.findOne({ fieldName });
        if (old) {
            safeDeleteFile(old.filePath);
            await AboutImage.deleteOne({ _id: old._id });
        }

        // Save new image record
        const newImg = await AboutImage.create({
            fieldName,
            section:      FIELD_TO_SECTION[fieldName],
            filePath:     uploaded.path,
            originalName: uploaded.originalname,
            mimeType:     uploaded.mimetype,
        });

        // Sync path into About content doc
        const doc = await getOrCreateAbout();
        if (fieldName === "founderImage") doc.about.founders.image = uploaded.path;
        doc.markModified("about");
        await doc.save();

        logger.info(`UploadAboutImage — '${fieldName}' saved at ${uploaded.path}`);
        return res.status(200).json({
            success: true,
            message: "Image uploaded successfully",
            data:    encryptData({
                fieldName,
                filePath: newImg.filePath,
                imageId:  newImg._id,
            }),
        });
    } catch (err) {
        logger.error(`UploadAboutImage error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/about/images/:data
═══════════════════════════════════════════════════════════ */
const GetAboutImages = async (req, res) => {
    logger.info("GetAboutImages — request received");
    try {
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const images = await AboutImage.find({ isActive: true });

        logger.info("GetAboutImages — success");
        return res.status(200).json({
            success: true,
            message: "Images fetched successfully",
            data:    encryptData(images),
        });
    } catch (err) {
        logger.error(`GetAboutImages error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   POST  /acade360/website/about/delete-image
═══════════════════════════════════════════════════════════ */
const DeleteAboutImage = async (req, res) => {
    logger.info("DeleteAboutImage — request received");
    try {
        const auth = await validateAdminRequestPost(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const { imageId } = auth.adminData;
        if (!imageId) return res.status(400).json({ success: false, message: "'imageId' is required in payload" });

        const image = await AboutImage.findById(imageId);
        if (!image) return res.status(404).json({ success: false, message: "Image not found" });

        safeDeleteFile(image.filePath);
        await AboutImage.deleteOne({ _id: image._id });

        // Clear path in About content doc
        const doc = await getOrCreateAbout();
        if (image.fieldName === "founderImage") doc.about.founders.image = "";
        doc.markModified("about");
        await doc.save();

        logger.info(`DeleteAboutImage — '${image.fieldName}' (${imageId}) deleted`);
        return res.status(200).json({ success: true, message: "Image deleted successfully" });
    } catch (err) {
        logger.error(`DeleteAboutImage error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { GetAbout, UpdateAbout, UploadAboutImage, GetAboutImages, DeleteAboutImage };