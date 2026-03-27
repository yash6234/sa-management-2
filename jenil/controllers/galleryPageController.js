const GalleryPage = require('../models/GalleryPage');
const { saveBase64Image } = require('../utils/fileUtils');

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
    const imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo', 'icon'];
    for (const field of imageFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].startsWith('data:image')) {
            const savedPath = saveBase64Image(data[field]);
            if (savedPath) data[field] = savedPath;
        }
    }
    return data;
};

const getActiveGallery = async () => {
    let gallery = await GalleryPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!gallery) gallery = await GalleryPage.create({ isActive: true });
    return gallery;
};

const getGalleryGrid = (galleryDocOrObject) => ({
    categories: galleryDocOrObject.categories || [],
    images: galleryDocOrObject.images || []
});

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getGalleryData = async (req, res) => {
    try {
        const galleryData = await getActiveGallery();
        const data = galleryData.toObject();
        data.galleryGrid = getGalleryGrid(data);
        // Clean up response
        delete data.categories;
        delete data.images;
        res.status(200).json({ success: true, data });
    } catch (err) {
        console.error("Error fetching gallery page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch gallery data' });
    }
};

// 2. CONFIG SECTIONS
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        if (sectionName === 'galleryGrid') {
            return res.status(200).json({ success: true, data: getGalleryGrid(gallery) });
        }
        let target = gallery;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                if (target) target = target[part];
            }
        } else {
            target = gallery[sectionName];
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
        const gallery = await getActiveGallery();
        // Normalize all keys from brackets to dots
        let updateData = normalizePaths(req.body);
        updateData = processImageFields(updateData);

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

        if (sectionName === 'galleryGrid') {
             // Handle the virtual section 'galleryGrid' which maps to 'categories' and 'images'
             if (updateData.categories !== undefined) {
                 gallery.categories = Array.isArray(updateData.categories) ? updateData.categories : updateData.categories.split(',').map(s => s.trim()).filter(Boolean);
                 gallery.markModified('categories');
             }
             if (Array.isArray(updateData.images)) {
                 gallery.images = updateData.images;
                 gallery.markModified('images');
             }
             await gallery.save();
             return res.status(200).json({ success: true, data: getGalleryGrid(gallery) });
        }

        const flattenedUpdates = flattenObject(updateData, sectionName);
        for (const [path, value] of Object.entries(flattenedUpdates)) {
            let normalizedPath = normalizeDuplicatedSectionPrefix(sectionName, path);
            if (value === null) {
                gallery.set(normalizedPath, undefined);
            } else {
                gallery.set(normalizedPath, value);
            }
            gallery.markModified(normalizedPath);
        }

        await gallery.save();
        
        const result = sectionName.split('.').reduce((obj, part) => obj && obj[part], gallery);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        console.error("Update Gallery Section Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        if (sectionName === 'galleryGrid') {
            gallery.categories = [];
            gallery.images = [];
            gallery.markModified('categories');
            gallery.markModified('images');
        } else {
            gallery.set(sectionName, undefined);
            gallery.markModified(sectionName);
        }
        await gallery.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS (Images, Training Moments, Categories)
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const parts = arrayPath.split('.');
        let targetArray = gallery;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            if (targetArray[part] === undefined || targetArray[part] === null) {
                targetArray[part] = isLast ? [] : {};
                gallery.markModified(parts.slice(0, i + 1).join('.'));
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
            setNested(payload, toDotPath(req.file.fieldname), req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(payload, toDotPath(file.fieldname), file.filename);
            });
        }
        
        payload.list = parseJsonIfLikely(payload.list);
        payload.items = parseJsonIfLikely(payload.items);
        payload.item = parseJsonIfLikely(payload.item);

        const schemaPath = GalleryPage.schema.path(arrayPath);
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
            const candidates = ['value', 'text', 'feature', 'features', 'label', 'name', 'title', 'image', 'url', 'src', 'path', 'item', 'category'];
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
        gallery.markModified(arrayPath);
        await gallery.save();
        res.status(201).json({ success: true, data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (arrayPath) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const parts = arrayPath.split('.');
        let targetArray = gallery;
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
            setNested(updateData, toDotPath(req.file.fieldname), req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, toDotPath(file.fieldname), file.filename);
            });
        }
        
        const applyItemUpdate = (prefix, data) => {
            for (const key in data) {
                const value = data[key];
                const fullPath = `${prefix}.${key}`;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    applyItemUpdate(fullPath, value);
                } else {
                    gallery.set(fullPath, value);
                    gallery.markModified(fullPath);
                }
            }
        };

        applyItemUpdate(itemPath, updateData);
        await gallery.save();
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        console.error("Update Array Item Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        const gallery = await getActiveGallery();
        const parts = arrayPath.split('.');
        let targetArray = gallery;
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
        
        gallery.markModified(arrayPath);
        await gallery.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Legacy Aliases for existing routes
exports.addImage = exports.addArrayItem('images');
exports.updateImage = exports.updateArrayItem('images');
exports.deleteImage = exports.deleteArrayItem('images');
exports.addTrainingMomentImage = exports.addArrayItem('trainingMoments.list');
exports.updateTrainingMomentImage = exports.updateArrayItem('trainingMoments.list');
exports.deleteTrainingMomentImage = exports.deleteArrayItem('trainingMoments.list');
