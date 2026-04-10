const Home = require('../models/Home');
const { saveBase64Image } = require('../utils/fileUtils');
const Footer = require('../models/Footer');
const { decryptData: decryptCryptoJS } = require('../utils/encryption');

const parseJsonIfLikely = (value) => {
    if (typeof value !== 'string' || value === '') return value;
    const trimmed = value.trim();
    // Handle quoted JSON strings like '"{...}"'
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
        const inner = trimmed.slice(1, -1);
        if ((inner.startsWith('{') && inner.endsWith('}')) || (inner.startsWith('[') && inner.endsWith(']'))) {
            try {
                return JSON.parse(inner);
            } catch {
                // Fall through to normal parsing
            }
        }
    }
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) && !(trimmed.startsWith('[') && trimmed.endsWith(']'))) return value;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parseJsonIfLikely(parsed); // Recursive unescape
        return parsed;
    } catch {
        return value;
    }
};

const recursivelyParseJson = (obj) => {
    if (typeof obj === 'string') {
        return parseJsonIfLikely(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map(item => recursivelyParseJson(item));
    }
    if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        for (const [key, value] of Object.entries(obj)) {
            newObj[key] = recursivelyParseJson(value);
        }
        return newObj;
    }
    return obj;
};

// Helper to convert arrays of strings to arrays of objects for specific schema paths like 'features'
// It also tries to RECONCILE IDs with existing data in the document to prevent unnecessary ID changes.
const transformSchemaMismatches = (path, value, currentDoc) => {
    // 1. Handle common junk fields from some frontend form implementations
    const junkValues = new Set(['handleProgramAdd', 'handleProgramDelete', 'undefined', 'null', '[object Object]']);
    if (typeof value === 'string' && junkValues.has(value)) return null;

    // 2. Handle 'features' array (expected [{ text: string }])
    if (path.endsWith('.features')) {
        // Find existing features in the document for reconciliation
        const existingFeatures = currentDoc ? (currentDoc.get(path) || []) : [];
        const featureToId = new Map();
        existingFeatures.forEach(f => {
            if (f && f.text && f._id) featureToId.set(f.text.trim().toLowerCase(), f._id);
        });

        const reconcileItem = (item) => {
            if (typeof item === 'string') {
                if (junkValues.has(item)) return null;
                const text = item.trim();
                const existingId = featureToId.get(text.toLowerCase());
                return existingId ? { _id: existingId, text } : { text };
            }
            if (item && item.text) {
                const text = item.text.trim();
                const existingId = featureToId.get(text.toLowerCase());
                // If it doesn't have an ID yet, try to find one
                if (!item._id && existingId) return { ...item, _id: existingId, text };
            }
            return item;
        };

        if (Array.isArray(value)) {
            return value.map(reconcileItem).filter(item => item !== null);
        } else if (typeof value === 'string' && !junkValues.has(value)) {
            const text = value.trim();
            const existingId = featureToId.get(text.toLowerCase());
            return [existingId ? { _id: existingId, text } : { text }];
        }
    }

    // 3. Handle 'testimonials.list' (expected [{ quote, parentName, ... }])
    if (path.endsWith('.testimonials.list')) {
        const existing = currentDoc ? (currentDoc.get(path) || []) : [];
        if (Array.isArray(value)) {
            return value.map(item => {
                if (!item.quote || item._id) return item;
                const match = existing.find(e => e.quote === item.quote && e.parentName === item.parentName);
                return match ? { ...item, _id: match._id } : item;
            });
        }
    }

    return value;
};

const isPlainObject = (value) => {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const toDotPath = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
};

