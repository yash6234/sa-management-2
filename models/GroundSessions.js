const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const groundSessions = new mongoose.Schema({
    name: {type: String, required: true},
    time_from: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    time_to: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
    ground :{type: Schema.Types.ObjectId, ref: 'Ground'},
    ground_name: {type: String},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const GroundSessions = mongoose.models.GroundSessions || mongoose.model('GroundSessions', groundSessions);

module.exports = GroundSessions;
