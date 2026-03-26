const mongoose = require("mongoose");
const {Schema} = require("mongoose");

const AcademyInventorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    qty: { type: Number, required: true, default: 0 },
    description: { type: String, required: false },
    active: { type: Boolean, default: true },
    academy_id:{type:Schema.Types.ObjectId, ref:'Academy'},
    delete: { type: Boolean, default: false },
    past_logs:{type:Array,default:[]},
},{timestamps:true});

const AcademyInventory = mongoose.models.AcademyInventory || mongoose.model('AcademyInventory', AcademyInventorySchema);

module.exports = AcademyInventory;
