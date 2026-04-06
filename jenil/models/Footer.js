const mongoose = require('../utils/mongoose');

const footerSchema = new mongoose.Schema({
    academyName: { type: String, default: 'Gandhinagar Sports Academy' },
    missionDescription: { type: String, default: 'Professional Cricket Coaching in Gandhinagar focused on developing skills, discipline and sportsmanship.' },
    address: { type: String, default: 'Gandhinagar, Gujarat, India' },
    phone1: { type: String, default: '+91 9426142342' },
    phone2: { type: String, default: '+91 9824870000' },
    email: { type: String, default: 'info@gandhinagarsportsacademy.com' },
    officeHours: { type: String, default: '7 AM - 11 AM, 3 PM - 7:30 PM' },
    instagramUrl: { type: String },
    facebookUrl: { type: String },
    quickLinks: {
        type: [String],
        default: ['Home', 'About Academy', 'Programs', 'Gallery', 'Playground', 'Admissions', 'Contact']
    },
    copyright: { type: String, default: '© 2026 Gandhinagar Sports Academy. All rights reserved.' },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Footer || mongoose.model('Footer', footerSchema);
