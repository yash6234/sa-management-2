const ContactPage = require('../models/ContactPage');
const ContactSubmission = require('../models/ContactSubmission');

const getActiveContact = async () => {
    let contact = await ContactPage.findOne({ isActive: true });
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
        let updateData = { ...req.body };
        
        if (req.file && sectionName === 'hero') {
            updateData.backgroundImage = req.file.filename || req.file.path;
        }

        // Recursive merge logic
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = contact;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = { ...target[lastPart].toObject ? target[lastPart].toObject() : target[lastPart], ...updateData };
        } else {
            contact[sectionName] = { ...contact[sectionName].toObject ? contact[sectionName].toObject() : contact[sectionName], ...updateData };
        }

        await contact.save();
        res.status(200).json({ success: true, data: contact[sectionName.split('.')[0]] });
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
