const AboutAcademy = require('../models/AboutAcademy');

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

        console.log(`[AboutController] Updating section ${sectionName} with data:`, updateData);
        const flattenedUpdates = flattenObject(updateData, sectionName);
        console.log(`[AboutController] Flattened updates for Mongoose:`, flattenedUpdates);

        for (const [path, value] of Object.entries(flattenedUpdates)) {
            if (value === null) {
                about.set(path, undefined);
            } else {
                about.set(path, value);
            }
            about.markModified(path);
        }

        await about.save();
        console.log(`[AboutController] Successfully saved section ${sectionName}.`);

        // Return the updated section
        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], about);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("Update About Section Error:", err);
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

// 3. ARRAY SECTIONS
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            if (targetArray[part] === undefined || targetArray[part] === null) {
                targetArray[part] = isLast ? [] : {};
                about.markModified(parts.slice(0, i + 1).join('.'));
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
        about.markModified(arrayPath);
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

        const applyItemUpdate = (prefix, data) => {
            for (const key in data) {
                const value = data[key];
                const fullPath = `${prefix}.${key}`;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    applyItemUpdate(fullPath, value);
                } else {
                    about.set(fullPath, value);
                    about.markModified(fullPath);
                }
            }
        };

        applyItemUpdate(itemPath, updateData);
        await about.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        console.error("Update Array Item Error:", err);
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
        about.markModified(arrayPath);
        await about.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
