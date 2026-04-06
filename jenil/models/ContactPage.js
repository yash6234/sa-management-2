const mongoose = require('../utils/mongoose');

const contactPageSchema = new mongoose.Schema({
    hero: {
        subtitle: { type: String, default: "CONTACT US" },
        title: { type: String, default: "Get in Touch" },
        description: { type: String, default: "Have questions? We're here to help you start your sports journey." },
        backgroundImage: { type: String }
    },

    contactDetails: {
        address: { type: String, default: "Gandhinagar, Gujarat, India" },
        phone: { type: String, default: "+91 9426142342" },
        email: { type: String, default: "info@gandhinagarsportsacademy.com" },
        officeHours: { type: String, default: "7 AM - 11 AM, 3 PM - 7:30 PM" }
    },

    // New section to manage the form header text dynamically
    formContent: {
        title: { type: String, default: "Send us a Message" },
        description: { type: String, default: "We'll get back to you within 24–48 hours." }
    },

    mapIframe: { type: String }, // For a Google Maps embed link

    isActive: { type: Boolean, default: true }

}, { timestamps: true });

module.exports = mongoose.models.ContactPage || mongoose.model('ContactPage', contactPageSchema);
