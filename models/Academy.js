const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const academy = new mongoose.Schema({
    name: {type: String, required: true},
    address:{type: String},
    contact_no:{type: String},
    contact_name:{type: String},
    email:{type:String},
    domain_name:{type:String},
    logo:{type:String},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const Academy = mongoose.models.Academy || mongoose.model('Academy', academy);

module.exports = Academy;
