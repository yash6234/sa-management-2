const mongoose = require('mongoose');

const aboutAcademySchema = new mongoose.Schema({
    hero: {
        subtitle: { type: String, default: "ABOUT ACADEMY" },
        title: { type: String, default: "Gandhinagar Sports Academy" },
        description: { type: String, default: "Why choose Gandhinagar Sports Academy? Because here, dreams take shape without compromise. We help athletes excel in sports while achieving academic success with world-class facilities and expert coaching." },
        backgroundImage: { type: String }
    },

    introSection: {
        paragraphs: { type: [String], default: [] }
    },

    mission: {
        sectionTitle: { type: String, default: "Our Mission" },
        items: [
            {
                type: { type: String, default: "Vision" },
                description: { type: String, default: "Define our long-term aspirations and direction for young cricketers." },
                icon: { type: String }
            },
            {
                type: { type: String, default: "Mission" },
                description: { type: String, default: "Outline our core objectives and training strategies." },
                icon: { type: String }
            },
            {
                type: { type: String, default: "Goals" },
                description: { type: String, default: "Set measurable milestones for sporting success." },
                icon: { type: String }
            }
        ],
        imageCollage: [{ type: String }] // Array of 4 images for the collage
    },

    directorsMessage: {
        sectionTitle: { type: String, default: "Director's Message" },
        text: { type: String },
        subText: { type: String },
        image: { type: String }
    },

    founders: {
        sectionTitle: { type: String, default: "Our Founders" },
        sectionSubtitle: { type: String, default: "The people behind Gandhinagar Sports Academy" },
        list: [{
            name: { type: String },
            role: { type: String },
            bio: { type: String },
            image: { type: String }
        }]
    },

    whyChooseUs: {
        sectionTitle: { type: String, default: "Why Choose Us" },
        features: { type: [String], default: [] }
    },


    journey: {
        sectionTitle: { type: String, default: "Our Journey" },
        list: [{
            year: { type: String },
            title: { type: String },
            description: { type: String },
            icon: { type: String }
        }]
    },

    values: {
        sectionTitle: { type: String, default: "Our Values" },
        list: [{
            title: { type: String },
            description: { type: String },
            icon: { type: String }
        }]
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.AboutAcademy || mongoose.model('AboutAcademy', aboutAcademySchema);
