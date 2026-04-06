const mongoose = require('../utils/mongoose');

const programsPageSchema = new mongoose.Schema({
    hero: {
        tagline: { type: String, default: "OUR PROGRAMS" },
        title: { type: String, default: "Athletic Excellence Programs" },
        description: { type: String, default: "Find the right training level for your journey at Gandhinagar Sports Academy." },
        backgroundImage: { type: String }
    },

    // Level-based sections - Now an array with IDs
    levels: [{
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        key: { type: String, required: true }, // 'beginner', 'intermediate', 'advanced', 'camp'
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        features: [{
            _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
            text: { type: String }
        }],
        duration: { type: String, default: "" },
        image: { type: String, default: "" }
    }],

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.ProgramsPage || mongoose.model('ProgramsPage', programsPageSchema);
