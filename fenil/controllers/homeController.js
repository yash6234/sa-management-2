const fs   = require("fs");
const { validateAdminRequest, validateAdminRequestPost } = require("../../middlewares/adminValidation");
const { encryptData, logger }                            = require("../../utils/enc_dec_admin");
const Home      = require("../models/Home");
const HomeImage = require("../models/HomeImage");

/* ─────────────────────────────────────────
   Internal helpers
───────────────────────────────────────── */

const safeDeleteFile = (filePath) => {
    if (!filePath) return;
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    catch (e) { logger.warn(`Could not delete file ${filePath}: ${e.message}`); }
};

/** Returns the single Home document, creating it if absent. */
const getOrCreateHome = async () => {
    let doc = await Home.findOne();
    if (!doc) doc = await Home.create({ home: {} });
    return doc;
};

/** Merge live image paths from HomeImage into a plain home object. */
const attachImages = async (homeObj) => {
    const images = await HomeImage.find({ isActive: true });
    const map    = {};
    images.forEach((img) => { map[img.fieldName] = img.filePath; });

    if (homeObj.hero_section)    homeObj.hero_section.heroImage       = map.heroImage     || homeObj.hero_section.heroImage    || "";
    if (homeObj.welcome_section) homeObj.welcome_section.welcomeImage = map.welcomeImage  || homeObj.welcome_section.welcomeImage || "";
    if (homeObj.programPanel)    homeObj.programPanel.programImage    = map.programImage  || homeObj.programPanel.programImage   || "";

    return homeObj;
};

