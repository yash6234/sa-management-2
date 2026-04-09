const Home = require('../models/Home');
const AboutAcademy = require('../models/AboutAcademy');
const AdmissionsPage = require('../models/AdmissionsPage');
const GalleryPage = require('../models/GalleryPage');
const { saveBase64Image } = require('../utils/fileUtils');
const { decryptData: decryptCryptoJS } = require('../utils/encryption');
const PlaygroundPage = require('../models/PlaygroundPage');
const ProgramsPage = require('../models/ProgramsPage');
const ContactPage = require('../models/ContactPage');
const Footer = require('../models/Footer');

const { logger, decryptData } = require("../../utils/enc_dec_admin");

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

const parseJsonIfLikely = (value) => {
    if (typeof value !== 'string' || value === '') return value;
    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) && !(trimmed.startsWith('[') && trimmed.endsWith(']'))) return value;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parseJsonIfLikely(parsed); // Recursive unescape
        return parsed;
    } catch {
        return value;
    }
};

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
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
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        // Validation handled by middlewareAdmin

        // 2. Extract pageName from query params
        const { pageName } = req.query;

        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'pageName is required in query params'
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
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        // Validation handled by middlewareAdmin

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
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        // Validation handled by middlewareAdminPost

        // 2. Extract context from body
        const { pageName, sectionId } = req.body;
        if (!pageName || !sectionId) {
            return res.status(400).json({ success: false, message: 'pageName and sectionId are required' });
        }

        const normalizedPage = pageName.toLowerCase();
        const Model = models[normalizedPage];
        if (!Model) return res.status(404).json({ success: false, message: `Model '${pageName}' not found` });

        let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) doc = await Model.create({ isActive: true });

        // 3. Process Payload: Parse JSON and unwrap 'body' if present
        const updateData = {};
        for (let [key, val] of Object.entries(req.body)) {
            if (['pageName', 'sectionId'].includes(key)) continue;
            val = (typeof val === 'string') ? parseJsonIfLikely(val) : val;
            setNested(updateData, key, val);
        }

        // Handle 'body' wrapper
        if (isPlainObject(updateData.body)) {
            const bodyContent = updateData.body;
            delete updateData.body;
            Object.assign(updateData, bodyContent);
        }

        // 4. Merge uploaded files
        for (const file of getUploadedFiles(req)) {
            setNested(updateData, file.fieldname, file.filename);
        }

        // 5. Flatten and Apply to Mongoose
const processImageFields = (data, imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo', 'icon', 'photo', 'avatar', 'src', 'banner']) => {
    if (data !== null && typeof data === 'object') {
        const result = { ...data };
        for (const key in result) {
            if (result.hasOwnProperty(key)) {
                const value = result[key];
                
                // 1. Handle base64 images
                if (imageFields.includes(key) && typeof value === 'string' && value.startsWith('data:image')) {
                    const savedPath = saveBase64Image(value);
                    if (savedPath) result[key] = savedPath;
                } 
                // 2. Handle CryptoJS encrypted paths (starts with 'U2FsdGVkX1')
                else if (typeof value === 'string' && value.startsWith('U2FsdGVkX1')) {
                    try {
                        let decrypted = decryptCryptoJS(value);
                        
                        // Fallback to ROOT secret
                        if (!decrypted && process.env.ENCRYPTION_SECRET) {
                            const CryptoJS = require('crypto-js');
                            try {
                                const bytes = CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_SECRET);
                                const raw = bytes.toString(CryptoJS.enc.Utf8);
                                if (raw) {
                                    try { decrypted = JSON.parse(raw); } catch { decrypted = raw; }
                                }
                            } catch (e) { }
                        }

                        if (decrypted) {
                            if (typeof decrypted === 'string') {
                                result[key] = decrypted;
                            } else if (decrypted && typeof decrypted === 'object') {
                                result[key] = decrypted.url || decrypted.path || decrypted.filename || value;
                            }
                        }
                    } catch (err) { }
                }
                // 3. Recurse
                else if (typeof value === 'object' && value !== null) {
                    result[key] = processImageFields(value, imageFields);
                }
            }
        }
        return result;
    }
    return data;
};

        const processedData = processImageFields(updateData);

        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, k) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + k;
                const value = obj[k];
                if (value === null) {
                    acc[fullPath] = null;
                } else if (isPlainObject(value)) {
                    Object.assign(acc, flattenObject(value, fullPath));
                } else {
                    acc[fullPath] = value;
                }
                return acc;
            }, {});
        };

        const flattenedUpdates = flattenObject(processedData, sectionId);
        logger.info(`Updating paths for ${sectionId}: ${Object.keys(flattenedUpdates).join(', ')}`);

        const normalizeDuplicatedSectionPrefix = (section, path) => {
            const prefix = section + '.';
            if (path.startsWith(prefix + prefix)) {
                return path.substring(prefix.length);
            }
            return path;
        };

        let modificationsMade = false;
        for (let [path, value] of Object.entries(flattenedUpdates)) {
            path = normalizeDuplicatedSectionPrefix(sectionId, path);
            doc.set(path, value === null ? undefined : value);
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
        try {
            const encryptedData = req.params.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        // Validation handled by middlewareAdminPost

        // 2. Extract pageName and sectionId from query params
        const { pageName, sectionId } = req.query;
        if (!pageName || !sectionId) {
            return res.status(400).json({ success: false, message: 'pageName and sectionId are required in query params' });
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
