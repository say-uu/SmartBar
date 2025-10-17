// Seed Inventory Items from backend/seed/menu.json
// Usage: node backend/scripts/seedMenuItems.js

const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Load env from backend/.env if present
try {
  require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
} catch {}

const InventoryItem = require("../models/InventoryItem");
const MenuItem = require("../models/MenuItem");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smartbar";

async function main() {
  console.log("[seedMenuItems] Connecting to:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  const filePath = path.join(__dirname, "..", "seed", "menu.json");
  if (!fs.existsSync(filePath)) {
    console.error("[seedMenuItems] Seed file not found:", filePath);
    process.exit(1);
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.length === 0) {
    console.error("[seedMenuItems] Seed file is empty or invalid JSON array");
    process.exit(1);
  }

  let invCreated = 0;
  let invUpdated = 0;
  let menuCreated = 0;
  let menuUpdated = 0;

  for (const it of data) {
    const name = String(it.name || "").trim();
    if (!name) continue;
    // Upsert into inventoryitems (existing model)
    const inv = await InventoryItem.findOne({ name });
    if (inv) {
      inv.desc = it.desc ?? inv.desc;
      if (typeof it.price === "number" && it.price >= 0) inv.price = it.price;
      if (typeof it.img === "string") inv.img = it.img;
      if (typeof it.status === "string") inv.status = it.status;
      if (typeof it.category === "string") inv.category = it.category;
      if (typeof it.stock === "number" && it.stock >= 0)
        inv.stock = Math.floor(it.stock);
      await inv.save();
      invUpdated++;
    } else {
      await InventoryItem.create({
        name,
        desc: it.desc || "",
        price: typeof it.price === "number" ? it.price : 0,
        img: it.img || "",
        status: it.status || "Available",
        category: it.category || "Other",
        stock: typeof it.stock === "number" ? Math.floor(it.stock) : 0,
      });
      invCreated++;
    }

    // Upsert into menuitems (new model mapped to 'menuitems' collection)
    const menu = await MenuItem.findOne({ name });
    if (menu) {
      menu.desc = it.desc ?? menu.desc;
      if (typeof it.price === "number" && it.price >= 0) menu.price = it.price;
      if (typeof it.img === "string") menu.img = it.img;
      if (typeof it.status === "string") menu.status = it.status;
      if (typeof it.category === "string") menu.category = it.category;
      if (typeof it.stock === "number" && it.stock >= 0)
        menu.stock = Math.floor(it.stock);
      await menu.save();
      menuUpdated++;
    } else {
      await MenuItem.create({
        name,
        desc: it.desc || "",
        price: typeof it.price === "number" ? it.price : 0,
        img: it.img || "",
        status: it.status || "Available",
        category: it.category || "Other",
        stock: typeof it.stock === "number" ? Math.floor(it.stock) : 0,
      });
      menuCreated++;
    }
  }

  console.log(
    `[seedMenuItems] Done. Inventory - Created: ${invCreated}, Updated: ${invUpdated}; Menu - Created: ${menuCreated}, Updated: ${menuUpdated}; Total processed: ${data.length}`
  );
}

main()
  .catch((e) => {
    console.error("[seedMenuItems] Error:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
