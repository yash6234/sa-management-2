const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const ground = new mongoose.Schema({
    name: {type: String, required: true,unique:true},
    description:{type: String, required: false},
    images:{type: Array,default:[]},
    active: {type: Boolean, default: true},
    delete:{type: Boolean, default: false},
},{timestamps:true});

// Explicitly naming the model to avoid collisions
const Ground = mongoose.models.Ground || mongoose.model('Ground', ground);

module.exports = Ground;
