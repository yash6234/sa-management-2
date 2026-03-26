const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const groundBookingQuery = new mongoose.Schema({
    name:{type:String,required:true},
    mobile_no:{type:String,required:true},
    date:{type:Date},
    ground:{type:Schema.Types.ObjectId,ref:"Ground"},
    ground_name:{type:String,required:true},
    session_id:{type:Schema.Types.ObjectId,ref:"GroundSessions"},
    session_name:{type:String,required:true},
    time_from:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    time_to:{type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    plan_name:{type:String},
    plan_id:{type:Schema.Types.ObjectId,ref:'GroundPlans'},
    plan_amount:{type:Number},
    amount:{type:Number},
    paid:{type: Number,default:0},
    leftover:{type:Boolean},
    booking_by:{type:String},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const GroundBookingQuery = mongoose.models.GroundBookingQuery || mongoose.model('GroundBookingQuery', groundBookingQuery);

module.exports = GroundBookingQuery;

