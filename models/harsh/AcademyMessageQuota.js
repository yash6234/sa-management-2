const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: { type: String, enum: ['recharge', 'deduction', 'refund'], required: true },
  amount: { type: Number, required: true }, // Positive for recharge, negative for deduction
  description: { type: String, required: true }, // e.g., "Recharge via Stripe", "Message SID: xxx"
  timestamp: { type: Date, default: Date.now }
});

const academyMessageQuotaSchema = new mongoose.Schema({
  academyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Academy',
    required: true,
    unique: true
  },
  freeMessages: {
    type: Number,
    default: process.env.Free_MESSAGES || 400,
    min: 0
  },
  usedFreeMessages: {
    type: Number,   
    default: 0,
    min: 0
  },
  totalSentMessages: { 
    type: Number,
    default: 0,
    min: 0
  },
  balance: { 
    type: Number,
    default: 0,
    min: 0
  },
  perMessageCharge: { 
    type: Number,
    default: process.env.PER_MESSAGE_CHARGE || 0.0014
  },
  resetPeriod: {
    type: String,
    enum: ['monthly', 'quarterly', 'yearly', 'lifetime'],
    default: 'monthly'
  },
  lastResetDate: {
    type: Date,
    default: Date.now
  },
  transactions: [transactionSchema], // Audit trail—query this for "perfect" records
  timestamps: true
});


module.exports = mongoose.model('AcademyMessageQuota', academyMessageQuotaSchema);