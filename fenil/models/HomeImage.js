const mongoose = require("mongoose");

const HomeImageSchema = new mongoose.Schema(
    {
        fieldName: {
            type:     String,
            enum:     ["heroImage", "welcomeImage", "programImage"],
            required: true,
            unique:   true,   // one active record per field slot
        },
        section: {
            type: String,
            enum: ["hero_section", "welcome_section", "programPanel"],
            required: true,
        },
        filePath:     { type: String, required: true },
        originalName: { type: String, default: "" },
        mimeType:     { type: String, default: "" },
        isActive:     { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("HomeImage", HomeImageSchema);