const AboutAcademy = require('../../models/AboutAcademy');
const { saveBase64Image } = require('../../utils/fileUtils');
const { decryptData: decryptCryptoJS } = require('../../utils/encryption');
const { logger, decryptData } = require("../../../utils/enc_dec_admin");

const parseJsonIfLikely = (value) => {
    if (typeof value !== 'string' || value === '') return value;
    const trimmed = value.trim();
    if (!(trimmed.startsWith('{') && trimmed.endsWith('}')) && !(trimmed.startsWith('[') && trimmed.endsWith(']'))) return value;
    try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parseJsonIfLikely(parsed); // Recursive unescape
        return parsed;
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

const normalizeIntroParagraphsPath = (sectionName, fullPath) => {
    const sectionDot = toDotPath(sectionName);
    if (sectionDot !== 'introSection' || typeof fullPath !== 'string') return fullPath;

    // Frontend uses `introSection.paragraphs`, DB uses `introSection.description`
    return fullPath.replace(/^introSection\.paragraphs(\.|$)/, 'introSection.description$1');
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
                    try {
                        const decrypted = decryptCryptoJS(value);
                        // If it decrypts to a string (path), use it. If it's an object, check if it has a url/path.
                        if (typeof decrypted === 'string') {
                            result[key] = decrypted;
                        } else if (decrypted && typeof decrypted === 'object') {
                            result[key] = decrypted.url || decrypted.path || decrypted.filename || value;
                        }
                    } catch (err) {
                        // If decryption fails, keep original
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

const getActiveAbout = async () => {
    let about = await AboutAcademy.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!about) about = await AboutAcademy.create({ isActive: true });
    return about;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getAboutData = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            const decodedData = decodeURIComponent(encryptedData);
            decryptedData = decryptData(decodedData);
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            const decodedData = decodeURIComponent(encryptedData);
            decryptedData = decryptData(decodedData);
        } catch (e) { }
        const about = await getActiveAbout();
        const intro = about.introSection?.toObject ? about.introSection.toObject() : (about.introSection || {});
        const mission = about.mission?.toObject ? about.mission.toObject() : (about.mission || {});

        // Backward compatibility: older DBs used `introSection.paragraphs`
        if (intro && intro.description === undefined && Array.isArray(intro.paragraphs)) {
            intro.description = intro.paragraphs;
        }
        if (intro && Object.prototype.hasOwnProperty.call(intro, 'paragraphs')) {
            delete intro.paragraphs;
        }
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
        let decryptedData;
        try {
            if (req.adminData && isPlainObject(req.adminData)) {
                decryptedData = req.adminData;
            } else if (req.decryptedBody && isPlainObject(req.decryptedBody)) {
                decryptedData = req.decryptedBody;
            }

            if (!decryptedData || Object.keys(decryptedData).length === 0 || (decryptedData.data && typeof decryptedData.data === 'string')) {
                const encryptedData = req.params.data || req.body.data || req.query.data;
                if (encryptedData) {
                    const decodedData = decodeURIComponent(encryptedData);
                    let firstLevel = decryptData(decodedData);

                    if (firstLevel && firstLevel.data && typeof firstLevel.data === 'string') {
                        try {
                            decryptedData = decryptData(firstLevel.data);
                        } catch (e) {
                            decryptedData = firstLevel;
                        }
                    } else {
                        decryptedData = firstLevel;
                    }
                }
            }

            if (decryptedData && typeof decryptedData === 'string') {
                try { decryptedData = JSON.parse(decryptedData); } catch (e) { }
            }
        } catch (error) {
            console.error(`[AboutController] Decryption failed in updateSection:`, error);
        }
        const about = await getActiveAbout();
        const updateData = {};

        const mapMergedPath = (rawPath) => {
            const dot = toDotPath(rawPath);
            if (!dot) return null;

            // `introSection` intro text: renamed `paragraphs` -> `description`
            if (dot === 'description' || dot.startsWith('description.')) return `introSection.${dot}`;
            if (dot === 'paragraphs') return 'introSection.description';
            if (dot.startsWith('paragraphs.')) return `introSection.description.${dot.slice('paragraphs.'.length)}`;
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
        let normalizedBody = normalizePaths(req.body || {});
        normalizedBody = processImageFields(normalizedBody);

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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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

        // Frontend compatibility: `/about/intro` expects `{ paragraphs: string[] }`
        if (sectionName === 'introSection') {
            const intro = target?.toObject ? target.toObject() : (target || {});
            const paragraphs = Array.isArray(intro.paragraphs)
                ? intro.paragraphs
                : (Array.isArray(intro.description) ? intro.description : []);

            return res.status(200).json({
                success: true,
                data: {
                    description: Array.isArray(intro.description) ? intro.description : null,
                }
            });
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
        const about = await getActiveAbout();
        
        // 0. Build base payload from decryptedData (The Secure Source)
        const rawPayload = {};
        const sourceData = (decryptedData && Object.keys(decryptedData).length > 0) ? decryptedData : (req.body || {});
        
        for (const [key, val] of Object.entries(sourceData)) {
            rawPayload[key] = (typeof val === 'string') ? parseJsonIfLikely(val) : val;
        }

        // 1. Normalize dots/brackets and unwrap nested 'body' field if present
        let updateData = normalizePaths(rawPayload);
        if (isPlainObject(updateData.body)) {
            const bodyContent = updateData.body;
            delete updateData.body;
            Object.assign(updateData, bodyContent);
        }

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

        // 4. Flatten and Apply Updates
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

        console.log(`[AboutController] Updating ${sectionName} with processed data:`, JSON.stringify(updateData, null, 2));
        const flattenedUpdates = flattenObject(updateData, sectionName);

        for (let [path, value] of Object.entries(flattenedUpdates)) {
            path = normalizeDuplicatedSectionPrefix(sectionName, path);
            path = normalizeHeroBackgroundPath(sectionName, path);
            path = normalizeIntroParagraphsPath ? normalizeIntroParagraphsPath(sectionName, path) : path;
            
            if (value === null) {
                about.set(path, undefined);
            } else {
                about.set(path, value);
            }
            about.markModified(path);
        }

        await about.save();
        
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
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

        const getNestedValue = (obj, dotPath) => {
            if (!obj || typeof obj !== 'object' || typeof dotPath !== 'string') return undefined;
            return dotPath.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
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

        // Build a nested payload from multipart keys like `list[0][name]`
        let payload = {};
        const rawBody = req.body && typeof req.body === 'object' ? req.body : {};
        for (const [rawKey, rawValue] of Object.entries(rawBody)) {
            const dotKey = toDotPath(rawKey);
            setNested(payload, dotKey, parseJsonIfLikely(rawValue));
        }
        payload = processImageFields(payload);

        if (req.file) {
            setNested(payload, toDotPath(req.file.fieldname), req.file.filename);
        }

        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach((file) => {
                setNested(payload, toDotPath(file.fieldname), file.filename);
            });
        }

        payload = normalizeIndexObjectsToArrays(payload);

        const schemaPath = AboutAcademy.schema.path(arrayPath);
        const expectsStringItems = schemaPath?.caster?.instance === 'String';
        const expectsEmbeddedDocs = schemaPath?.instance === 'Array' && schemaPath?.casterConstructor?.name === 'EmbeddedDocument';

        let itemsToAdd;
        // 1. Try exact path match in payload
        const directItems = getNestedValue(payload, arrayPath);
        // 2. Try last part of path (e.g. 'features' from 'whyChooseUs.features')
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

        const allowedEmbeddedKeys = expectsEmbeddedDocs && schemaPath?.schema?.paths
            ? Object.keys(schemaPath.schema.paths).filter((k) => k !== '_id' && k !== '__v')
            : null;

        const pickFirstString = (obj, keys) => {
            if (!obj || typeof obj !== 'object') return undefined;

            const normalized = {};
            for (const [k, v] of Object.entries(obj)) {
                const lower = k.toLowerCase();
                if (normalized[lower] === undefined) normalized[lower] = v;
            }

            for (const key of keys) {
                const direct = obj[key];
                const viaLower = normalized[key.toLowerCase()];
                const candidate = typeof direct === 'string' ? direct : (typeof viaLower === 'string' ? viaLower : undefined);
                if (typeof candidate === 'string' && candidate.trim().length > 0) return candidate;
            }
            return undefined;
        };

        // If admin sends item data as `list` JSON but uploads the image as a top-level `image` field,
        // merge that file into the item so it doesn't get saved as an imageless card.
        if (expectsEmbeddedDocs && allowedEmbeddedKeys?.length && Array.isArray(itemsToAdd) && itemsToAdd.length > 0) {
            const rootDefaults = {
                name: pickFirstString(payload, ['name', 'founderName', 'fullName', 'title']),
                role: pickFirstString(payload, ['role', 'position', 'designation', 'subtitle']),
                bio: pickFirstString(payload, ['bio', 'description', 'about', 'text']),
                image: pickFirstString(payload, ['image', 'imageUrl', 'photo', 'img', 'src', 'url', 'path', 'file', 'imageFile', 'founderImage', 'founderPhoto']),
            };

            const hasAnyRootDefault = Object.values(rootDefaults).some((v) => typeof v === 'string' && v.trim().length > 0);
            if (hasAnyRootDefault) {
                itemsToAdd = itemsToAdd.map((item, index) => {
                    if (!isPlainObject(item)) return item;

                    // Only apply root defaults when adding a single card (avoid duplicating across batch adds)
                    if (itemsToAdd.length > 1 && index !== 0) return item;

                    const merged = { ...item };
                    for (const [key, value] of Object.entries(rootDefaults)) {
                        if (!allowedEmbeddedKeys.includes(key)) continue;
                        const existing = merged[key];
                        const isEmptyString = typeof existing === 'string' && existing.trim().length === 0;
                        const isMissing = existing === undefined || existing === null || isEmptyString;
                        if (isMissing && typeof value === 'string' && value.trim().length > 0) {
                            merged[key] = value;
                        }
                    }
                    return merged;
                });
            }
        }

        const cleanEmbeddedItem = (item) => {
            if (!isPlainObject(item)) return null;

            // Map common aliases (helps generic admin forms)
            const mapped = { ...item };
            if (allowedEmbeddedKeys?.includes('name') && (mapped.name === undefined || (typeof mapped.name === 'string' && mapped.name.trim().length === 0))) {
                mapped.name = pickFirstString(item, ['name', 'founderName', 'fullName', 'title']);
            }
            if (allowedEmbeddedKeys?.includes('role') && (mapped.role === undefined || (typeof mapped.role === 'string' && mapped.role.trim().length === 0))) {
                mapped.role = pickFirstString(item, ['role', 'position', 'designation', 'subtitle']);
            }
            if (allowedEmbeddedKeys?.includes('bio') && (mapped.bio === undefined || (typeof mapped.bio === 'string' && mapped.bio.trim().length === 0))) {
                mapped.bio = pickFirstString(item, ['bio', 'description', 'about', 'text']);
            }
            if (allowedEmbeddedKeys?.includes('image') && (mapped.image === undefined || (typeof mapped.image === 'string' && mapped.image.trim().length === 0))) {
                mapped.image = pickFirstString(item, ['image', 'imageUrl', 'photo', 'img', 'src', 'url', 'path', 'file', 'imageFile', 'founderImage', 'founderPhoto']);
            }

            if (!allowedEmbeddedKeys) {
                // Avoid adding an empty object (it would create a card with only _id)
                const hasAnyValue = Object.values(mapped).some((v) => v !== undefined && v !== null && (typeof v !== 'string' || v.trim().length > 0));
                return hasAnyValue ? mapped : null;
            }

            const cleaned = {};
            for (const key of allowedEmbeddedKeys) {
                const val = mapped[key];
                if (val === undefined || val === null) continue;
                if (typeof val === 'string') {
                    const trimmed = val.trim();
                    if (trimmed.length === 0) continue;
                    cleaned[key] = trimmed;
                } else {
                    cleaned[key] = val;
                }
            }

            return Object.keys(cleaned).length > 0 ? cleaned : null;
        };

        const coerceStringItem = (item) => {
            if (typeof item === 'string') return item;
            if (!isPlainObject(item)) return null;

            // Common keys for string arrays (features, urls, images, etc)
            const candidates = ['value', 'text', 'feature', 'features', 'label', 'name', 'title', 'image', 'url', 'src', 'path', 'item'];
            for (const key of candidates) {
                if (typeof item[key] === 'string') return item[key];
                // Handle case where an array of 1 string is sent under the key
                if (Array.isArray(item[key]) && item[key].length === 1 && typeof item[key][0] === 'string') return item[key][0];
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
            itemsToAdd = itemsToAdd.map((item) => cleanEmbeddedItem(item)).filter(Boolean);
        } else {
            // Unknown schema path: keep it conservative to avoid bad casts
            itemsToAdd = itemsToAdd
                .filter((item) => isPlainObject(item))
                .filter((item) => Object.keys(item).length > 0);
        }

        if (itemsToAdd.length === 0) {
            // Allow creating a blank embedded-doc item (useful for admin "Add card" buttons)
            const fileList = Array.isArray(req.files) ? req.files : (req.files ? Object.values(req.files).flat() : []);
            const hasAnyFile = Boolean(req.file) || fileList.length > 0;

            const hasMeaningfulBody = Object.values(rawBody).some((v) => {
                if (v === null || v === undefined) return false;
                if (typeof v === 'string') return v.trim().length > 0;
                if (Array.isArray(v)) return v.length > 0;
                if (typeof v === 'object') return Object.keys(v).length > 0;
                return true;
            });

            if (expectsEmbeddedDocs && allowedEmbeddedKeys?.length && !hasMeaningfulBody && !hasAnyFile) {
                const blankItem = {};
                for (const key of allowedEmbeddedKeys) {
                    const instance = schemaPath?.schema?.paths?.[key]?.instance;
                    if (instance === 'String') blankItem[key] = '';
                    else if (instance === 'Number') blankItem[key] = 0;
                    else if (instance === 'Boolean') blankItem[key] = false;
                    else if (instance === 'Array') blankItem[key] = [];
                    else blankItem[key] = null;
                }
                itemsToAdd = [blankItem];
            } else {
                return res.status(400).json({ success: false, message: 'No valid item found to add' });
            }
        }

        for (const item of itemsToAdd) { delete item._id; targetArray.push(item); }
        about.markModified(arrayPath);
        await about.save();
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
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
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
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const about = await getActiveAbout();
        const parts = arrayPath.split('.');
        let targetArray = about;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        if (req.params.itemId) {
        const item = targetArray.find(item => item._id && item._id.toString() === req.params.itemId);
            if (item) {
                targetArray.pull(req.params.itemId);
            } else {
                // Try as index
                const index = parseInt(req.params.itemId);
                if (!isNaN(index) && index >= 0 && index < targetArray.length) {
                    targetArray.splice(index, 1);
                } else {
                    return res.status(404).json({ success: false, message: 'Item not found' });
                }
            }
        } else if (req.params.index !== undefined) {
             const index = parseInt(req.params.index);
             if (!isNaN(index) && index >= 0 && index < targetArray.length) {
                targetArray.splice(index, 1);
            } else {
                return res.status(404).json({ success: false, message: 'Invalid index' });
            }
        }

        about.markModified(arrayPath);
        await about.save();
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItemByIndex = (arrayPath) => async (req, res) => {
    logger.info("User Login request received");
    const encryptedData = req.params.data || req.body.data || req.query.data;
    const decodedData = decodeURIComponent(encryptedData);
    const decryptedData = decryptData(decodedData);
    logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
    req.params.itemId = req.params.index;
    return exports.deleteArrayItem(arrayPath)(req, res);
};
