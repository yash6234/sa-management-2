const GalleryPage = require('../../models/GalleryPage');
const { saveBase64Image } = require('../../utils/fileUtils');
const { logger, decryptData } = require("../../../utils/enc_dec_admin");

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

const { decryptData: decryptCryptoJS } = require('../../utils/encryption');

const processImageFields = (data) => {
    const imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo', 'icon', 'photo', 'avatar', 'src'];

    // Recursively process arrays
    if (Array.isArray(data)) {
        return data.map(item => processImageFields(item));
    }

    // Recursively process objects
    if (data !== null && typeof data === 'object') {
        const result = { ...data };
        for (const key in result) {
            if (result.hasOwnProperty(key)) {
                const value = result[key];
                
                // 1. Handle base64 images
                if (imageFields.includes(key) && typeof value === 'string' && value.startsWith('data:image')) {
                    const savedPath = saveBase64Image(value);
                    if (savedPath) result[key] = savedPath;
                } 
                // 2. Handle CryptoJS encrypted paths (starts with 'U2FsdGVkX1')
                else if (typeof value === 'string' && value.startsWith('U2FsdGVkX1')) {
                    try {
                        let decrypted = decryptCryptoJS(value);
                        
                        // Fallback to ROOT secret if necessary
                        if (!decrypted && process.env.ENCRYPTION_SECRET) {
                            const CryptoJS = require('crypto-js');
                            try {
                                const bytes = CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_SECRET);
                                const raw = bytes.toString(CryptoJS.enc.Utf8);
                                if (raw) {
                                    try { decrypted = JSON.parse(raw); } catch { decrypted = raw; }
                                }
                            } catch (e) { }
                        }

                        if (decrypted) {
                            if (typeof decrypted === 'string') {
                                result[key] = decrypted;
                            } else if (decrypted && typeof decrypted === 'object') {
                                result[key] = decrypted.url || decrypted.path || decrypted.filename || value;
                            }
                        }
                    } catch (err) { }
                }
                // 3. Recurse
                else if (typeof value === 'object' && value !== null) {
                    result[key] = processImageFields(value);
                }
            }
        }
        return result;
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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

exports.addGalleryGridItem = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const gallery = await getActiveGallery();

        const parseBoolean = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value !== 'string') return undefined;
            const normalized = value.trim().toLowerCase();
            if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
            if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
            return undefined;
        };

        const pickFirstString = (obj, keys) => {
            if (!obj || typeof obj !== 'object') return undefined;
            for (const key of keys) {
                const value = obj[key];
                if (typeof value === 'string' && value.trim().length > 0) return value;
            }
            return undefined;
        };

        const normalizeIndexObjectsToArrays = (value) => {
            if (Array.isArray(value)) return value.map((v) => normalizeIndexObjectsToArrays(v));
            if (!value || typeof value !== 'object') return value;

            const keys = Object.keys(value);
            const allNumeric = keys.length > 0 && keys.every((k) => /^\d+$/.test(k));
            if (allNumeric) {
                const arr = [];
                keys
                    .map((k) => Number(k))
                    .sort((a, b) => a - b)
                    .forEach((idx) => {
                        arr[idx] = normalizeIndexObjectsToArrays(value[String(idx)]);
                    });
                return arr;
            }

            for (const k of keys) value[k] = normalizeIndexObjectsToArrays(value[k]);
            return value;
        };

        const files = Array.isArray(req.files) ? req.files : (req.files ? Object.values(req.files).flat() : []);

        // Build a nested payload from multipart keys like `images[0][category]`
        let payload = {};
        const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
        for (const [rawKey, rawValue] of Object.entries(rawBody)) {
            const dotKey = toDotPath(rawKey);
            setNested(payload, dotKey, parseJsonIfLikely(rawValue));
        }

        if (req.file) {
            setNested(payload, toDotPath(req.file.fieldname), req.file.filename);
        }

        for (const file of files) {
            setNested(payload, toDotPath(file.fieldname), file.filename);
        }

        payload = normalizeIndexObjectsToArrays(payload);
        payload = processImageFields(payload);

        const rootCategory = pickFirstString(payload, ['category', 'cat']);
        const rootTitle = pickFirstString(payload, ['title', 'name', 'label']);
        const rootIsFeatured = parseBoolean(payload.isFeatured ?? payload.featured);

        // Categories-only add (optional)
        let categoriesToAdd = payload.categories ?? payload.category;
        categoriesToAdd = parseJsonIfLikely(categoriesToAdd);
        if (typeof categoriesToAdd === 'string') {
            categoriesToAdd = categoriesToAdd.split(',').map((s) => s.trim()).filter(Boolean);
        }
        if (!Array.isArray(categoriesToAdd)) {
            categoriesToAdd = categoriesToAdd !== undefined ? [categoriesToAdd] : [];
        }
        categoriesToAdd = categoriesToAdd
            .map((c) => (typeof c === 'string' ? c.trim() : ''))
            .filter((c) => c.length > 0);

        // Images add
        let itemsToAdd = payload.item ?? payload.items ?? payload.list ?? payload.images;
        itemsToAdd = parseJsonIfLikely(itemsToAdd);
        if (itemsToAdd === undefined) {
            const rootImage = pickFirstString(payload, ['image', 'imageUrl', 'url', 'src', 'path', 'file', 'imageFile']);
            const hasRootImage = typeof rootImage === 'string' && rootImage.trim().length > 0;
            if (hasRootImage || files.length > 0 || req.file) {
                itemsToAdd = [{
                    image: rootImage,
                    category: rootCategory,
                    title: rootTitle,
                    isFeatured: payload.isFeatured ?? payload.featured,
                }];
            } else {
                itemsToAdd = [];
            }
        }
        if (!Array.isArray(itemsToAdd)) itemsToAdd = [itemsToAdd];

        const fileQueue = [];
        if (req.file?.filename) fileQueue.push(req.file.filename);
        for (const file of files) fileQueue.push(file.filename);

        const normalizeImageItem = (raw) => {
            if (typeof raw === 'string') raw = { image: raw };
            if (!isPlainObject(raw)) return null;

            let image = pickFirstString(raw, ['image', 'imageUrl', 'url', 'src', 'path', 'file', 'imageFile']);
            if ((!image || image.trim().length === 0) && fileQueue.length > 0) {
                image = fileQueue.shift();
            }
            if (!image || typeof image !== 'string' || image.trim().length === 0) return null;

            const category = pickFirstString(raw, ['category', 'cat']) || rootCategory;
            const title = pickFirstString(raw, ['title', 'name', 'label']) || rootTitle;

            const featured = parseBoolean(raw.isFeatured ?? raw.featured);
            const isFeatured = featured !== undefined ? featured : rootIsFeatured;

            const item = { image: image.trim() };
            if (typeof category === 'string' && category.trim().length > 0) item.category = category.trim();
            if (typeof title === 'string' && title.trim().length > 0) item.title = title.trim();
            if (typeof isFeatured === 'boolean') item.isFeatured = isFeatured;
            return item;
        };

        let imageItems = itemsToAdd
            .map((item) => (typeof item === 'string' ? parseJsonIfLikely(item) : item))
            .map((item) => normalizeImageItem(item))
            .filter(Boolean);

        if (imageItems.length === 0 && fileQueue.length > 0) {
            imageItems = fileQueue.map((filename) => {
                const item = { image: filename };
                if (typeof rootCategory === 'string' && rootCategory.trim().length > 0) item.category = rootCategory.trim();
                if (typeof rootTitle === 'string' && rootTitle.trim().length > 0) item.title = rootTitle.trim();
                if (typeof rootIsFeatured === 'boolean') item.isFeatured = rootIsFeatured;
                return item;
            });
            fileQueue.length = 0;
        }

        const existingCategories = Array.isArray(gallery.categories) ? gallery.categories.slice() : [];
        const existingLower = new Set(existingCategories.map((c) => (typeof c === 'string' ? c.toLowerCase() : '')));
        let didUpdateCategories = false;

        const addCategoryIfMissing = (cat) => {
            if (typeof cat !== 'string') return;
            const trimmed = cat.trim();
            if (!trimmed) return;
            const lower = trimmed.toLowerCase();
            if (existingLower.has(lower)) return;
            existingLower.add(lower);
            existingCategories.push(trimmed);
            didUpdateCategories = true;
        };

        for (const cat of categoriesToAdd) addCategoryIfMissing(cat);
        for (const img of imageItems) {
            if (img.category) addCategoryIfMissing(img.category);
        }

        if (didUpdateCategories) {
            gallery.categories = existingCategories;
            gallery.markModified('categories');
        }

        if (imageItems.length > 0) {
            for (const img of imageItems) gallery.images.push(img);
            gallery.markModified('images');
        }

        if (!didUpdateCategories && imageItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid categories or images found to add' });
        }

        await gallery.save();
        return res.status(201).json({ success: true, data: getGalleryGrid(gallery) });
    } catch (err) {
        console.error("Add Gallery Grid Item Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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

        for (const item of itemsToAdd) { delete item._id; targetArray.push(item); }
        gallery.markModified(arrayPath);
        await gallery.save();
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
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const gallery = await getActiveGallery();
        const parts = arrayPath.split('.');
        let targetArray = gallery;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        const item = targetArray.find(item => item._id && item._id.toString() === req.params.itemId);
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const gallery = await getActiveGallery();
        const parts = arrayPath.split('.');
        let targetArray = gallery;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        if (req.params.itemId) {
            if (typeof targetArray.id === 'function') {
        const item = targetArray.find(item => item._id && item._id.toString() === req.params.itemId);
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
