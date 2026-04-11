const mongoose = require("mongoose");

const HomeSchema = new mongoose.Schema(
    {
        home: {
            hero_section: {
                title:          { type: String, default: "" },
                highlightTitle: { type: String, default: "" },
                subtitle:       { type: String, default: "" },
                heroImage:      { type: String, default: "" },
            },
            welcome_section: {
                title:        { type: String, default: "" },
                subtitle:     { type: String, default: "" },
                paragraphs:   [{ type: String }],
                welcomeImage: { type: String, default: "" },
            },
            programPanel: {
                title:        { type: String, default: "" },
                intro:        { type: String, default: "" },
                programImage: { type: String, default: "" },
                points:       [{ type: String }],
            },
            instagramPosts: [
                {
                    url: { type: String, default: "" },
                },
            ],
            testimonials: [
                {
                    quote:      { type: String, default: "" },
                    parentName: { type: String, default: "" },
                    relation:   { type: String, default: "" },
                },
            ],
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Home", HomeSchema);