const mongoose = require("mongoose");

const menuItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    desc: { type: String, default: "" },
    price: { type: Number, required: true },
    img: { type: String, default: "" },
    // Unit size (e.g. 120g, 250ml, 750ml) for display to cadets
    unitSize: { type: String, default: null },
    status: {
      type: String,
      enum: ["Available", "Unavailable"],
      default: "Available",
    },
    category: { type: String, default: "Other" },
    stock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "menuitems" }
);

module.exports = mongoose.model("MenuItem", menuItemSchema);
