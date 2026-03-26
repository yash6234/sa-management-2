const AboutAcademy = require('../models/AboutAcademy');

const getActiveAbout = async () => {
    let about = await AboutAcademy.findOne({ isActive: true });
    if (!about) about = await AboutAcademy.create({ isActive: true });
    return about;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getAboutData = async (req, res) => {
    try {
        const aboutData = await getActiveAbout();
        res.status(200).json({ success: true, data: aboutData });
    } catch (err) {
        console.error("Error fetching about page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch about data' });
    }
};

// 2. OBJECT SECTIONS (Hero, Mission Header, etc.)
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        let target = about;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                 if (target) target = target[part];
            }
        } else {
             target = about[sectionName];
        }
        
        if (target === undefined) {
             return res.status(404).json({ success: false, message: 'Section not found' });
        }
        res.status(200).json({ success: true, data: target });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (sectionName) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        let updateData = { ...req.body };
        if (req.file) {
            if (sectionName === 'hero') updateData.backgroundImage = req.file.filename;
        }

        // Handle mission.sectionTitle if path is 'mission' but body only has sectionTitle
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = about;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = { ...target[lastPart].toObject(), ...updateData };
        } else {
            about[sectionName] = { ...about[sectionName].toObject(), ...updateData };
        }

        await about.save();
        res.status(200).json({ success: true, data: about[sectionName.split('.')[0]] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        about[sectionName] = undefined;
        await about.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS (Founders, Journey, Values, Mission Items)
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        let newItem = { ...req.body };
        if (req.file) newItem.image = req.file.filename;
        
        targetArray.push(newItem);
        await about.save();
        res.status(201).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (arrayPath) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        let updateData = { ...req.body };
        if (req.file) updateData.image = req.file.filename;
        
        Object.assign(item, updateData);
        await about.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        targetArray.pull(req.params.itemId);
        await about.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
