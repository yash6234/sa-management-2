const mongoose = require('../utils/mongoose');

// Helper to set nested property by string path
const setNested = (obj, path, value) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};

const getActiveDocument = async (Model) => {
    let doc = await Model.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!doc) doc = await Model.create({ isActive: true });
    return doc;
};

exports.getPageData = (Model) => async (req, res) => {
    try {
        const data = await getActiveDocument(Model);
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (Model, sectionName) => async (req, res) => {
    try {
        const doc = await getActiveDocument(Model);
        let updateData = { ...req.body };
        
        // Handle file uploads (both single and multiple)
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }

        // Merge updates
        const section = doc[sectionName].toObject ? doc[sectionName].toObject() : doc[sectionName];
        doc[sectionName] = { ...section, ...updateData };
        
        await doc.save();
        res.status(200).json({ success: true, data: doc[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addToArray = (Model, arrayPath) => async (req, res) => {
    try {
        const doc = await getActiveDocument(Model);
        
        const pathParts = arrayPath.split('.');
        let target = doc;
        for (const part of pathParts) {
            target = target[part];
        }

        let newItem = { ...req.body };
        if (req.file) {
            setNested(newItem, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(newItem, file.fieldname, file.filename);
            });
        }

        target.push(newItem);
        await doc.save();
        res.status(201).json({ success: true, data: target });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (Model, arrayPath) => async (req, res) => {
    try {
        const doc = await getActiveDocument(Model);
        
        const pathParts = arrayPath.split('.');
        let targetArray = doc;
        for (const part of pathParts) {
            targetArray = targetArray[part];
        }

        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        let updateData = { ...req.body };
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }

        Object.assign(item, updateData);
        await doc.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.removeFromArray = (Model, arrayPath) => async (req, res) => {
    try {
        const doc = await getActiveDocument(Model);
        
        const pathParts = arrayPath.split('.');
        let targetArray = doc;
        for (const part of pathParts) {
            targetArray = targetArray[part];
        }

        targetArray.pull(req.params.itemId);
        await doc.save();
        res.status(200).json({ success: true, message: 'Deleted successfully', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
