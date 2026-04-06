const mongoose = require('../utils/mongoose');

const admissionSubmissionSchema = new mongoose.Schema({
    traineeName: { type: String },
    fatherName: { type: String },
    phone: { type: String },
    dob: { type: Date },
    address: { type: String },
    schoolName: { type: String },
    currentClass: { type: String },
    fatherOccupation: { type: String },

    // File uploads
    photo: { type: String },
    traineeSignature: { type: String },
    fatherSignature: { type: String },

    // Dropdown choices
    selectedSession: { type: String },
    selectedTimeSlot: { type: String },

    status: {
        type: String,
        enum: ['Pending', 'Contacted', 'Enrolled', 'Rejected'],
        default: 'Pending'
    },
    adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.AdmissionSubmission || mongoose.model('AdmissionSubmission', admissionSubmissionSchema);
