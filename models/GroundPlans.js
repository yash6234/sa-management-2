const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const groundPlans = new mongoose.Schema({
    name: {type: String, required: true},
    session_id: {type: Schema.Types.ObjectId, ref:'GroundSessions'},
    time_from:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    time_to:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    ground:{type: Schema.Types.ObjectId, ref: 'Ground'},
    ground_name: {type: String},
    amount: {type: Number},
    hours: {type: Number},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const GroundPlans = mongoose.models.GroundPlans || mongoose.model('GroundPlans', groundPlans);

module.exports = GroundPlans;
