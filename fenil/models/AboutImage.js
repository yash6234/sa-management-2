const mongoose = require("mongoose");

const AboutImageSchema = new mongoose.Schema(
    {
        fieldName: {
            type:     String,
            enum:     ["founderImage"],
            required: true,
            unique:   true,   
        },
        section: {
            type:     String,
            enum:     ["founders"],
            required: true,
        },
        filePath:     { type: String, required: true },
        originalName: { type: String, default: "" },
        mimeType:     { type: String, default: "" },
        isActive:     { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("AboutImage", AboutImageSchema);