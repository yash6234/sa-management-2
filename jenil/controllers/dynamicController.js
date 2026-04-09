const mongoose = require('../utils/mongoose');
const { logger, decryptData } = require("../../utils/enc_dec_admin");

const models = {
    home: require('../models/Home'),
    about: require('../models/AboutAcademy'),
    admissions: require('../models/AdmissionsPage'),
    gallery: require('../models/GalleryPage'),
    playground: require('../models/PlaygroundPage'),
    programs: require('../models/ProgramsPage'),
    contact: require('../models/ContactPage'),
    footer: require('../models/Footer')
};

// Map of user-friendly names to actual schema field names
const fieldMap = {
    'background': 'backgroundImage',
    'image': 'image',
    'icon': 'icon',
    'photo': 'image',
    'title': 'title',
    'subtitle': 'subtitle',
    'desc': 'description',
    'programs-facilities': 'programsAndFacilities',
    'tournaments': 'tournamentsSection',
    'social': 'socialSection',
    'message': 'directorsMessage',
    'intro': 'introSection',
    'moments': 'trainingMoments',
    'grid': 'galleryGrid',
    'residence': 'residential',
    'boarding': 'dayBoarding',
    'infra': 'infrastructure',
    'food': 'nutrition',
    'expect': 'whatToExpect'
};
exports.dispatchedHandler = async (req, res, next) => {
    try {
        const { page } = req.params;
        if (!page || !models[page.toLowerCase()]) {
            return next(); // Not a Jenil-managed page, let the main backend handle it
        }

        if (req.method === 'GET') return await exports.getDynamic(req, res, next);
        if (req.method === 'PUT' || req.method === 'POST') return await exports.updateDynamic(req, res, next);
        res.status(405).json({ success: false, error: 'Method not allowed' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateDynamic = async (req, res, next) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        // The path captured manually from req.path (stripped of mount prefix)
        const { page } = req.params;
        const rawPath = req.path || "";

        const Model = models[page.toLowerCase()];
        if (!Model) return next();

        let pathParts = rawPath.split('/').filter(s => s && s !== 'update' && s !== 'add');
        // Map segments if they are in fieldMap
        pathParts = pathParts.map(part => fieldMap[part] || part);

        const fullPath = pathParts.join('.');

        // Disable removed legacy sections (About -> values)
        if (page.toLowerCase() === 'about' && (fullPath === 'values' || fullPath.startsWith('values.'))) {
            return res.status(404).json({ success: false, error: 'Path not found' });
        }

        let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) doc = await Model.create({ isActive: true });

        const isAdd = rawPath.endsWith('/add');
        let updateValue;

        if (req.file) {
            updateValue = req.file.filename;
        } else if (req.files && req.files.length > 0) {
            // If multiple files, take the first one or handle based on fieldname if needed
            // For simple dynamic updates, usually one file is sent to one path
            updateValue = req.files[0].filename;
        } else {
            updateValue = req.body.value !== undefined ? req.body.value : req.body;
        }

        // If it's an 'add' path, and the target is an array, we should push
        if (isAdd) {
            const currentArray = doc.get(fullPath);
            if (Array.isArray(currentArray)) {
                // If updateValue is an object and we have files, merge them into the object
                if (typeof updateValue === 'object' && req.files) {
                    req.files.forEach(f => {
                        updateValue[f.fieldname] = f.filename;
                    });
                }
                currentArray.push(updateValue);
                doc.markModified(fullPath);
            } else {
                doc.set(fullPath, updateValue);
            }
        } else {
            // For update, if the existing value is an object and updateValue is too, merge
            const currentVal = doc.get(fullPath);
            if (currentVal && typeof currentVal === 'object' && !Array.isArray(currentVal) &&
                updateValue && typeof updateValue === 'object' && !Array.isArray(updateValue)) {
                
                // If we have files, add them to updateValue
                if (req.files) {
                    const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
                    files.forEach(f => {
                        updateValue[f.fieldname] = f.filename;
                    });
                }
                
                Object.assign(currentVal, updateValue);
                doc.markModified(fullPath);
            } else {
                doc.set(fullPath, updateValue);
            }
        }

        await doc.save();
        res.status(200).json({
            success: true,
            message: `Updated ${page}/${fullPath}`,
            data: doc
        });

    } catch (err) {
        console.error("Dynamic Update Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDynamic = async (req, res, next) => {
    try {
        logger.info("User Login request received");
        const decryptedData = decryptData(req.params.data || req.body.data || req.query.data);
        logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
        const { page } = req.params;
        const rawPath = req.path || "";

        const Model = models[page.toLowerCase()];
        if (!Model) return next();

        const doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

        // The rawPath here would be something like '/background/image' if the page is 'home'
        // We need to split it and map segments
        let pathParts = rawPath.split('/').filter(s => s); // Filter out empty strings from split
        pathParts = pathParts.map(part => fieldMap[part] || part); // Map user-friendly names to schema names

        // Disable removed legacy sections (About -> values)
        if (page.toLowerCase() === 'about' && pathParts.length > 0 && pathParts[0] === 'values') {
            return res.status(404).json({ success: false, error: 'Path segment values not found' });
        }

        let target = doc;
        for (const segment of pathParts) {
            if (target[segment] === undefined) {
                return res.status(404).json({ success: false, error: `Path segment ${segment} not found` });
            }
            target = target[segment];
        }

        res.status(200).json({ success: true, data: target });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
