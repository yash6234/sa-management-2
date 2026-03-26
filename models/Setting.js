const mongoose = require('mongoose');
const {Schema}= mongoose
const settingSchema = new mongoose.Schema({
    field:{type:String,required: true},
    value:{type:String,required: true},
});

// Check if model already exists before defining it
const Setting = mongoose.models.Setting || mongoose.model('Setting', settingSchema);

module.exports = Setting;
