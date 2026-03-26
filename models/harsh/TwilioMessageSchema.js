const mongoose = require("mongoose");

const TwilioMessageSchema = new mongoose.Schema({

  messageSid: { type: String, index: true },

  direction: {
    type: String,
    enum: ["outbound", "inbound"]
  },

  from: String,
  to: String,

  body: String,
  templateSid: String,

  status: String,

  price: String,
  currency: String,

  channel: {
    type: String,
    default: "whatsapp"
  },

  conversationSid: String,

  errorCode: String,
  errorMessage: String,

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: Date,

  deliveredAt: Date,
  readAt: Date

});

module.exports = mongoose.model("TwilioMessage", TwilioMessageSchema);