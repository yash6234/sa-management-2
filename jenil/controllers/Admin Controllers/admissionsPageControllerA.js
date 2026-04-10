const AdmissionsPage = require('../../models/AdmissionsPage');
const AdmissionSubmission = require('../../models/AdmissionSubmission');
const { logger, decryptData } = require("../../../utils/enc_dec_admin");

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

const getActiveAdmissions = async () => {
    let admissions = await AdmissionsPage.findOne({ isActive: true }).sort({ updatedAt: -1, createdAt: -1, _id: -1 });
    if (!admissions) admissions = await AdmissionsPage.create({ isActive: true });
    return admissions;
};

// 1. PUBLIC AGGREGATED ENDPOINT 
exports.getAdmissionsData = async (req, res) => {
    try {
        const admissionsData = await getActiveAdmissions();
        res.status(200).json({ success: true, data: admissionsData });
    } catch (err) {
        console.error("Error fetching admissions page data:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch admissions data' });
    }
};

// 2. ADMIN CONFIG SECTIONS (Hero, FormContent, Benefits, Process, Config)
exports.getSection = (sectionName) => async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const admissions = await getActiveAdmissions();
        let target = admissions;
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            for (const part of parts) {
                if (target) target = target[part];
            }
        } else {
            target = admissions[sectionName];
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
        const admissions = await getActiveAdmissions();

        const updateData = {};

        // 1) Normalize body keys (supports both `title` and `hero[title]` / `hero.title`)
        for (const [key, value] of Object.Entries(req.body || {})) {
            const relativePath = toSectionRelativeFieldPath(sectionName, key);
            setNested(updateData, relativePath, value);
        }

        // 2) Handle file uploads (supports `backgroundImage` and `hero[backgroundImage]` etc)
        for (const file of getUploadedFiles(req)) {
            const relativePath = toSectionRelativeFieldPath(sectionName, file.fieldname);
            setNested(updateData, relativePath, file.filename);
        }

        // 3) Flatten and apply with Mongoose set() to avoid clobbering nested objects
        const flattenObject = (obj, prefix = '') => {
            return Object.keys(obj).reduce((acc, key) => {
                const pre = prefix.length ? prefix + '.' : '';
                const fullPath = pre + key;

                if (obj[key] === null) {
                    acc[fullPath] = null;
                } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    Object.assign(acc, flattenObject(obj[key], fullPath));
                } else {
                    acc[fullPath] = obj[key];
                }

                return acc;
            }, {});
        };

        const flattenedUpdates = flattenObject(updateData, sectionName);
        for (const [path, value] of Object.entries(flattenedUpdates)) {
            let normalizedPath = normalizeDuplicatedSectionPrefix(sectionName, path);
            normalizedPath = normalizeHeroBackgroundPath(sectionName, normalizedPath);
            admissions.set(normalizedPath, value === null ? undefined : value);
            admissions.markModified(normalizedPath);
        }

        await admissions.save();

        const parts = sectionName.split('.');
        const result = parts.reduce((obj, part) => obj && obj[part], admissions);
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
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const admissions = await getActiveAdmissions();
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = admissions;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = undefined;
        } else {
            admissions[sectionName] = undefined;
        }
        await admissions.save();
        res.status(200).json({ success: true, message: `Section ${sectionName} has been cleared/reset` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. ADMISSION SUBMISSIONS (Handling the form fill)
exports.submitAdmissionEnquiry = async (req, res) => {
    try {
        const submissionData = { ...(req.body || {}) };

        // Frontend -> DB mapping
        if (submissionData.dateOfBirth && !submissionData.dob) submissionData.dob = submissionData.dateOfBirth;
        if (submissionData.session && !submissionData.selectedSession) submissionData.selectedSession = submissionData.session;
        if (submissionData.time && !submissionData.selectedTimeSlot) submissionData.selectedTimeSlot = submissionData.time;

        if (typeof submissionData.dob === 'string') {
            const parsedDob = new Date(submissionData.dob);
            if (!Number.isNaN(parsedDob.getTime())) submissionData.dob = parsedDob;
            else delete submissionData.dob;
        }

        delete submissionData.dateOfBirth;
        delete submissionData.session;
        delete submissionData.time;

        // Handle file uploads (multer.any() returns an array)
        for (const file of getUploadedFiles(req)) {
            const fieldDot = toDotPath(file.fieldname);
            if (fieldDot.endsWith('traineePhoto') || fieldDot.endsWith('photo')) submissionData.photo = file.filename;
            else if (fieldDot.endsWith('traineeSignature')) submissionData.traineeSignature = file.filename;
            else if (fieldDot.endsWith('fatherSignature')) submissionData.fatherSignature = file.filename;
        }

        const submission = await AdmissionSubmission.create(submissionData);
        res.status(201).json({ success: true, message: 'Enquiry submitted successfully', data: submission });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 4. ADMIN SUBMISSION MANAGEMENT
exports.getAllSubmissions = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const submissions = await AdmissionSubmission.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSubmissionStatus = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                logger.info("User Login request received");
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
                logger.info(`Decrypted login data - ${decryptedData.email} - ${decryptedData.password}`);
            }
        } catch (e) { }
        const submission = await AdmissionSubmission.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSubmission = async (req, res) => {
    try {
        try {
            const encryptedData = req.params.data || req.body.data || req.query.data;
            if (encryptedData) {
                const decodedData = decodeURIComponent(encryptedData);
                const decryptedData = decryptData(decodedData);
            }
        } catch (e) { }
        const submission = await AdmissionSubmission.findByIdAndDelete(req.params.id);
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, message: 'Submission deleted safely' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
