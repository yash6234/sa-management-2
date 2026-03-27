const mongoose = require('mongoose');

const programsPageSchema = new mongoose.Schema({
    hero: {
        tagline: { type: String, default: "OUR PROGRAMS" },
        title: { type: String, default: "Athletic Excellence Programs" },
        description: { type: String, default: "Find the right training level for your journey at Gandhinagar Sports Academy." },
        backgroundImage: { type: String }
    },

    // Level-based sections
    levels: {
        beginner: {
            title: { type: String, default: "Beginner Level" },
            description: { type: String },
            features: [String],
            image: { type: String }
        },
        intermediate: {
            title: { type: String, default: "Intermediate Level" },
            description: { type: String },
            features: [String],
            image: { type: String }
        },
        advanced: {
            title: { type: String, default: "Advanced Level" },
            description: { type: String },
            features: [String],
            image: { type: String }
        },
        camp: {
            title: { type: String, default: "Special Coaching & Summer Camps" },
            description: { type: String },
            features: { type: [String], default: [] },
            duration: { type: String },
            image: { type: String }
        }
    },

    // Optional legacy/admin section used by /programs/summer-camp endpoints
    specialPrograms: {
        sectionTitle: { type: String, default: "Special Programs" },
        list: [{
            title: { type: String },
            description: { type: String },
            duration: { type: String },
            features: { type: [String], default: [] },
            image: { type: String }
        }]
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.ProgramsPage || mongoose.model('ProgramsPage', programsPageSchema);
