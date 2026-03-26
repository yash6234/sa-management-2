const mongoose = require('mongoose');
const {Schema} = require("mongoose");

const AccountsSchema = new mongoose.Schema({
    amt_in_out: {type: String,required: true,enum:['IN','OUT']},
    identification: {type: String},
    amount: { type: Number, required: false },
    amount_in_word: { type: String, required: false },
    description: { type: String, required: false },
    payment_method: { type: String, required: false },
    date:{ type: Date, required: false },
    active:{type:Boolean,default:true},
    delete:{type:Boolean, default: false},
},{timestamps:true});

const Accounts = mongoose.models.Accounts || mongoose.model('Accounts', AccountsSchema);

module.exports = Accounts;
