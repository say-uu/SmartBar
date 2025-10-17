const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  qty: Number,
});

const OrderSchema = new mongoose.Schema({
  cadet: { type: mongoose.Schema.Types.ObjectId, ref: "Cadet", required: true },
  items: [OrderItemSchema],
  total: Number,
  paymentMethod: { type: String, default: "Monthly Allowance" },
  allowanceUsed: { type: Number, default: 0 },
  cashOrCardDue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  orderId: { type: String, required: true, unique: true },
  idempotencyKey: { type: String, unique: true, sparse: true }, // Ensure unique sparse index
  // Pickup / collection tracking (for QR-based cash order verification)
  pickupVerified: { type: Boolean, default: false },
  collectedAt: { type: Date },
});

module.exports = mongoose.model("Order", OrderSchema);
