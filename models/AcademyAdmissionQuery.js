const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academyQuerySchema = new mongoose.Schema({
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
    duration:{type:Number,default:0},
    sports_id:{ type: Schema.Types.ObjectId, ref: 'AcademySports' },
    sports_name:{ type: String},
    session_id:{ type: Schema.Types.ObjectId, ref: 'AcademySessions' },
    session_from: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/}, // "HH:mm"
    session_to: {type: String, match: /^([01]\d|2[0-3]):([0-5]\d)$/},
    academy_id:{ type: Schema.Types.ObjectId, ref: 'Academy' },
    academy_name:{type:String},
    admission_by:{type:String},
    admission_by_role:{type:String},
    other_docs:[{type:String}],
    active:{type:Boolean,default:true},
    delete:{type:Boolean,default:false},
},{timestamps:true});

const AcademyAdmissionsQuery = mongoose.models.AcademyAdmissionsQuery || mongoose.model('AcademyAdmissionsQuery', academyQuerySchema);

module.exports = AcademyAdmissionsQuery;
