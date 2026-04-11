const mongoose = require("mongoose");

const AboutSchema = new mongoose.Schema(
    {
        about: {
            about_section: {
                description: { type: String, default: "" },
                vision:      { type: String, default: "" },
                mission:     { type: String, default: "" },
                goals:       { type: String, default: "" },
            },
            directorsMessage: {
                intro:      { type: String, default: "" },
                smallIntro: { type: String, default: "" },
            },
            founders: {
                foundername:  { type: String, default: "" },
                role:         { type: String, default: "" },
                description:  { type: String, default: "" },
                image:        { type: String, default: "" },
            },
            whyChooseUs: {
                points: [{ type: String }],
            },
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("About", AboutSchema);