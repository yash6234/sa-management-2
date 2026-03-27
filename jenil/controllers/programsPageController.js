const ProgramsPage = require('../models/ProgramsPage');

const parseJsonIfLikely = (value) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    const looksJsonObject = trimmed.startsWith('{') && trimmed.endsWith('}');
    const looksJsonArray = trimmed.startsWith('[') && trimmed.endsWith(']');
    if (!looksJsonObject && !looksJsonArray) return value;
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
};

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

// Helper to set nested property by string path (handles both dots and brackets)
const setNested = (obj, path, value) => {
    const parts = path.replace(/\[(\w+)\]/g, '.$1').split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part]) current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};

// Helper to normalize all keys in an object from brackets to dots
const normalizePaths = (obj) => {
    const newObj = {};
    for (const key in obj) {
        const normalizedKey = key.replace(/\[(\w+)\]/g, '.$1');
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            newObj[normalizedKey] = normalizePaths(obj[key]);
        } else {
            newObj[normalizedKey] = obj[key];
        }
    }
    return newObj;
};

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
        // Normalize all keys from brackets to dots
        let updateData = normalizePaths(req.body);

        // 1. Handle file uploads (both single and multiple)
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }

        // 2. APPLY UPDATES GENERICALLY
        // Helper to flatten nested objects into dot-notation paths
        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, k) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + k;

                if (obj[k] === null) {
                    acc[fullPath] = null; // Mark for deletion
                } else if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
                    Object.assign(acc, flattenObject(obj[k], fullPath));
                } else {
                    acc[fullPath] = obj[k];
                }
                return acc;
            }, {});
        };

        console.log(`[ProgramsController] Updating section ${sectionName} with data:`, updateData);
        const flattenedUpdates = flattenObject(updateData, sectionName);
        console.log(`[ProgramsController] Flattened updates for Mongoose:`, flattenedUpdates);

        for (const [path, value] of Object.entries(flattenedUpdates)) {
            if (value === null) {
                programs.set(path, undefined);
            } else {
                programs.set(path, value);
            }
            // Explicitly mark as modified for deep paths/arrays/objects
            programs.markModified(path);
        }

        await programs.save();
        console.log(`[ProgramsController] Successfully saved section ${sectionName}.`);
        
        // Return the updated section
        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], programs);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("Update Programs Section Error:", err);
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

// 3. ARRAY SECTIONS
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            if (targetArray[part] === undefined || targetArray[part] === null) {
                targetArray[part] = isLast ? [] : {};
                programs.markModified(parts.slice(0, i + 1).join('.'));
            }
            targetArray = targetArray[part];
        }

        if (!Array.isArray(targetArray)) {
            return res.status(400).json({ success: false, message: `${arrayPath} is not an array` });
        }
        
        let payload = normalizePaths(req.body);
        if (req.file) {
            setNested(payload, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(payload, file.fieldname, file.filename);
            });
        }
        
        payload.list = parseJsonIfLikely(payload.list);
        payload.items = parseJsonIfLikely(payload.items);
        payload.item = parseJsonIfLikely(payload.item);

        let itemsToAdd;
        if (payload.list !== undefined) {
            itemsToAdd = payload.list;
        } else if (payload.items !== undefined) {
            itemsToAdd = payload.items;
        } else if (payload.item !== undefined) {
            itemsToAdd = payload.item;
        } else {
            itemsToAdd = payload;
        }

        if (typeof itemsToAdd === 'string') itemsToAdd = parseJsonIfLikely(itemsToAdd);
        if (!Array.isArray(itemsToAdd)) itemsToAdd = [itemsToAdd];
        itemsToAdd = itemsToAdd
            .map((item) => (typeof item === 'string' ? parseJsonIfLikely(item) : item))
            .filter((item) => isPlainObject(item));

        if (itemsToAdd.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid item found to add' });
        }

        for (const item of itemsToAdd) targetArray.push(item);
        programs.markModified(arrayPath);
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
        
        // Find index for deep setting
        const index = targetArray.indexOf(item);
        const itemPath = `${arrayPath}.${index}`;

        let updateData = normalizePaths(req.body);
        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }
        
        // Deep update the item using the same logic as updateSection
        const applyItemUpdate = (prefix, data) => {
            for (const key in data) {
                const value = data[key];
                const fullPath = `${prefix}.${key}`;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    applyItemUpdate(fullPath, value);
                } else {
                    programs.set(fullPath, value);
                    programs.markModified(fullPath);
                }
            }
        };

        applyItemUpdate(itemPath, updateData);
        await programs.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        console.error("Update Array Item Error:", err);
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
        programs.markModified(arrayPath);
        await programs.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
