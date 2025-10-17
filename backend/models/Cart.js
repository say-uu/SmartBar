const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  qty: { type: Number, required: true },
  image: { type: String },
});

const CartSchema = new mongoose.Schema({
  serviceNumber: { type: String, required: true, unique: true },
  items: [CartItemSchema],
});

module.exports = mongoose.model("Cart", CartSchema);
