const mongoose = require('mongoose');

const programsPageSchema = new mongoose.Schema({
    hero: {
        tagline: { type: String, default: "OUR PROGRAMS" },
        title: { type: String, default: "Athletic Excellence Programs" },
        description: { type: String, default: "Find the right training level for your journey at Gandhinagar Sports Academy." },
        backgroundImage: { type: String }
    },

    // Level-based sections
    // Public frontend expects: `levels.beginner|intermediate|advanced|camp`
    levels: {
        beginner: {
            title: { type: String, default: "Beginner Level" },
            description: { type: String, default: "" },
            features: { type: [String], default: [] },
            image: { type: String, default: "" }
        },
        intermediate: {
            title: { type: String, default: "Intermediate Level" },
            description: { type: String, default: "" },
            features: { type: [String], default: [] },
            image: { type: String, default: "" }
        },
        advanced: {
            title: { type: String, default: "Advanced Level" },
            description: { type: String, default: "" },
            features: { type: [String], default: [] },
            image: { type: String, default: "" }
        },
        camp: {
            title: { type: String, default: "Special Coaching & Summer Camps" },
            description: { type: String, default: "" },
            features: { type: [String], default: [] },
            duration: { type: String, default: "" },
            image: { type: String, default: "" }
        }
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.ProgramsPage || mongoose.model('ProgramsPage', programsPageSchema);
