const mongoose = require('mongoose');

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
        // The path captured manually from req.path (stripped of mount prefix)
        const { page } = req.params;
        const rawPath = req.path || "";

        const Model = models[page.toLowerCase()];
        if (!Model) return next();

        let pathParts = rawPath.split('/').filter(s => s && s !== 'update' && s !== 'add');
        // Map segments if they are in fieldMap
        pathParts = pathParts.map(part => fieldMap[part] || part);

        const fullPath = pathParts.join('.');

        let doc = await Model.findOne({ isActive: true });
        if (!doc) doc = await Model.create({ isActive: true });

        const isAdd = rawPath.endsWith('/add');
        let updateValue;

        if (req.file) {
            updateValue = 'public/uploads/' + req.file.filename;
        } else {
            updateValue = req.body.value !== undefined ? req.body.value : req.body;
        }

        // If it's an 'add' path, and the target is an array, we should push
        if (isAdd) {
            const currentArray = doc.get(fullPath);
            if (Array.isArray(currentArray)) {
                currentArray.push(updateValue);
                doc.markModified(fullPath);
            } else {
                // If it's not an array, just treat it as a set
                doc.set(fullPath, updateValue);
            }
        } else {
            // For update, if the existing value is an object and updateValue is too, merge
            const currentVal = doc.get(fullPath);
            if (typeof currentVal === 'object' && currentVal !== null && !Array.isArray(currentVal) &&
                typeof updateValue === 'object' && updateVal !== null && !Array.isArray(updateValue)) {
                // Merge
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
        const { page } = req.params;
        const rawPath = req.path || "";

        const Model = models[page.toLowerCase()];
        if (!Model) return next();

        const doc = await Model.findOne({ isActive: true });
        if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });

        // The rawPath here would be something like '/background/image' if the page is 'home'
        // We need to split it and map segments
        let pathParts = rawPath.split('/').filter(s => s); // Filter out empty strings from split
        pathParts = pathParts.map(part => fieldMap[part] || part); // Map user-friendly names to schema names

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
