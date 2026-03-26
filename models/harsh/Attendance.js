const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const attendance = new mongoose.Schema({
    rollno: {type:String, required: true},
    date: { type: Date, default: Date.now },
    // session: {type:String,enum: ['Morning','Evening','Night'] , required: true},
    tap:{type:String,enum:['IN','OUT','ABSENT'],default:'ABSENT'},
    active: {type: Boolean, default: true},
    attendance_status: { type: String, enum: ["present", "absent", "late"], default: "present" },
    delete:{type:Boolean,default:false},
    user_type:{type:String,enum:['Student','Staff','Coach'],default:'Student'},
    source: { type: String, enum: ['PI', 'IOS', 'WEB','ANDROID','DEVICE'], default: 'WEB' }

}, {timestamps: true});

// Explicitly naming the model to avoid collisions
const Attendance = mongoose.models.Attendance || mongoose.model('Attendance', attendance);

module.exports = Attendance;
