const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const coachSchema = new mongoose.Schema({
    uuid: { type: String, unique: true },
    roll_no: { type: String, required: true},
    fullName: { type: String, required: true },
    gender: { type: String, required: false },
    phone: { type: String, required: true },
    date_of_birth: { type: Date, default: Date.now },
    address: { type: String, required: false },
    active: { type: Boolean, default: true },
    delete:{type:Boolean,default:false},
    coach_photo: { type: String, required: false }
    // id_card_generated: { type: Boolean, default: false },
    // id_card_given: { type: Boolean, default: false },
  }, { timestamps: true });

const Coach = mongoose.models.Coach || mongoose.model('Coach', coachSchema);

module.exports = Coach;
