const mongoose = require('mongoose');

const playgroundPageSchema = new mongoose.Schema({
    hero: {
        subtitle: { type: String, default: "RESERVE YOUR GROUND" },
        title: { type: String, default: "Playground Booking" },
        description: { type: String, default: "Reserve our professional grounds for cricket or football at your convenience." },
        backgroundImage: { type: String }
    },

    // Consolidated section for everything below the Hero
    formSection: {
        presentation: {
            title: { type: String, default: "Book Your Favorite Ground!" },
            subtitle: { type: String, default: "Get Ready for an Epic Game!" },
            description: { type: String, default: "Choose your favorite date, pick your ground, and select your playtime to unlock unbeatable pricing. Let's make every moment on the field count and create unforgettable memories together!" },
            mainImage: { type: String }
        },
        config: {
            sports: [
                { name: { type: String, default: "Cricket" }, icon: { type: String, default: "🏏" } },
                { name: { type: String, default: "Football" }, icon: { type: String, default: "⚽" } }
            ],
            grounds: [
                { name: { type: String, default: "GROUND-A" } },
                { name: { type: String, default: "GROUND-B" } }
            ],
            slots: [
                { type: { type: String, default: "Full-Day" } },
                { type: { type: String, default: "Half-Day" } }
            ],
            pricing: {
                fullDay: { type: Number, default: 0 },
                halfDay: { type: Number, default: 0 }
            }
        }
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.PlaygroundPage || mongoose.model('PlaygroundPage', playgroundPageSchema);
