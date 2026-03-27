const Home = require('../models/Home');
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
    const imageFields = ['image', 'backgroundImage', 'mainImage', 'thumbnail', 'logo'];
    for (const field of imageFields) {
        if (data[field] && typeof data[field] === 'string' && data[field].startsWith('data:image')) {
            const savedPath = saveBase64Image(data[field]);
            if (savedPath) data[field] = savedPath;
        }
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
        res.status(200).json({ success: true, data: homeData });
    } catch (err) {
        console.error("Error fetching homepage data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch homepage data' });
    }
};

const Footer = require('../models/Footer');

// 1b. FOOTER ENDPOINT (shared across all pages)
exports.getFooterData = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!footer) footer = await Footer.create({});
        res.status(200).json({ success: true, data: footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch footer data' });
    }
};

exports.updateFooter = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
        if (!footer) footer = await Footer.create({});

        let updateData = { ...req.body };
        Object.assign(footer, updateData);
        await footer.save();
        res.status(200).json({ success: true, data: footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to update footer' });
    }
};

// 2. OBJECT SECTIONS (About, Footer, ProgramsAndFacilities, TournamentsSection, SocialSection) 
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        if (home[sectionName] === undefined) {
            return res.status(404).json({ success: false, message: 'Section not found' });
        }

        // Normalize legacy shapes to what the website frontend expects.
        if (sectionName === 'tournamentsSection') {
            const tournaments = JSON.parse(JSON.stringify(home[sectionName]));
            if (tournaments && tournaments.list && !Array.isArray(tournaments.list)) {
                tournaments.list = [tournaments.list];
            }
            if (tournaments && tournaments.list === undefined) tournaments.list = [];
            return res.status(200).json({ success: true, data: tournaments });
        }

        if (sectionName === 'programsAndFacilities') {
            const programs = JSON.parse(JSON.stringify(home[sectionName]));
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
            return res.status(200).json({ success: true, data: programs });
        }

        res.status(200).json({ success: true, data: home[sectionName] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
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

        // 2. Process any base64 images that might still be in the body
        updateData = processImageFields(updateData);

        // 3. APPLY UPDATES GENERICALLY
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

        console.log(`[HomeController] Updating section ${sectionName} with data:`, updateData);
        const flattenedUpdates = flattenObject(updateData, sectionName);
        console.log(`[HomeController] Flattened updates for Mongoose:`, flattenedUpdates);

        for (const [path, value] of Object.entries(flattenedUpdates)) {
            let normalizedPath = normalizeDuplicatedSectionPrefix(sectionName, path);
            normalizedPath = normalizeHeroBackgroundPath(sectionName, normalizedPath);
            if (value === null) {
                // Handle deletion for Maps or setting undefined for regular fields
                const parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('.'));
                const key = normalizedPath.substring(normalizedPath.lastIndexOf('.') + 1);
                try {
                    const parent = home.get(parentPath);
                    if (parent instanceof Map) {
                        parent.delete(key);
                    } else {
                        home.set(normalizedPath, undefined);
                    }
                } catch (e) { home.set(normalizedPath, undefined); }
            } else {
                home.set(normalizedPath, value);
            }
            // CRITICAL: Explicitly mark path as modified for deep updates/arrays
            home.markModified(normalizedPath);
        }

        await home.save();
        console.log(`[HomeController] Successfully saved section ${sectionName}. Returning:`, home[sectionName]);
        res.status(200).json({ success: true, data: home[sectionName] });
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
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
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
        payload = processImageFields(payload);

        // Support common client payloads:
        // - { quote, name, role }
        // - { list: [{ quote, name, role }, ...] }
        // - multipart/form-data with list as a JSON string
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
            // Clean up previously inserted empty objects (usually caused by wrong payload shape).
            for (let i = targetArray.length - 1; i >= 0; i--) {
                const t = targetArray[i] || {};
                const isEmpty = !t.quote && !t.parentName && !t.relation;
                if (isEmpty) targetArray.splice(i, 1);
            }

            for (const item of itemsToAdd) {
                const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
                const parentName = typeof item.parentName === 'string' ? item.parentName.trim() : '';
                const relation = typeof item.relation === 'string' ? item.relation.trim() : '';
                if (!quote || !parentName || !relation) {
                    return res.status(400).json({
                        success: false,
                        message: 'Each testimonial must include quote, parentName, and relation'
                    });
                }
            }
        }

        for (const item of itemsToAdd) targetArray.push(item);
        home.markModified(arrayPath);
        await home.save();
        res.status(201).json({ success: true, data: targetArray });
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
            const item = targetArray.id(req.params.itemId);
            if (!item) return res.status(404).json({ success: false, message: 'Item not found' });
            // Get index of the item
            const index = targetArray.indexOf(item);
            itemPath = `${arrayPath}.${index}`;
        } else if (targetArray.length > 0) {
            itemPath = `${arrayPath}.0`;
        } else {
            return res.status(404).json({ success: false, message: 'Item not found' });
        }

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
        res.status(200).json({ success: true, data: targetArray });
    } catch (err) {
        console.error("Update Array Item Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteArrayItem = (arrayPath) => async (req, res) => {
    try {
        const home = await getActiveHome();
        const parts = arrayPath.split('.');
        let targetArray = home;
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        let item;
        if (req.params.itemId) {
            item = targetArray.id(req.params.itemId);
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
        res.status(200).json({ success: true, message: 'Item deleted safely', data: targetArray });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSocialPost = async (req, res) => {
    try {
        const home = await getActiveHome();
        const { postKey } = req.params;

        if (home.tournamentsSection && home.tournamentsSection.list && home.tournamentsSection.list.posts) {
            home.tournamentsSection.list.posts.delete(postKey);
            home.markModified('tournamentsSection.list.posts');
            await home.save();
            res.status(200).json({ success: true, message: `Social post ${postKey} deleted`, data: home.tournamentsSection.list });
        } else {
            res.status(404).json({ success: false, message: 'Posts map not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
