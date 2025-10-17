const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    body: { type: String, default: "" },
    level: {
      type: String,
      enum: ["info", "notice", "warning", "critical"],
      default: "info",
    },
    audience: {
      type: String,
      enum: ["cadet", "manager", "all"],
      default: "manager",
    },
    read: { type: Boolean, default: false },
    // Optional metadata (e.g., links, ids)
    meta: { type: Object, default: {} },
  },
  { timestamps: true, collection: "notifications" }
);

module.exports = mongoose.model("Notification", notificationSchema);