// If frontend sends names like `hero[backgroundImage]` while the controller already prefixes with `hero`,
// we must strip the section prefix to avoid writing `hero.hero.backgroundImage` into Mongo.
const toSectionRelativeFieldPath = (sectionName, fieldname) => {
    const sectionDot = toDotPath(sectionName);
    const fieldDot = toDotPath(fieldname);

    if (sectionDot && fieldDot.startsWith(sectionDot + '.')) {
        return fieldDot.slice(sectionDot.length + 1); // remainder, dot-notation
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
                    console.log(`[HomeController] Attempting to decrypt field: ${key}`);
                    try {
                        // Try COMMON secret first (Jenil CMS standard)
                        let decrypted = decryptCryptoJS(value);

                        // If it failed, try the ROOT ADMIN secret (fallback)
                        if (!decrypted && process.env.ENCRYPTION_SECRET) {
                            const CryptoJS = require('crypto-js');
                            try {
                                const bytes = CryptoJS.AES.decrypt(value, process.env.ENCRYPTION_SECRET);
                                const raw = bytes.toString(CryptoJS.enc.Utf8);
                                if (raw) {
                                    // Try to parse if it was doubled stringified
                                    try { decrypted = JSON.parse(raw); } catch { decrypted = raw; }
                                    console.log(`[HomeController] Decrypted using ROOT secret for field: ${key}`);
                                }
                            } catch (e) { }
                        }

                        if (decrypted) {
                            if (typeof decrypted === 'string') {
                                result[key] = decrypted;
                                console.log(`[HomeController] Successfully decrypted ${key} to -> ${decrypted}`);
                            } else if (decrypted && typeof decrypted === 'object') {
                                result[key] = decrypted.url || decrypted.path || decrypted.filename || value;
                                console.log(`[HomeController] Decrypted ${key} (Object) to -> ${result[key]}`);
                            }
                        } else {
                            console.warn(`[HomeController] Failed to decrypt encrypted string in ${key}. Key may be mismatched.`);
                        }
                    } catch (err) {
                        console.error(`[HomeController] Decryption error for field ${key}:`, err.message);
                    }
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

const getActiveHome = async () => {
    let home = await Home.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!home) home = await Home.create({ isActive: true });
    return home;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getHomePageData = async (req, res) => {
    try {
        const homeData = await getActiveHome();
        res.status(200).json({
            success: true,
            data: homeData
        });
    } catch (err) {
        console.error("Error fetching homepage data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch homepage data' });
    }
};

exports.getFooterData = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!footer) footer = await Footer.create({});
        res.status(200).json({
            success: true,
            data: footer
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch footer data' });
    }
};

exports.updateFooter = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!footer) footer = await Footer.create({});

        Object.assign(footer, req.body);
        await footer.save();
        res.status(200).json({
            success: true,
            data: footer
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update footer' });
    }
};

// 2. OBJECT SECTIONS (About, Footer, ProgramsAndFacilities, TournamentsSection, SocialSection) 
exports.getSection = (sectionName) => async (req, res) => {
    try {
        // Validation and decryption (req.adminData) are already handled by middlewareAdmin
        const home = await getActiveHome();
        const target = home[sectionName];
        if (target === undefined) {
            return res.status(404).json({
                encrypted: true,
                success: false,
                data: encryptData('Section not found')
            });
        }

        // Normalize legacy shapes to what the website frontend expects.
        if (sectionName === 'tournamentsSection') {
            const tournaments = JSON.parse(JSON.stringify(target));
            if (tournaments && tournaments.list && !Array.isArray(tournaments.list)) {
                tournaments.list = [tournaments.list];
            }
            if (tournaments && tournaments.list === undefined) tournaments.list = [];
            return res.status(200).json({
                encrypted: true,
                success: true,
                data: encryptData(tournaments),
                data1: encryptData("Fetched Successfully")
            });
        }

        if (sectionName === 'programsAndFacilities') {
            const programs = JSON.parse(JSON.stringify(target));
            if (programs) {
                programs.sectionTitle = programs.sectionTitle || 'Our Sports Programs';

                programs.facilitiesCard = programs.facilitiesCard || {};
                programs.facilitiesCard.buttonText = programs.facilitiesCard.buttonText || 'View Programs';
                programs.facilitiesCard.buttonLink = programs.facilitiesCard.buttonLink || '/programs';

                programs.quoteBlock = programs.quoteBlock || {};
                programs.quoteBlock.quote = programs.quoteBlock.quote || 'Excellence in Sports, Excellence in Life.';
                programs.quoteBlock.author = programs.quoteBlock.author || 'Gandhinagar Sports Academy';
                programs.quoteBlock.authorTitle = programs.quoteBlock.authorTitle || '';
                programs.quoteBlock.buttonText = programs.quoteBlock.buttonText || 'Explore Programs';
                programs.quoteBlock.buttonLink = programs.quoteBlock.buttonLink || '/programs';
            }
            return res.status(200).json({
                encrypted: true,
                success: true,
                data: encryptData(programs),
                data1: encryptData("Fetched Successfully"),
                data2: encryptData(Date.now())
            });
        }

        res.status(200).json({ success: true, data: target });
    } catch (err) {
        console.log("ERROR----------------------", err)
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();

        // 0. Build base payload from req.body (Already decrypted by middleware)
        const rawPayload = {};
        for (const [key, val] of Object.entries(req.body || {})) {
            rawPayload[key] = (typeof val === 'string') ? parseJsonIfLikely(val) : val;
        }

        // 1. Normalize dots/brackets and unwrap nested 'body' field if present
        let updateData = normalizePaths(rawPayload);
        if (isPlainObject(updateData.body)) {
            const bodyContent = updateData.body;
            delete updateData.body;
            Object.assign(updateData, bodyContent);
        }

        // Recursively parse any JSON strings in updateData
        updateData = recursivelyParseJson(updateData);

        // 2. Handle file uploads (both single and multiple)
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

        // 3. Process base64 images
        updateData = processImageFields(updateData);

        // 4. Special Transformation for tournamentsSection (Array-to-Object bridge)
        // In the DB, list is an object. But the frontend expects/sends an array.
        if (sectionName === 'tournamentsSection' && Array.isArray(updateData.list)) {
            if (updateData.list.length > 0) {
                updateData.list = { ...updateData.list[0] };
            } else {
                updateData.list = { posts: [] };
            }
        }

        // 5. Flatten and Apply Updates
        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, k) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + k;
                const value = obj[k];

                if (value === null) {
                    acc[fullPath] = null;
                } else if (isPlainObject(value)) {
                    Object.assign(acc, flattenObject(value, fullPath));
                } else {
                    acc[fullPath] = value;
                }
                return acc;
            }, {});
        };

        console.log(`[HomeController] Updating ${sectionName} with processed data:`, JSON.stringify(updateData, null, 2));
        const flattenedUpdates = flattenObject(updateData, sectionName);

        for (let [path, value] of Object.entries(flattenedUpdates)) {
            path = normalizeDuplicatedSectionPrefix(sectionName, path);
            path = normalizeHeroBackgroundPath(sectionName, path);

            // Clean/Transform values and RECONCILE IDs with current doc
            value = transformSchemaMismatches(path, value, home);

            if (value === null) {
                home.set(path, undefined);
            } else {
                home.set(path, value);
            }
            home.markModified(path);
        }

        await home.save();
        const target = home[sectionName];
        res.status(200).json({
            success: true,
            data: target
        });
    } catch (err) {
        console.error("Update Section Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        home.set(sectionName, undefined);
        home.markModified(sectionName);
        await home.save();
        res.status(200).json({
            success: true,
            message: 'Section deleted successfully'
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ARRAY SECTIONS
exports.addArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isLast = i === parts.length - 1;
            if (targetArray[part] === undefined || targetArray[part] === null) {
                targetArray[part] = isLast ? [] : {};
                home.markModified(parts.slice(0, i + 1).join('.'));
            }
            targetArray = targetArray[part];
        }

        if (!Array.isArray(targetArray)) {
            return res.status(400).json({ success: false, message: `${arrayPath} is not an array` });
        }

        // Build Payload from req.body (Already decrypted by middleware)
        let payload = normalizePaths(req.body || {});

        if (req.file) {
            setNested(payload, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(payload, file.fieldname, file.filename);
            });
        }
        payload = processImageFields(payload);
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

        if (arrayPath === 'testimonials.list') {
            for (const item of itemsToAdd) {
                if (typeof item.quote !== 'string' || !item.quote.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each testimonial must include a valid quote'
                    });
                }
                if (typeof item.parentName !== 'string' || !item.parentName.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each testimonial must include a valid parentName'
                    });
                }
                if (typeof item.relation !== 'string' || !item.relation.trim()) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each testimonial must include a valid relation'
                    });
                }

                item.quote = item.quote.trim();
                item.parentName = item.parentName.trim();
                item.relation = item.relation.trim();
            }
        }

        // The frontend may send the entire list including old items.
        // To satisfy "only new data should be created at a time", we strictly filter out 
        // items that already exist in the database, and ONLY push the new ones.

        for (const item of itemsToAdd) {
            let isDuplicate = false;

            if (item._id) {
                // Check by ID if provided
                isDuplicate = targetArray.some(t => t._id && t._id.toString() === item._id.toString());
            } else if (arrayPath === 'testimonials.list') {
                // For testimonials without ID, check by content
                isDuplicate = targetArray.some(t => {
                    const tQuote = typeof t.quote === 'string' ? t.quote.trim() : '';
                    const tParent = typeof t.parentName === 'string' ? t.parentName.trim() : '';
                    const tRel = typeof t.relation === 'string' ? t.relation.trim() : '';

                    return tQuote === item.quote && tParent === item.parentName && tRel === item.relation;
                });
            } else {
                // Generic duplicate check for other arrays
                isDuplicate = targetArray.some(t => JSON.stringify(t) === JSON.stringify(item));
            }

            // Only create new data at a time!
            if (!isDuplicate) {
                delete item._id;
                targetArray.push(item);
            }
        }

        home.markModified(arrayPath);
        await home.save();
        res.status(201).json({
            success: true,
            data: targetArray
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        let itemPath;
        if (req.params.itemId) {
            const item = targetArray.find(item => item._id && item._id.toString() === req.params.itemId);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
            // Get index of the item
            const index = targetArray.indexOf(item);
            itemPath = `${arrayPath}.${index}`;
        } else if (targetArray.length > 0) {
            itemPath = `${arrayPath}.0`;
        } else {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

        // Build updateData from req.body (Already decrypted by middleware)
        let updateData = normalizePaths(req.body || {});

        if (req.file) {
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
            });
        }
        updateData = processImageFields(updateData);

        // Deep update the item
        const applyItemUpdate = (prefix, data) => {
            for (const key in data) {
                const value = data[key];
                const fullPath = `${prefix}.${key}`;
                if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                    applyItemUpdate(fullPath, value);
                } else {
                    home.set(fullPath, value);
                    home.markModified(fullPath);
                }
            }
        };

        applyItemUpdate(itemPath, updateData);
        await home.save();
        res.status(200).json({
            success: true,
            data: targetArray
        });
    } catch (err) {
        console.error("Update Array Item Error:", err);
        res.status(500).json({
            encrypted: true,
            success: false,
            data: encryptData(err.message)
        });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        let decryptedData;
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            decryptedData = decryptData(encryptedData);
            if (typeof decryptedData === 'string') {
                try { decryptedData = JSON.parse(decryptedData); } catch (e) { }
            }
        } catch (error) {
            return res.status(400).json({
                encrypted: true,
                success: false,
                data: encryptData('Invalid encryption data')
            });
        }
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        let item;
        if (req.params.itemId) {
            item = targetArray.find(item => item._id && item._id.toString() === req.params.itemId);
        } else if (targetArray.length > 0) {
            item = targetArray[0];
        }

        if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

        if (req.params.itemId) {
            targetArray.pull(req.params.itemId);
        } else {
            targetArray.shift();
        }

        home.markModified(arrayPath);
        await home.save();
        res.status(200).json({
            success: true,
            data: targetArray
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSocialPost = async (req, res) => {
    try {
        const home = await getActiveHome();
        const { postId } = req.params;

        if (home.tournamentsSection && home.tournamentsSection.list && home.tournamentsSection.list.posts) {
            const posts = home.tournamentsSection.list.posts;
            const postIndex = posts.findIndex(p => p._id.toString() === postId);

            if (postIndex === -1) {
                return res.status(404).json({ success: false, message: 'Social post not found' });
            }

            posts.splice(postIndex, 1);
            home.markModified('tournamentsSection.list.posts');
            await home.save();
            res.status(200).json({
                success: true,
                data: home.tournamentsSection.list
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Posts not found'
            });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
