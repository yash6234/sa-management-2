const Home = require('../models/Home');
const AboutAcademy = require('../models/AboutAcademy');
const AdmissionsPage = require('../models/AdmissionsPage');
const GalleryPage = require('../models/GalleryPage');
const PlaygroundPage = require('../models/PlaygroundPage');
const ProgramsPage = require('../models/ProgramsPage');
const ContactPage = require('../models/ContactPage');
const Footer = require('../models/Footer');

const { validateAdminRequest } = require("../../middlewares/adminValidation");
const { logger } = require("../../utils/enc_dec_admin");

const models = {
    home: Home,
    about: AboutAcademy,
    admissions: AdmissionsPage,
    gallery: GalleryPage,
    playground: PlaygroundPage,
    programs: ProgramsPage,
    contact: ContactPage,
    footer: Footer
};

const EXCLUDED_FIELDS = ['_id', 'isActive', 'createdAt', 'updatedAt', '__v', 'id'];

/**
 * Normalizes section name for better display (e.g. whyChooseUs -> Why Choose Us)
 */
const formatName = (str) => {
    if (!str) return '';
    const result = str.replace(/([A-Z])/g, ' $1');
    return result.charAt(0).toUpperCase() + result.slice(1);
};

exports.getPageDataSectionWise = async (req, res) => {
    try {
        logger.info('Admin Request Received for Get Page Data Section Wise');
        
        // 1. Validate Admin (Pattern: /acade360/admin/sections/view/:data)
        // This validates the academy status, user status, and token.
        const valResult = await validateAdminRequest(req, res);
        if (valResult.error) {
            return res.status(valResult.status).json({ message: valResult.message });
        }

        // 2. Extract pageName from decrypted adminData
        // valResult.adminData is the second-level decrypted object: { token, id, email, pageName, ... }
        const { pageName } = valResult.adminData || {};
        
        if (!pageName) {
            return res.status(400).json({ 
                success: false, 
                message: 'pageName is required in the encrypted adminData payload' 
            });
        }

        const normalizedPage = pageName.toLowerCase();
        const Model = models[normalizedPage];

        if (!Model) {
            return res.status(404).json({
                success: false,
                message: `Page model for '${pageName}' not found. Available pages: ${Object.keys(models).join(', ')}`
            });
        }

        let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) {
            doc = await Model.create({ isActive: true });
        }

        const docObj = doc.toJSON ? doc.toJSON() : doc.toObject();
        const responseData = {
            page: pageName,
            pageTitle: formatName(pageName),
            sections: []
        };

        for (const [key, value] of Object.entries(docObj)) {
            if (EXCLUDED_FIELDS.includes(key)) continue;

            responseData.sections.push({
                sectionId: key,
                displayName: formatName(key),
                content: value
            });
        }

        res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (err) {
        logger.error(`Error in getPageDataSectionWise: ${err.message}`);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

exports.getAvailablePages = async (req, res) => {
    try {
        logger.info('Admin Request Received for List Available Pages');
        
        // 1. Validate Admin (Pattern: /acade360/admin/sections/list/:data)
        const valResult = await validateAdminRequest(req, res);
        if (valResult.error) {
            return res.status(valResult.status).json({ message: valResult.message });
        }

        const pages = Object.keys(models).map(key => ({
            id: key,
            name: formatName(key)
        }));

        res.status(200).json({
            success: true,
            count: pages.length,
            pages
        });
    } catch (err) {
        logger.error(`Error in getAvailablePages: ${err.message}`);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
};

const toDotPath = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
};

const setNested = (obj, path, value) => {
    const parts = toDotPath(path).split('.').filter(Boolean);
    if (parts.length === 0) return;
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};

const getUploadedFiles = (req) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) files.push(...req.files);
        else files.push(...Object.values(req.files).flat());
    }
    return files;
};

exports.updatePageSection = async (req, res) => {
    try {
        logger.info('Admin Request Received to Update Page Section');
        const { validateAdminRequestPost } = require("../../middlewares/adminValidation");

        // 1. Validate Admin
        const valResult = await validateAdminRequestPost(req, res);
        if (valResult.error) {
            return res.status(valResult.status).json({ message: valResult.message });
        }

        // 2. Decrypt Payload
        let decryptedData;
        try {
            const fixedCipher = decodeURIComponent(req.body.data).replace(/ /g, '+');
            decryptedData = decryptData(fixedCipher);
        } catch (error) {
            logger.error(`Decryption failed in updatePageSection: ${error.message}`);
            return res.status(400).json({ message: "Invalid data payload" });
        }

        const { pageName, sectionId, ...payload } = decryptedData || {};
        if (!pageName || !sectionId) {
            return res.status(400).json({ success: false, message: 'pageName and sectionId are required' });
        }

        const normalizedPage = pageName.toLowerCase();
        const Model = models[normalizedPage];
        if (!Model) {
            return res.status(404).json({ success: false, message: `Page model '${pageName}' not found.` });
        }

        let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) doc = await Model.create({ isActive: true });

        const updateData = {};

        // Merge textual payload
        for (const [key, value] of Object.entries(payload || {})) {
            setNested(updateData, key, value);
        }

        // Merge uploaded files
        for (const file of getUploadedFiles(req)) {
            setNested(updateData, file.fieldname, file.filename);
        }

        // Flatten object and update mongoose model dynamically using dot notation
        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, key) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + key;

                if (obj[key] === null) {
                    acc[fullPath] = null;
                } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    Object.assign(acc, flattenObject(obj[key], fullPath));
                } else {
                    acc[fullPath] = obj[key];
                }
                return acc;
            }, {});
        };

        const flattenedUpdates = flattenObject(updateData, sectionId);
        let modificationsMade = false;

        for (const [path, value] of Object.entries(flattenedUpdates)) {
            // Apply proper Mongoose modifications securely
            if (value === null) {
                doc.set(path, undefined);
            } else {
                doc.set(path, value);
            }
            doc.markModified(path);
            modificationsMade = true;
        }

        if (modificationsMade) {
            await doc.save();
        }

        res.status(200).json({
            success: true,
            message: `Section '${sectionId}' on page '${pageName}' updated successfully`,
            data: doc[sectionId]
        });

    } catch (err) {
        logger.error(`Error in updatePageSection: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deletePageSection = async (req, res) => {
    try {
        logger.info('Admin Request Received to Delete/Reset Page Section');

        // 1. Validate Admin (Pattern: /acade360/admin/sections/delete/:data)
        const valResult = await validateAdminRequest(req, res);
        if (valResult.error) {
            return res.status(valResult.status).json({ message: valResult.message });
        }

        const { pageName, sectionId } = valResult.adminData || {};
        if (!pageName || !sectionId) {
            return res.status(400).json({ success: false, message: 'pageName and sectionId are required' });
        }

        const normalizedPage = pageName.toLowerCase();
        const Model = models[normalizedPage];
        if (!Model) return res.status(404).json({ success: false, message: `Page model '${pageName}' not found.` });

        let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) return res.status(404).json({ success: false, message: `Document not found.` });

        // Unset the entire section from the document
        doc.set(sectionId, undefined);
        doc.markModified(sectionId);
        await doc.save();

        res.status(200).json({
            success: true,
            message: `Section '${sectionId}' on page '${pageName}' has been successfully reset.`
        });
    } catch (err) {
        logger.error(`Error in deletePageSection: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
};
