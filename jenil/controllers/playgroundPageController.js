const PlaygroundPage = require('../models/PlaygroundPage');
const PlaygroundBooking = require('../models/PlaygroundBooking');

const getActivePlayground = async () => {
    let playground = await PlaygroundPage.findOne({ isActive: true });
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
        const playground = await getActivePlayground();
        let updateData = { ...req.body };
        if (req.file) {
            if (sectionName === 'hero') updateData.backgroundImage = req.file.filename;
            if (sectionName === 'formSection.presentation' || sectionName === 'formSection') updateData.mainImage = req.file.filename;
        }

        // Deep merge logic
        if (sectionName.includes('.')) {
            const parts = sectionName.split('.');
            let target = playground;
            for (let i = 0; i < parts.length - 1; i++) {
                target = target[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            target[lastPart] = { ...target[lastPart].toObject ? target[lastPart].toObject() : target[lastPart], ...updateData };
        } else {
            playground[sectionName] = { ...playground[sectionName].toObject(), ...updateData };
        }

        await playground.save();
        res.status(200).json({ success: true, data: playground[sectionName.split('.')[0]] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.deleteSection = (sectionName) => async (req, res) => {
    try {
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
        const bookings = await PlaygroundBooking.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};
