const ProgramsPage = require('../models/ProgramsPage');

const getActivePrograms = async () => {
    let programs = await ProgramsPage.findOne({ isActive: true });
    if (!programs) programs = await ProgramsPage.create({ isActive: true });
    return programs;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getProgramsData = async (req, res) => {
    try {
        const programsData = await getActivePrograms();
        res.status(200).json({ success: true, data: programsData });
    } catch (err) {
        console.error("Error fetching programs page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch programs data' });
    }
};

// 2. CONFIG SECTIONS (Hero, Levels)
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        let target = programs;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                if (target) target = target[part];
            }
        } else {
            target = programs[sectionName];
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
        const programs = await getActivePrograms();
        let updateData = { ...req.body };
        
        if (req.file) {
            // Specifically handling image/backgroundImage for specific sections
            if (sectionName === 'hero') updateData.backgroundImage = req.file.filename;
            
            // Nested Level updates
            if (sectionName.startsWith('levels.')) {
                updateData.image = req.file.filename;
            }
        }

        // Deep merge for nested sections
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = programs;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = { ...target[lastPart], ...updateData };
        } else {
            programs[sectionName] = { ...programs[sectionName].toObject(), ...updateData };
        }

        await programs.save();
        res.status(200).json({ success: true, data: programs[sectionName.split('.')[0]] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        programs[sectionName] = undefined;
        await programs.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS (Special Coaching List)
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        let newItem = { ...req.body };
        if (req.file) newItem.image = req.file.filename;
        
        targetArray.push(newItem);
        await programs.save();
        res.status(201).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (arrayPath) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        let updateData = { ...req.body };
        if (req.file) updateData.image = req.file.filename;
        
        Object.assign(item, updateData);
        await programs.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (const part of parts) {
            targetArray = targetArray[part];
        }
        
        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
        
        targetArray.pull(req.params.itemId);
        await programs.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
