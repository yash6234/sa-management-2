const mongoose = require('../utils/mongoose');

const galleryPageSchema = new mongoose.Schema({
    hero: {
        tagline: { type: String, default: "MOMENTS AT GANDHINAGAR SPORTS ACADEMY" },
        title: { type: String, default: "Gallery" },
        description: { type: String, default: "Explore our facilities, training sessions, and academy life through photos." },
        backgroundImage: { type: String }
    },

    trainingMoments: {
        title: { type: String, default: "Our Training Moments" },
        description: { type: String, default: "Explore glimpses of daily practice sessions, matches, summer camps, achievements, and events that shape every athlete's journey at Gandhinagar Sports Academy." },
        list: [{
            title: { type: String },
            image: { type: String }
        }]
    },

    categories: {
        type: [String],
        default: ["Facilities", "Training", "Events"]
    },

    images: [{
        image: { type: String, required: true },
        category: { type: String, default: "General" },
        isFeatured: { type: Boolean, default: false },
        title: { type: String }
    }],

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.GalleryPage || mongoose.model('GalleryPage', galleryPageSchema);
