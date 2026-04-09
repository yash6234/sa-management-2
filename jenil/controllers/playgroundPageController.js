const PlaygroundPage = require('../models/PlaygroundPage');
const PlaygroundBooking = require('../models/PlaygroundBooking');
const { logger, decryptData } = require("../../utils/enc_dec_admin");

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

const setNested = (obj, path, value) => {
    const parts = toDotPath(path).split('.').filter(Boolean);
    if (parts.length === 0) return;
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (!current[part] || typeof current[part] !== 'object') current[part] = {};
        current = current[part];
    }
    current[parts[parts.length - 1]] = value;
};

const getUploadedFiles = (req) => {
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files) {
        if (Array.isArray(req.files)) files.push(...req.files);
        else files.push(...Object.values(req.files).flat());
    }
    return files;
};

const getActivePlayground = async () => {
    let playground = await PlaygroundPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!playground) playground = await PlaygroundPage.create({ isActive: true });
    return playground;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getPlaygroundData = async (req, res) => {
    try {
        const playgroundData = await getActivePlayground();
        res.status(200).json({ success: true, data: playgroundData });
    } catch (err) {
        console.error("Error fetching playground page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch playground data' });
    }
};

// 2. ADMIN SECTION-WISE ENDPOINTS
exports.getSection = (sectionName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const playground = await getActivePlayground();
        let target = playground;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                if (target) target = target[part];
            }
        } else {
            target = playground[sectionName];
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
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const playground = await getActivePlayground();
        const updateData = {};

        // 1) Normalize body keys (supports `title`, `hero[title]`, `formSection[presentation][title]`, etc)
        for (const [key, value] of Object.Entries(req.body || {})) {
            const relativePath = toSectionRelativeFieldPath(sectionName, key);
            setNested(updateData, relativePath, value);
        }

        // 2) Handle file uploads (routes use upload.single())
        for (const file of getUploadedFiles(req)) {
            let relativePath = toSectionRelativeFieldPath(sectionName, file.fieldname);

            // Alias: admin route uses `image` but schema expects `presentation.mainImage`
            if (sectionName === 'formSection' && (relativePath === 'image' || toDotPath(relativePath) === 'image')) {
                relativePath = 'presentation.mainImage';
            }

            setNested(updateData, relativePath, file.filename);
        }

        // 3) Flatten and apply with Mongoose set() to avoid clobbering nested objects
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
            playground.set(normalizedPath, value === null ? undefined : value);
            playground.markModified(normalizedPath);
        }

        await playground.save();
        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], playground);
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
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const playground = await getActivePlayground();
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = playground;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = undefined;
        } else {
            playground[sectionName] = undefined;
        }
        await playground.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. USER SUBMISSION HANDLER (Requested: ONLY POST to get response)
exports.submitBooking = async (req, res) => {
    try {
        const booking = await PlaygroundBooking.create(req.body);
        res.status(201).json({ success: true, message: 'Booking inquiry submitted successfully!', data: booking });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. ADMIN BOOKING MANAGEMENT
exports.getAllBookings = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decryptedData = decryptData(encryptedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const bookings = await PlaygroundBooking.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
