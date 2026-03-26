const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academySessions = new mongoose.Schema({
    name: {type: String, required: true},
    session_from: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    session_to: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
    academy:{type: Schema.Types.ObjectId, ref: 'Academy'},
    academy_name: {type: String},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const AcademySessions = mongoose.models.AcademySessions || mongoose.model('AcademySessions', academySessions);

module.exports = AcademySessions;
