const mongoose = require('mongoose');

const admissionsPageSchema = new mongoose.Schema({
    hero: {
        subtitle: { type: String, default: "START YOUR JOURNEY" },
        title: { type: String, default: "Admissions & Enquiry" },
        description: { type: String, default: "Take the first step towards excellence. Fill out the form below and our team will get back to you with everything you need to begin your sports journey at GSA." },
        backgroundImage: { type: String }
    },

    formContent: {
        header: { type: String, default: "Admissions & Enquiry" },
        subHeader: { type: String, default: "Tell us about the athlete and the sport they want to learn—our team will guide you with the next steps." },
        quote: { type: String, default: "Excellence in Sports, Excellence in Life." }
    },

    infoSection: {
        expectations: {
            title: { type: String, default: "What to Expect" },
            items: {
                type: [String],
                default: [
                    "Response within 24-48 hours",
                    "Personal consultation with our team",
                    "Free trial session to experience our training",
                    "Detailed information about programs and fees"
                ]
            }
        },
        requirements: {
            title: { type: String, default: "Requirements" },
            items: {
                type: [String],
                default: [
                    "Medical fitness certificate (for certain sports)",
                    "Age-appropriate documentation",
                    "Parent/guardian consent for minors",
                    "Commitment to regular training schedule"
                ]
            }
        }
    },

    // Form Dropdown Configs
    config: {
        sessions: { type: [String], default: ["Morning", "Evening", "Both"] },
        timeSlots: { 
            type: [String], 
            default: ["6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM", "4:00 PM - 6:00 PM", "6:00 PM - 8:00 PM"] 
        }
    },

    isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.models.AdmissionsPage || mongoose.model('AdmissionsPage', admissionsPageSchema);