const FIELD_TO_SECTION = {
    heroImage:    "hero_section",
    welcomeImage: "welcome_section",
    programImage: "programPanel",
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/home/get/:data
   — fetch full home content
═══════════════════════════════════════════════════════════ */
const GetHome = async (req, res) => {
    logger.info("GetHome — request received");
    try {
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const doc      = await getOrCreateHome();
        const homeData = doc.toObject();
        homeData.home  = await attachImages(homeData.home);

        logger.info("GetHome — success");
        return res.status(200).json({
            success: true,
            message: "Home fetched successfully",
            data:    encryptData(homeData),
        });
    } catch (err) {
        logger.error(`GetHome error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/home/update/:data
   — update any section's JSON fields (no file upload)
   ─────────────────────────────────────────────────────────
   Decrypted payload must include:
   {
     token, id, mobile_no, email,         ← admin auth
     "section": "hero_section"
               | "welcome_section"
               | "programPanel"
               | "instagramPosts"
               | "testimonials"
               | "all",
     "fields": { ...only the keys to update }
   }

   Examples:
     Update hero title only:
       { ...creds, section: "hero_section", fields: { title: "New Title" } }

     Replace all testimonials:
       { ...creds, section: "testimonials", fields: [{ quote: "...", parentName: "...", relation: "..." }] }

     Replace instagram posts:
       { ...creds, section: "instagramPosts", fields: [{ url: "https://..." }] }

   Response: full updated home document (encrypted)
═══════════════════════════════════════════════════════════ */
const UpdateHome = async (req, res) => {
    logger.info("UpdateHome — request received");
    try {
        // GET validation — token comes via :data param (double decrypted)
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const { section, fields } = auth.adminData;

        if (!section || !fields || typeof fields !== "object") {
            return res.status(400).json({ success: false, message: "'section' and 'fields' are required in payload" });
        }

        const ALLOWED = ["hero_section", "welcome_section", "programPanel", "instagramPosts", "testimonials", "all"];
        if (!ALLOWED.includes(section)) {
            return res.status(400).json({ success: false, message: `Invalid section. Allowed: ${ALLOWED.join(", ")}` });
        }

        const doc = await getOrCreateHome();

        if (section === "all") {
            doc.home = { ...doc.toObject().home, ...fields };
        } else if (section === "instagramPosts" || section === "testimonials") {
            doc.home[section] = Array.isArray(fields) ? fields : fields[section];
        } else {
            const existing = doc.home[section]?.toObject
                ? doc.home[section].toObject()
                : (doc.home[section] || {});
            doc.home[section] = { ...existing, ...fields };
        }

        doc.markModified("home");
        await doc.save();

        const homeData = doc.toObject();
        homeData.home  = await attachImages(homeData.home);

        logger.info(`UpdateHome — section '${section}' updated`);
        return res.status(200).json({
            success: true,
            message: "Home updated successfully",
            data:    encryptData(homeData),
        });
    } catch (err) {
        logger.error(`UpdateHome error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   POST  /acade360/website/home/upload-image
   — upload / replace a single image (multipart/form-data)
   ─────────────────────────────────────────────────────────
   Form fields:
     data        (text) — encrypted payload including fieldName
     <fieldName> (file) — file field name must match fieldName value

   Decrypted payload must include:
   { token, id, mobile_no, email, fieldName: "heroImage"|"welcomeImage"|"programImage" }
═══════════════════════════════════════════════════════════ */
const UploadHomeImage = async (req, res) => {
    logger.info("UploadHomeImage — request received");
    try {
        const auth = await validateAdminRequestPost(req, res);
        if (auth.error) {
            Object.values(req.files || {}).forEach((arr) => arr.forEach((f) => safeDeleteFile(f.path)));
            return res.status(auth.status).json({ success: false, message: auth.message });
        }

        const { fieldName } = auth.adminData;
        const VALID_FIELDS  = ["heroImage", "welcomeImage", "programImage"];

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
        const old = await HomeImage.findOne({ fieldName });
        if (old) {
            safeDeleteFile(old.filePath);
            await HomeImage.deleteOne({ _id: old._id });
        }

        // Save new record
        const newImg = await HomeImage.create({
            fieldName,
            section:      FIELD_TO_SECTION[fieldName],
            filePath:     uploaded.path,
            originalName: uploaded.originalname,
            mimeType:     uploaded.mimetype,
        });

        // Sync path into Home content doc
        const doc = await getOrCreateHome();
        if (fieldName === "heroImage")    doc.home.hero_section.heroImage       = uploaded.path;
        if (fieldName === "welcomeImage") doc.home.welcome_section.welcomeImage = uploaded.path;
        if (fieldName === "programImage") doc.home.programPanel.programImage    = uploaded.path;
        doc.markModified("home");
        await doc.save();

        logger.info(`UploadHomeImage — '${fieldName}' saved at ${uploaded.path}`);
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
        logger.error(`UploadHomeImage error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   GET  /acade360/website/home/images/:data
   — fetch image records only
═══════════════════════════════════════════════════════════ */
const GetHomeImages = async (req, res) => {
    logger.info("GetHomeImages — request received");
    try {
        const auth = await validateAdminRequest(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const images = await HomeImage.find({ isActive: true });

        logger.info("GetHomeImages — success");
        return res.status(200).json({
            success: true,
            message: "Images fetched successfully",
            data:    encryptData(images),
        });
    } catch (err) {
        logger.error(`GetHomeImages error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

/* ═══════════════════════════════════════════════════════════
   POST  /acade360/website/home/delete-image
   — delete one image by imageId
   ─────────────────────────────────────────────────────────
   Decrypted payload must include:
   { token, id, mobile_no, email, imageId: "<HomeImage _id>" }
═══════════════════════════════════════════════════════════ */
const DeleteHomeImage = async (req, res) => {
    logger.info("DeleteHomeImage — request received");
    try {
        const auth = await validateAdminRequestPost(req, res);
        if (auth.error) return res.status(auth.status).json({ success: false, message: auth.message });

        const { imageId } = auth.adminData;
        if (!imageId) return res.status(400).json({ success: false, message: "'imageId' is required in payload" });

        const image = await HomeImage.findById(imageId);
        if (!image) return res.status(404).json({ success: false, message: "Image not found" });

        safeDeleteFile(image.filePath);
        await HomeImage.deleteOne({ _id: image._id });

        // Clear path in Home content doc
        const doc = await getOrCreateHome();
        if (image.fieldName === "heroImage")    doc.home.hero_section.heroImage       = "";
        if (image.fieldName === "welcomeImage") doc.home.welcome_section.welcomeImage = "";
        if (image.fieldName === "programImage") doc.home.programPanel.programImage    = "";
        doc.markModified("home");
        await doc.save();

        logger.info(`DeleteHomeImage — '${image.fieldName}' (${imageId}) deleted`);
        return res.status(200).json({ success: true, message: "Image deleted successfully" });
    } catch (err) {
        logger.error(`DeleteHomeImage error: ${err}`);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

module.exports = { GetHome, UpdateHome, UploadHomeImage, GetHomeImages, DeleteHomeImage };