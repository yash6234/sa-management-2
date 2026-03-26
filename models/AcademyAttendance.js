const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academyattendance = new mongoose.Schema({
    rollno: {type:String},
    type: {type:String,default:"Trainee"},
    active: {type: Boolean, default: true},
},{ timestamps: true });

// Explicitly naming the model to avoid collisions
const AcademyAttendance = mongoose.models.AcademyAttendance || mongoose.model('AcademyAttendance', academyattendance);

module.exports = AcademyAttendance;
