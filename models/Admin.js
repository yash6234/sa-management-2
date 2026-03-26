  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');

  const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    mobile_no: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    date_of_birth: { type: Date, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    password: { type: String, required: true },
    otp: { type: String },
    otpExpires: { type: Date },
    isVerified: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    delete:{type:Boolean,default:false},
    photo:{type:String},
    // pin:{type:String}
},{timestamps:true});

  adminSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });

  const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

  module.exports = Admin;

