const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const groundBooking = new mongoose.Schema({
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
    completed:{type:Boolean,default:false},
    amount:{type:Number},
    paid:{type: Number},
    leftover:{type:Boolean},
    payment_type:{type:String,enum:['Paid','Pending','Partial','Exempt'],default:'Paid'},
    transactions:{type:Array,default:[]},
    booking_by:{type:String},
    booking_by_id:{type:Schema.Types.ObjectId },
    booking_by_role:{type:String},
    edit_logs: {
        type: [
        {
          field: { type: String },        // the field that changed (or "file:trainee_photo")
          old: { type: Schema.Types.Mixed }, // previous value
          new: { type: Schema.Types.Mixed }, // new value
          changed_by: { type: String },   // username or id
          changed_by_id: { type: Schema.Types.ObjectId },
          changed_by_role: { type: String },
          changed_at: { type: Date, default: Date.now },
          note: { type: String }          // optional reason
        }
        ],
        default: []
    },
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const GroundBooking = mongoose.models.GroundBooking || mongoose.model('GroundBooking', groundBooking);

module.exports = GroundBooking;

