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

    if (fullPath.endsWith('.background')) return fullPath.replace(/\.background$/, '.backgroundImage');
    if (fullPath.endsWith('.bgImage')) return fullPath.replace(/\.bgImage$/, '.backgroundImage');
    if (fullPath.endsWith('.bg')) return fullPath.replace(/\.bg$/, '.backgroundImage');
    if (fullPath.endsWith('.image')) return fullPath.replace(/\.image$/, '.backgroundImage');
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

const getActiveAbout = async () => {
    let about = await AboutAcademy.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!about) about = await AboutAcademy.create({ isActive: true });
    return about;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getAboutData = async (req, res) => {
    try {
        const aboutData = await getActiveAbout();
        const data = aboutData?.toObject ? aboutData.toObject() : aboutData;
        if (data && typeof data === 'object') {
            // Section removed from API; hide any legacy data still stored in MongoDB
            delete data.values;
        }
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error fetching about page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch about data' });
    }
};

// Intro + Mission merged payload (for fewer frontend calls / unified admin editing)
exports.getIntroMission = async (req, res) => {
    try {
        const about = await getActiveAbout();
        const intro = about.introSection?.toObject ? about.introSection.toObject() : (about.introSection || {});
        const mission = about.mission?.toObject ? about.mission.toObject() : (about.mission || {});
        res.status(200).json({
            success: true,
            data: {
                ...intro,
                mission
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateIntroMission = async (req, res) => {
    try {
        const about = await getActiveAbout();
        const updateData = {};

        const mapMergedPath = (rawPath) => {
            const dot = toDotPath(rawPath);
            if (!dot) return null;

            if (dot === 'paragraphs' || dot.startsWith('paragraphs.')) return `introSection.${dot}`;
            if (dot === 'introSection' || dot.startsWith('introSection.')) return dot;
            if (dot === 'mission' || dot.startsWith('mission.')) return dot;

            // Allow mission fields at root for convenience
            const missionKeys = ['sectionTitle', 'items', 'imageCollage'];
            for (const key of missionKeys) {
                if (dot === key || dot.startsWith(key + '.')) return `mission.${dot}`;
            }

            return null;
        };

        // 1) Body updates (support JSON strings in multipart/form-data)
        const normalizedBody = normalizePaths(req.body || {});
        for (const [key, rawValue] of Object.entries(normalizedBody)) {
            const path = mapMergedPath(key);
            if (!path) continue;
            const value = typeof rawValue === 'string' ? parseJsonIfLikely(rawValue) : rawValue;
            setNested(updateData, path, value);
        }

        // 2) File uploads (icons, image collage, etc)
        const files = Array.isArray(req.files) ? req.files : (req.files ? Object.values(req.files).flat() : []);
        for (const file of files) {
            const path = mapMergedPath(file.fieldname);
            if (!path) continue;
            setNested(updateData, path, file.filename);
        }

        // 3) Flatten + apply updates
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

        const normalizeDuplicatedRootPrefix = (fullPath) => {
            if (typeof fullPath !== 'string') return fullPath;
            let normalized = fullPath;
            for (const section of ['introSection', 'mission']) {
                const dupPrefix = `${section}.${section}.`;
                while (normalized.startsWith(dupPrefix)) {
                    normalized = `${section}.${normalized.slice(dupPrefix.length)}`;
                }
            }
            return normalized;
        };

        const flattenedUpdates = flattenObject(updateData);
        for (const [path, value] of Object.entries(flattenedUpdates)) {
            const normalizedPath = normalizeDuplicatedRootPrefix(path);
            about.set(normalizedPath, value === null ? undefined : value);
            about.markModified(normalizedPath);
        }

        await about.save();
        const intro = about.introSection?.toObject ? about.introSection.toObject() : (about.introSection || {});
        const mission = about.mission?.toObject ? about.mission.toObject() : (about.mission || {});
        res.status(200).json({ success: true, data: { ...intro, mission } });
    } catch (err) {
        console.error("Update Intro+Mission Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteIntroMission = async (req, res) => {
    try {
        const about = await getActiveAbout();
        about.set('introSection', undefined);
        about.set('mission', undefined);
        about.markModified('introSection');
        about.markModified('mission');
        await about.save();
        res.status(200).json({ success: true, message: 'Intro + Mission cleared/reset' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
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
            let normalizedPath = normalizeDuplicatedSectionPrefix(sectionName, path);
            normalizedPath = normalizeHeroBackgroundPath(sectionName, normalizedPath);
            if (value === null) {
                about.set(normalizedPath, undefined);
            } else {
                about.set(normalizedPath, value);
            }
            about.markModified(normalizedPath);
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
        about.set(sectionName, undefined);
        about.markModified(sectionName);
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

        const schemaPath = AboutAcademy.schema.path(arrayPath);
        const expectsStringItems = schemaPath?.caster?.instance === 'String';
        const expectsEmbeddedDocs = schemaPath?.instance === 'Array' && schemaPath?.casterConstructor?.name === 'EmbeddedDocument';

        const coerceStringItem = (item) => {
            if (typeof item === 'string') return item;
            if (!isPlainObject(item)) return null;

            // Common keys for string arrays (features, urls, images, etc)
            const candidates = ['value', 'text', 'feature', 'label', 'name', 'title', 'image', 'url', 'src', 'path'];
            for (const key of candidates) {
                if (typeof item[key] === 'string') return item[key];
            }

            // If there's exactly 1 string field, use it
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
        } else if (expectsEmbeddedDocs) {
            itemsToAdd = itemsToAdd.filter((item) => isPlainObject(item));
        } else {
            // Unknown schema path: keep it conservative to avoid bad casts
            itemsToAdd = itemsToAdd.filter((item) => isPlainObject(item));
        }

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
