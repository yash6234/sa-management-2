const Home = require('../models/Home');
const { saveBase64Image } = require('../utils/fileUtils');

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
    let home = await Home.findOne({ isActive: true });
    if (!home) home = await Home.create({ isActive: true });
    return home;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getHomePageData = async (req, res) => {
    try {
        console.log(1)
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
        let footer = await Footer.findOne({ isActive: true });
        if (!footer) footer = await Footer.create({});
        res.status(200).json({ success: true, data: footer });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch footer data' });
    }
};

exports.updateFooter = async (req, res) => {
    try {
        let footer = await Footer.findOne({ isActive: true });
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
            setNested(updateData, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(updateData, file.fieldname, file.filename);
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

        const flattenedUpdates = flattenObject(updateData, sectionName);
        for (const [path, value] of Object.entries(flattenedUpdates)) {
            if (value === null) {
                // Handle deletion for Maps or setting undefined for regular fields
                const parentPath = path.substring(0, path.lastIndexOf('.'));
                const key = path.substring(path.lastIndexOf('.') + 1);
                try {
                    const parent = home.get(parentPath);
                    if (parent instanceof Map) {
                        parent.delete(key);
                    } else {
                        home.set(path, undefined);
                    }
                } catch (e) { home.set(path, undefined); }
            } else {
                home.set(path, value);
            }
        }

        await home.save();
        res.status(200).json({ success: true, data: home[sectionName] });
    } catch (err) {
        console.error("Update Section Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const home = await getActiveHome();
        home[sectionName] = undefined;
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
        for (const part of parts) {
            targetArray = targetArray[part];
        }

        let newItem = normalizePaths(req.body);
        if (req.file) {
            setNested(newItem, req.file.fieldname, req.file.filename);
        }
        if (req.files) {
            const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
            files.forEach(file => {
                setNested(newItem, file.fieldname, file.filename);
            });
        }
        newItem = processImageFields(newItem);

        targetArray.push(newItem);
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
            await home.save();
            res.status(200).json({ success: true, message: `Social post ${postKey} deleted`, data: home.tournamentsSection.list });
        } else {
            res.status(404).json({ success: false, message: 'Posts map not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
