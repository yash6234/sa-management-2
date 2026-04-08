const ContactPage = require('../models/ContactPage');
const ContactSubmission = require('../models/ContactSubmission');

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

const getActiveContact = async () => {
    let contact = await ContactPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!contact) contact = await ContactPage.create({ isActive: true });
    return contact;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getContactData = async (req, res) => {
    try {
        const contactData = await getActiveContact();
        res.status(200).json({ success: true, data: contactData });
    } catch (err) {
        console.error("Error fetching contact page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch contact data' });
    }
};

// 2. CONTACT MESSAGE SUBMISSION
exports.submitContactMessage = async (req, res) => {
    try {
        const submission = await ContactSubmission.create(req.body);
        res.status(201).json({ success: true, message: 'Message sent successfully', data: submission });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ADMIN SECTION MANAGEMENT
exports.getSection = (sectionName) => async (req, res) => {
    try {
        const contact = await getActiveContact();
        let target = contact;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                if (target) target = target[part];
            }
        } else {
            target = contact[sectionName];
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
        const contact = await getActiveContact();

        // Handle scalar sections like `mapIframe` cleanly (avoid spreading strings)
        const schemaPath = ContactPage.schema.path(sectionName);
        const isScalar = schemaPath && schemaPath.instance === 'String';

        if (isScalar) {
            const nextValue = req.body?.value ?? req.body?.[sectionName];
            if (nextValue === undefined) {
                return res.status(400).json({ success: false, message: 'Missing value to update' });
            }
            contact.set(sectionName, nextValue);
            contact.markModified(sectionName);
            await contact.save();
            return res.status(200).json({ success: true, data: contact[sectionName] });
        }

        const updateData = {};

        // 1) Normalize body keys (supports `title`, `hero[title]`, `hero.title`)
        for (const [key, value] of Object.entries(req.body || {})) {
            const relativePath = toSectionRelativeFieldPath(sectionName, key);
            setNested(updateData, relativePath, value);
        }

        // 2) Handle file uploads
        for (const file of getUploadedFiles(req)) {
            const relativePath = toSectionRelativeFieldPath(sectionName, file.fieldname);
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
            contact.set(normalizedPath, value === null ? undefined : value);
            contact.markModified(normalizedPath);
        }

        await contact.save();
        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], contact);
        res.status(200).json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
        const contact = await getActiveContact();
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = contact;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = undefined;
        } else {
            contact[sectionName] = undefined;
        }
        await contact.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. ADMIN SUBMISSION MANAGEMENT
exports.getAllSubmissions = async (req, res) => {
    try {
        const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSubmissionStatus = async (req, res) => {
    try {
        const submission = await ContactSubmission.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSubmission = async (req, res) => {
    try {
        const submission = await ContactSubmission.findByIdAndDelete(req.params.id);
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, message: 'Submission deleted' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
