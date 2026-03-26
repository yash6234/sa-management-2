const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const ReceiptSchema = new mongoose.Schema({
    receipt_no: { type: String,required: true ,unique: true},
    received_from: { type: String, required: false },
    amount: { type: Number, required: false },
    amount_in_word: { type: String, required: false },
    description: { type: String, required: false },
    transactions:{type:Array, default:[]},
    roll_no:{type:String, required: false ,default:''},
    file_name:{ type: String, required: false },
    date:{ type: Date, required: false ,default:Date.now()},
    active:{type:Boolean,default:true},
    delete:{type:Boolean, default: false},
},{timestamps:true});

const Receipt = mongoose.models.Receipt || mongoose.model('Receipt', ReceiptSchema);

module.exports = Receipt;
