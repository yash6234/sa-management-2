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
        sectionTitle: { type: String, default: "Our Sports Programs" },
        image: { type: String }, // The running track "ARE YOU PREPARED?" background

        // trainingCard: {
        //     title: { type: String, default: "Personalized Training for Aspiring Cricketers" },
        //     description: { type: String, default: "At Gandhinagar Sports Academy, our cricket coaching is designed to meet the needs of players at different stages of their journey. Our curriculum covers all essential aspects of cricket:" },
        //     features: {
        //         type: [String], default: [
        //             "Batting Skills: Master shot selection, footwork timing, and power hitting techniques.",
        //             "Bowling Techniques: Develop pace, spin, accuracy, and variations to outsmart opponents.",
        //             "Fielding Drills: Improve agility, reflexes, catching, and ground fielding with focused exercises.",
        //             "Fitness & Conditioning: Specialized cricket fitness training to build strength, endurance, and injury resilience.",
        //             "Game Awareness: Tactical sessions to enhance decision-making, game strategy, and situational awareness."
        //         ]
        //     },
        //     image: { type: String }
        // },

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
            buttonText: { type: String, default: "Join Now" },
            buttonLink: { type: String, default: "/admissions" }
        },

        quoteBlock: {
            quote: { type: String, default: "\"I have failed at times, but I never stop trying.\"" },
            author: { type: String, default: "Rahul Dravid" },
            authorTitle: { type: String, default: "Former captain of Indian national cricket team." },
            buttonText: { type: String, default: "View Gallery" },
            buttonLink: { type: String, default: "/gallery" }
        }
    },

    // 4. Tournaments & Social Section
    tournamentsSection: {
        smallTitle: { type: String, default: "JOIN OUR SPORTS TOURNAMENTS" },
        largeTitle: { type: String, default: "Tournaments" },
        list: [{
            title: { type: String },
            date: { type: String },
            location: { type: String, default: "Main Ground" },
            image: { type: String }
        }]
    },

    socialSection: {
        title: { type: String, default: "Latest on our Social" },
        subtitle: { type: String, default: "Follow for more" },
        followUrl: { type: String, default: "https://www.instagram.com/gandhinagarsportsacademy/" },
        posts: [{
            embedCode: { type: String },
            postUrl: { type: String }
        }]
    },

    // 5. What Parents Say (Testimonials)
    testimonials: {
        sectionTitle: { type: String, default: "What Parents Say" },
        list: [{
            quote: { type: String },
            name: { type: String },
            role: { type: String } // e.g., "Father of U-14 player"
        }]
    },

    // 6. Gallery Section
    gallery: [{
        title: { type: String },
        image: { type: String },
        category: { type: String, default: "General" }
    }],

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.Home || mongoose.model('Home', homeSchema);
