const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academySports = new mongoose.Schema({
    name: {type: String, required: true},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
    academy:{type: Schema.Types.ObjectId, ref: 'Academy'},
    academy_name: {type: String},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const AcademySports = mongoose.models.AcademySports || mongoose.model('AcademySports', academySports);

module.exports = AcademySports;
