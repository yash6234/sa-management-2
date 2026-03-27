const AdmissionsPage = require('../models/AdmissionsPage');
const AdmissionSubmission = require('../models/AdmissionSubmission');

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
        const admissions = await getActiveAdmissions();
        let updateData = { ...req.body };
        if (req.file) {
            if (sectionName === 'hero') updateData.backgroundImage = req.file.filename;
        }

        // Recursively walk into sectionName path
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = admissions;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = { ...target[lastPart], ...updateData };
        } else {
            admissions[sectionName] = { ...admissions[sectionName].toObject(), ...updateData };
        }

        await admissions.save();
        res.status(200).json({ success: true, data: admissions[sectionName.split('.')[0]] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
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
        let submissionData = { ...req.body };
        
        // Handle file uploads (trainee photo, signatures)
        if (req.files) {
            if (req.files.photo) submissionData.photo = req.files.photo[0].filename;
            if (req.files.traineeSignature) submissionData.traineeSignature = req.files.traineeSignature[0].filename;
            if (req.files.fatherSignature) submissionData.fatherSignature = req.files.fatherSignature[0].filename;
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
        const submissions = await AdmissionSubmission.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: submissions });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.updateSubmissionStatus = async (req, res) => {
    try {
        const submission = await AdmissionSubmission.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, data: submission });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSubmission = async (req, res) => {
    try {
        const submission = await AdmissionSubmission.findByIdAndDelete(req.params.id);
        if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
        res.status(200).json({ success: true, message: 'Submission deleted safely' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
