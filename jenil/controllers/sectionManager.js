const mongoose = require('mongoose');

const getActiveDocument = async (Model) => {
    let doc = await Model.findOne({ isActive: true });
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
        
        if (req.file) {
            // Priority order for image fields
            if (updateData.backgroundImage === undefined) updateData.backgroundImage = req.file.filename || req.file.path;
            else updateData.image = req.file.filename || req.file.path;
        }

        doc[sectionName] = { ...doc[sectionName].toObject(), ...updateData };
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
            newItem.image = req.file.filename || req.file.path;
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
            updateData.image = req.file.filename || req.file.path;
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
