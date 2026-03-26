  const mongoose = require('mongoose');
  const bcrypt = require('bcrypt');

  const UserSchema = new mongoose.Schema({
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
    // pin:{type:String}
},{timestamps:true});

  UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
  });

  const Users = mongoose.models.User || mongoose.model('Users', UserSchema);

  module.exports = Users;

