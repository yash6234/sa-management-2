const ProgramsPage = require('../models/ProgramsPage');
const { saveBase64Image } = require('../utils/fileUtils');
const { logger, decryptData } = require("../../utils/enc_dec_admin");

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

const toDotPath = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
};

const toSectionRelativeFieldPath = (sectionName, fieldname) => {
    const sectionDot = toDotPath(sectionName);
    const fieldDot = toDotPath(fieldname);

    if (sectionDot && fieldDot.startsWith(sectionDot + '.')) {
        return fieldDot.slice(sectionDot.length + 1);
    }

    return fieldname;
};

const normalizeDuplicatedSectionPrefix = (sectionName, fullPath) => {
    const dupPrefix = `${sectionName}.${sectionName}.`;
    let normalized = fullPath;
    while (normalized.startsWith(dupPrefix)) {
        normalized = `${sectionName}.${normalized.slice(dupPrefix.length)}`;
    }
    return normalized;
};

const normalizeHeroBackgroundPath = (sectionName, fullPath) => {
    const sectionDot = toDotPath(sectionName);
    if (sectionDot !== 'hero' || typeof fullPath !== 'string') return fullPath;

    const match = fullPath.match(/^(.*)\.([^.]+)$/);
    if (!match) return fullPath;

    const prefix = match[1];
    const last = match[2];
    const alias = last.toLowerCase();

    const heroImageAliases = new Set([
        'background',
        'bgimage',
        'bg_image',
        'bg',
        'image',
        'file',
        'imagefile',
        'heroimage',
        'herobg',
        'herobackground',
        'backgroundimage',
        'background_image',
    ]);

    if (heroImageAliases.has(alias)) return `${prefix}.backgroundImage`;
    return fullPath;
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

const processImageFields = (data) => {
    const imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo', 'icon', 'photo', 'avatar', 'src'];

    // Recursively process arrays
    if (Array.isArray(data)) {
        return data.map(item => processImageFields(item));
    }

    // Recursively process objects
    if (data !== null && typeof data === 'object') {
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const value = data[key];
                // Check if this is an image field with base64 data
                if (imageFields.includes(key) && typeof value === 'string' && value.startsWith('data:image')) {
                    const savedPath = saveBase64Image(value);
                    if (savedPath) data[key] = savedPath;
                } else if (typeof value === 'object' && value !== null) {
                    // Recursively process nested objects/arrays
                    data[key] = processImageFields(value);
                }
            }
        }
        return data;
    }

    return data;
};

const getActivePrograms = async () => {
    let programs = await ProgramsPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!programs) {
        programs = await ProgramsPage.create({ isActive: true });
    }

    // Ensure levels is an array
    if (!Array.isArray(programs.levels)) {
        programs.levels = [];
        programs.markModified('levels');
        await programs.save();
    }

    return programs;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getProgramsData = async (req, res) => {
    try {
        const programsData = await getActivePrograms();
        // Public frontend only needs hero + levels
        res.status(200).json({
            success: true,
            data: {
                hero: programsData.hero,
                levels: programsData.levels,
            }
        });
    } catch (err) {
        console.error("Error fetching programs page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch programs data' });
    }
};

// Convenience endpoint: returns all level cards in one response (ordered)
exports.getLevels = async (req, res) => {
    try {
        // try {
        //     const encryptedData = req.params.data || req.body.data || req.query.data;
        //     if (encryptedData) {
        //         const decryptedData = decryptData(encryptedData);
        //     }
        // } catch (e) { }
        const programs = await getActivePrograms();
        const levels = programs.levels;

        // Order by key: beginner, intermediate, advanced, camp
        const orderMap = { beginner: 0, intermediate: 1, advanced: 2, camp: 3 };
        const sortedLevels = [...levels].sort((a, b) => (orderMap[a.key] || 99) - (orderMap[b.key] || 99));

        res.status(200).json({ success: true, data: { levels: sortedLevels } });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 2. CONFIG SECTIONS
exports.getSection = (sectionName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        let updateData = normalizePaths(req.body);
        updateData = processImageFields(updateData);

        if (req.file) {
            const relativePath = toSectionRelativeFieldPath(sectionName, req.file.fieldname);
            setNested(updateData, relativePath, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                const relativePath = toSectionRelativeFieldPath(sectionName, file.fieldname);
                setNested(updateData, relativePath, file.filename);
            });
        }

        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, k) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + k;

                if (obj[k] === null) {
                    acc[fullPath] = null;
                } else if (typeof obj[k] === 'object' && !Array.isArray(obj[k])) {
                    Object.assign(acc, flattenObject(obj[k], fullPath));
                } else {
                    acc[fullPath] = obj[k];
                }
                return acc;
            }, {});
        };

        const flattenedUpdates = flattenObject(updateData, sectionName);
        for (const [path, value] of Object.entries(flattenedUpdates)) {
            let normalizedPath = normalizeDuplicatedSectionPrefix(sectionName, path);
            normalizedPath = normalizeHeroBackgroundPath(sectionName, normalizedPath);
            if (value === null) {
                programs.set(normalizedPath, undefined);
            } else {
                programs.set(normalizedPath, value);
            }
            programs.markModified(normalizedPath);
        }

        await programs.save();
        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], programs);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        programs.set(sectionName, undefined);
        programs.markModified(sectionName);
        await programs.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
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

        const getNestedValue = (obj, dotPath) => {
            if (!obj || typeof obj !== 'object' || typeof dotPath !== 'string') return undefined;
            return dotPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
        };

        let payload = normalizePaths(req.body);
        payload = processImageFields(payload);

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

        const schemaPath = ProgramsPage.schema.path(arrayPath);
        const expectsStringItems = schemaPath?.caster?.instance === 'String';

        let itemsToAdd;
        const directItems = getNestedValue(payload, arrayPath);
        const lastPart = parts[parts.length - 1];
        const lastPartItems = payload[lastPart];

        if (directItems !== undefined) {
            itemsToAdd = directItems;
        } else if (lastPartItems !== undefined) {
            itemsToAdd = lastPartItems;
        } else if (payload.list !== undefined) {
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

        const coerceStringItem = (item) => {
            if (typeof item === 'string') return item;
            if (!isPlainObject(item)) return null;
            const candidates = ['value', 'text', 'feature', 'features', 'label', 'name', 'title', 'image', 'url', 'src', 'path', 'item'];
            for (const key of candidates) {
                if (typeof item[key] === 'string') return item[key];
                if (Array.isArray(item[key]) && item[key].length === 1 && typeof item[key][0] === 'string') return item[key][0];
            }
            const stringValues = Object.values(item).filter((v) => typeof v === 'string');
            if (stringValues.length === 1) return stringValues[0];
            return null;
        };

        itemsToAdd = itemsToAdd.map((item) => (typeof item === 'string' ? parseJsonIfLikely(item) : item));

        if (expectsStringItems) {
            itemsToAdd = itemsToAdd
                .map((item) => coerceStringItem(item))
                .map((value) => (typeof value === 'string' ? value.trim() : value))
                .filter((value) => typeof value === 'string' && value.length > 0);
        } else {
            itemsToAdd = itemsToAdd
                .filter((item) => isPlainObject(item))
                .filter((item) => Object.keys(item).length > 0);
        }

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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        const item = targetArray.id(req.params.itemId);
        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        const index = targetArray.indexOf(item);
        const itemPath = `${arrayPath}.${index}`;

        let updateData = normalizePaths(req.body);
        updateData = processImageFields(updateData);

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
                    programs.set(fullPath, value);
                    programs.markModified(fullPath);
                }
            }
        };

        applyItemUpdate(itemPath, updateData);
        await programs.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const parts = arrayPath.split('.');
        let targetArray = programs;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        if (req.params.itemId) {
            if (typeof targetArray.id === 'function') {
                const item = targetArray.id(req.params.itemId);
                if (item) {
                    targetArray.pull(req.params.itemId);
                } else {
                    const index = parseInt(req.params.itemId);
                    if (!isNaN(index) && index >= 0 && index < targetArray.length) {
                        targetArray.splice(index, 1);
                    } else {
                        return res.status(404).json({ success: false, message: 'Item not found' });
                    }
                }
            } else {
                const index = parseInt(req.params.itemId);
                if (!isNaN(index) && index >= 0 && index < targetArray.length) {
                    targetArray.splice(index, 1);
                } else {
                    return res.status(404).json({ success: false, message: 'Item not found' });
                }
            }
        }

        programs.markModified(arrayPath);
        await programs.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// LEVELS MANAGEMENT (new array-based structure)
