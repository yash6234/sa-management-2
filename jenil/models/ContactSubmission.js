const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    subject: { type: String },
    message: { type: String, required: true },
    status: { type: String, enum: ['New', 'Contacted', 'Closed'], default: 'New' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.ContactSubmission || mongoose.model('ContactSubmission', contactSubmissionSchema);
