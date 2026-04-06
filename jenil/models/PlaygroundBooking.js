const mongoose = require('../utils/mongoose');

const playgroundBookingSchema = new mongoose.Schema({
    sport: { type: String, required: true }, // Cricket, Football
    date: { type: String, required: true }, // Format matching user selection
    ground: { type: String, required: true }, // GROUND-A, GROUND-B
    slot: { type: String, required: true }, // Full-Day, Half-Day
    timeSlot: { type: String },
    totalBill: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
    adminNotes: { type: String }
}, { timestamps: true });

module.exports = mongoose.models.PlaygroundBooking || mongoose.model('PlaygroundBooking', playgroundBookingSchema);