exports.getLevelById = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });
        res.status(200).json({ success: true, data: level });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.addLevel = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const { key, title, description, duration, image, features } = req.body;

        if (!key || !title) {
            return res.status(400).json({ success: false, message: 'key and title are required' });
        }

        const newLevel = {
            _id: new mongoose.Types.ObjectId(),
            key,
            title,
            description: description || '',
            duration: duration || '',
            image: image || '',
            features: Array.isArray(features) ? features.map(f => ({
                _id: new mongoose.Types.ObjectId(),
                text: typeof f === 'string' ? f : f.text
            })) : []
        };

        programs.levels.push(newLevel);
        programs.markModified('levels');
        await programs.save();
        res.status(201).json({ success: true, data: programs.levels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateLevel = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

        const { key, title, description, duration, image } = req.body;
        if (key) level.key = key;
        if (title) level.title = title;
        if (description !== undefined) level.description = description;
        if (duration !== undefined) level.duration = duration;
        if (image !== undefined) level.image = image;

        programs.markModified('levels');
        await programs.save();
        res.status(200).json({ success: true, data: programs.levels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteLevel = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

        programs.levels.pull(req.params.levelId);
        programs.markModified('levels');
        await programs.save();
        res.status(200).json({ success: true, message: 'Level deleted', data: programs.levels });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// FEATURES MANAGEMENT
exports.addFeature = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

        const { text } = req.body;
        if (!text) return res.status(400).json({ success: false, message: 'text is required' });

        level.features.push({
            _id: new mongoose.Types.ObjectId(),
            text
        });

        programs.markModified('levels');
        await programs.save();
        res.status(201).json({ success: true, data: level });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateFeature = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

        const feature = level.features.id(req.params.featureId);
        if (!feature) return res.status(404).json({ success: false, message: 'Feature not found' });

        const { text } = req.body;
        if (text) feature.text = text;

        programs.markModified('levels');
        await programs.save();
        res.status(200).json({ success: true, data: level });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteFeature = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decryptedData = decryptData(encryptedData);
            }
        } catch (e) { }
        const programs = await getActivePrograms();
        const level = programs.levels.id(req.params.levelId);
        if (!level) return res.status(404).json({ success: false, message: 'Level not found' });

        const feature = level.features.id(req.params.featureId);
        if (!feature) return res.status(404).json({ success: false, message: 'Feature not found' });

        level.features.pull(req.params.featureId);
        programs.markModified('levels');
        await programs.save();
        res.status(200).json({ success: true, message: 'Feature deleted', data: level });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
