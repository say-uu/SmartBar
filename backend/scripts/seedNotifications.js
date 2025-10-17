// Seed Notifications into 'notifications' collection
// Usage: node backend/scripts/seedNotifications.js

const path = require("path");
const mongoose = require("mongoose");

try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch {}

const Notification = require("../models/Notification");
const InventoryItem = require("../models/InventoryItem");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smartbar";

async function main() {
  console.log("[seedNotifications] Connecting to:", MONGO_URI);
  await mongoose.connect(MONGO_URI);

  // Build some dynamic examples based on inventory
  const lowStock = await InventoryItem.find({ stock: { $gt: 0, $lte: 10 } })
    .select("name stock")
    .limit(3);
  const outOfStock = await InventoryItem.find({ stock: { $lte: 0 } })
    .select("name")
    .limit(3);

  const docs = [
    {
      title: "Monthly credit allocation completed",
      body: "All cadets have been credited with monthly allowance.",
      level: "info",
      audience: "manager",
    },
    ...lowStock.map((i) => ({
      title: `Low stock: ${i.name}`,
      body: `${i.name} has only ${i.stock} units remaining. Consider restocking soon.`,
      level: "warning",
      audience: "manager",
      meta: { item: i.name },
    })),
    ...outOfStock.map((i) => ({
      title: `Out of stock: ${i.name}`,
      body: `${i.name} is currently unavailable.`,
      level: "critical",
      audience: "manager",
      meta: { item: i.name },
    })),
    {
      title: "Welcome to SmartBar!",
      body: "Check out today's specials in the Menu.",
      level: "notice",
      audience: "cadet",
    },
  ];

  // Upsert by title to avoid duplicates
  let created = 0;
  let updated = 0;
  for (const n of docs) {
    const existing = await Notification.findOne({ title: n.title });
    if (existing) {
      existing.body = n.body ?? existing.body;
      existing.level = n.level ?? existing.level;
      existing.audience = n.audience ?? existing.audience;
      existing.meta = n.meta ?? existing.meta;
      await existing.save();
      updated++;
    } else {
      await Notification.create(n);
      created++;
    }
  }

  console.log(
    `[seedNotifications] Done. Created: ${created}, Updated: ${updated}, Total processed: ${docs.length}`
  );
}

main()
  .catch((e) => {
    console.error("[seedNotifications] Error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
