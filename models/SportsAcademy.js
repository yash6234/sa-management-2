  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');
const {Schema} = mongoose;
  const saSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile_no: { type: String, required: true},
    email: { type: String, required: true },
    address : {type:String, required:true},
    isVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    delete:{type:Boolean, default:false},
    contact_person:{type:String,required:true},
    contact_phone:{type:String,required:true},
    contact_address:{type:String,required:true},
    expiry_at:{type:Date},
    start_at:{type:Date},
    password:{type:String},
    domain_name:{type:String,unique:true},
    backend_domain:{type:String,unique:true},
    ip_address:{type:String},
    server_name:{type:String},
    current_plan_id:{type:Schema.Types.ObjectId,ref:'Plans'},
    current_plan_name:{type:String},
    current_plan_validity:{type:Number},
    current_plan_amount:{type:Number},
    add_institute:{type:Boolean,default:false},
    paid_amount:{type:Number},
    payment_method:{type:String,default:'CASH',enum:['CASH','UPI','CARD','NET BANKING','CHEQUE','DEMAND DRAFT']},
    past_details:{type:Array,default:[]},
  },{timestamps:true});


  const SportsAcademy = mongoose.models.SportsAcademy || mongoose.model('SportsAcademy', saSchema);

  module.exports = SportsAcademy;

