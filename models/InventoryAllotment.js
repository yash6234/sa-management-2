const mongoose = require("mongoose");
const {Schema} = require("mongoose");

const InventoryAllotmentSchema = new mongoose.Schema({
    to:{type:String,default:''},
    inventory:{type:Schema.Types.ObjectId, ref:'AcademyInventory'},
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    transactions:{type:Array,default:[]},
    qty: { type: Number, required: true, default: 0 },
    description: { type: String, required: false },
    active: { type: Boolean, default: true },
    academy_id:{type:Schema.Types.ObjectId, ref:'Academy'},
    delete: { type: Boolean, default: false },
},{timestamps:true});

const InventoryAllotment = mongoose.models.InventoryAllotment || mongoose.model('InventoryAllotment', InventoryAllotmentSchema);

module.exports = InventoryAllotment;
