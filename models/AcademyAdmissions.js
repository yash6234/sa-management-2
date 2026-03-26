const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academySchema = new mongoose.Schema({
    name: { type: String, required: false },
    roll_no: { type: String,required: true },
    father_name:{ type: String, required: false },
    phone: { type: String, required: false },
    date_of_birth: { type: Date, default: Date.now },
    gender:{ type: String, required: false },
    age: { type: Number, required: false },
    weight: { type: Number, required: false },
    address: { type: String, required: false },
    school_name: { type: String, required: false },
    current_class: { type: String, required: false },
    father_occupation: { type: String, required: false },
    trainee_photo: { type: String, required: false },
    trainee_signature: { type: String, required: false },
    father_signature: { type: String, required: false },
    aadhar_card:{type:String,required: false}, //Aadhar Number Input
    aadhar:{ type: String, required: false }, // Aadhar Card File If Found
    self_declaration: { type: String, required: false },
    medical_form:{ type: String, required: false },
    agree_tnc:{ type: Boolean, default: false },
    agree_by:{ type: String, required: false },
    start_date : {type: Date, default: Date.now },
    expiry_date : {type: Date, default: Date.now },
    plan_id:{ type: Schema.Types.ObjectId, ref: 'AcademyPlans' },
    plan_name:{ type: String},
    plan_amount:{ type: Number},
    registration_fee:{ type: Number},
    plan_validity:{ type:Number},
    sports_id:{ type: Schema.Types.ObjectId, ref: 'AcademySports' },
    sports_name:{ type: String},
    session_id:{ type: Schema.Types.ObjectId, ref: 'AcademySessions' },
    session_from: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    session_to: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    academy_id:{ type: Schema.Types.ObjectId, ref: 'Academy' },
    id_card_status:{type:String,enum:['Not Generated','Generated','Created','Given']},
    id_status_updated_on:{type:Date},
    academy_name:{type:String},
    payment_type:{type:String,enum:['Paid','Pending','Partial','Exempt'],default:'Paid'},
    transactions:{type:Array,default:[]},
    amount:{type:Number},
    amount_without_discount:{type:Number},
    paid:{type:Number},
    leftover:{type:Number},
    admission_by:{type:String},
    admission_by_id:{type:Schema.Types.ObjectId },
    admission_by_role:{type:String},
    other_docs:[{type:String}],
    past_details:{type:Array,default:[]},
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
    active:{type:Boolean,default:true},
    time_left:{type:Number,default:0},
    delete:{type:Boolean,default:false},
},{timestamps:true});

const AcademyAdmissions = mongoose.models.AcademyAdmissions || mongoose.model('AcademyAdmissions', academySchema);

module.exports = AcademyAdmissions;
