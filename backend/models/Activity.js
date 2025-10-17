const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    // purchase | inventory | allowance | system
    kind: { type: String, required: true },
    // Short human-readable description, e.g., "Cadet Johnson purchased Energy Drink"
    message: { type: String, required: true },
    // Monetary or unit delta (positive for income/restock, negative for decrease)
    amount: { type: Number, default: 0 },
    // 'Rs' for money, 'units' for stock, or ''
    unit: { type: String, default: "" },
    // Actor info
    actorType: {
      type: String,
      enum: ["cadet", "manager", "system"],
      default: "system",
    },
    actorId: { type: String, default: "" }, // serviceNumber or managerId
    // Optional references/metadata
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Activity", activitySchema);
