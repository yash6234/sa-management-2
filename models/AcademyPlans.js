const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academyPlans = new mongoose.Schema({
    name: {type: String, required: true},
    session_id: {type: Schema.Types.ObjectId, ref:'AcademySessions'},
    session_time_from:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    session_time_to:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    academy:{type: Schema.Types.ObjectId, ref: 'Academy'},
    academy_name: {type: String},
    sports:{type: Schema.Types.ObjectId, ref: 'AcademySports'},
    sports_name:{type: String},
    registration_fee: {type: Number},
    amount: {type: Number},
    days:{type: Number},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const AcademyPlans = mongoose.models.AcademyPlans || mongoose.model('AcademyPlans', academyPlans);

module.exports = AcademyPlans;
