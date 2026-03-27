const mongoose = require('mongoose');

const homeSchema = new mongoose.Schema({
    // 1. Hero Section (Single Object)
    hero: {
        title: { type: String, default: "GANDHINAGAR SPORTS ACADEMY" },
        highlightTitle: { type: String, default: "Building Future Cricket Champions" },
        subtitle: { type: String },
        backgroundImage: { type: String },
        primaryButtonText: { type: String, default: "Join Now" },
        primaryButtonLink: { type: String, default: "/admissions" },
        secondaryButtonText: { type: String, default: "Explore Gallery" },
        secondaryButtonLink: { type: String, default: "/gallery" }
    },

    // 2. About Section
    about: {
        title: { type: String, default: "Welcome to Gandhinagar Sports Academy" },
        highlightText: { type: String, default: "The Best Sports Academy in Gandhinagar and Gujarat" },
        descriptionParagraphs: {
            type: [String],
            default: [
                "Are you ready to pursue your passion for sports without compromising on academics? We're proud to offer structured training for young athletes with flexible routines that support both learning and performance.",
                "At Gandhinagar Sports Academy, our coaching programs—residential and non-residential—go beyond physical training. We focus on building a winning mindset, discipline, teamwork, and long-term athletic development with guidance from experienced coaches.",
                "Our mission is simple: to empower every athlete to excel in their game and build confidence for life. The journey starts here—train smart, stay consistent, and grow into your best self."
            ]
        },
        image: { type: String }
    },

    // 3. Programs & Facilities (Combined Section with shared background)
    programsAndFacilities: {

        facilitiesCard: {
            title: { type: String, default: "World-Class Facilities to Elevate Your Game" },
            description: { type: String, default: "At Gandhinagar Sports Academy, we provide world-class facilities to support comprehensive cricket coaching." },
            features: {
                type: [String], default: [
                    "Practice Nets",
                    "Match Practice Sessions",
                    "Fitness Training",
                    "Professional Coaching Guidance",
                    "Skill Development Drills",
                    "Safe Practice Environment",
                    "Discipline Focus Training",
                    "Tournament Opportunities"
                ]
            },
            image: { type: String },
        }
    },

    // 4. Tournaments & Social Section
    tournamentsSection: {
        smallTitle: { type: String, default: "JOIN OUR SPORTS TOURNAMENTS" },
        largeTitle: { type: String, default: "Tournaments" },
        list: {
            title: { type: String, default: "Latest on our Social" },
            subtitle: { type: String, default: "Follow for more" },
            followUrl: { type: String, default: "https://www.instagram.com/gandhinagarsportsacademy/" },
            posts: {
                type: Map,
                of: String,
                default: {}
            }
        }
    },

    // 5. What Parents Say (Testimonials)
    testimonials: {
        sectionTitle: { type: String, default: "What Parents Say" },
        list: [{
            quote: { type: String },
            name: { type: String },
            role: { type: String },
            _id: false
        }]
    },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Home || mongoose.model('Home', homeSchema);
