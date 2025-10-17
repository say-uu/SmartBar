const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();
const InventoryItem = require("../models/InventoryItem");
const Activity = require("../models/Activity");
const { authenticateToken } = require("../middleware/authMiddleware");

// Derive unit size based on category or name patterns
function deriveUnitSize(category, name = "") {
  if (!category) return null;
  const c = category.toLowerCase();
  const n = name.toLowerCase();
  if (c.includes("chocolate")) return "120g";
  if (c.includes("bite") || c.includes("bites")) return "120g";
  if (c.includes("soft")) return "250ml"; // soft drinks
  if (c.includes("yoghurt")) return "250ml";
  if (c.includes("sun") || c.includes("crush")) return "200ml";
  if (c.includes("beer")) {
    // Distinguish lion beer sizes by name
    if (n.includes("500") || n.includes("500ml")) return "500ml";
    if (n.includes("330") || n.includes("330ml")) return "330ml";
    return "330ml"; // default beer size
  }
  if (
    c.includes("liquor") ||
    c.includes("hard") ||
    c.includes("arrack") ||
    c.includes("whisky") ||
    c.includes("liquor")
  )
    return "750ml";
  return null;
}

// Ensure only manager can modify inventory
function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager access required" });
  }
  next();
}

// GET all inventory items
router.get("/", authenticateToken, async (req, res) => {
  try {
    let items = await InventoryItem.find({}).sort({ name: 1 });
    // Backfill unitSize in-memory (and persist if missing) without blocking
    items.forEach(async (it) => {
      if (!it.unitSize) {
        const derived = deriveUnitSize(it.category || "", it.name || "");
        if (derived) {
          it.unitSize = derived;
          try {
            await it.save();
          } catch (e) {
            /* ignore */
          }
        }
      }
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// PATCH update stock and/or status for an item by id
router.patch("/:id", authenticateToken, requireManager, async (req, res) => {
  try {
    const { stock, status, price, name, desc, img, category, unitSize } =
      req.body;
    const update = {};
    if (typeof stock === "number" && stock >= 0)
      update.stock = Math.floor(stock);
    if (status === "Available" || status === "Unavailable")
      update.status = status;
    if (typeof price === "number" && price >= 0) update.price = price;
    if (typeof name === "string" && name.trim()) update.name = name.trim();
    if (typeof desc === "string") update.desc = desc;
    if (typeof img === "string") update.img = img;
    if (typeof category === "string" && category.trim()) {
      update.category = category.trim();
    }
    if (typeof unitSize === "string" && unitSize.trim()) {
      update.unitSize = unitSize.trim();
    } else if (update.category || name) {
      // Re-derive if category or name changed and unitSize not manually provided
      const cat =
        update.category ||
        (await InventoryItem.findById(req.params.id))?.category;
      const nm = update.name || name;
      const derived = deriveUnitSize(cat, nm);
      if (derived) update.unitSize = derived;
    }
    const before = await InventoryItem.findById(req.params.id);
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!item) return res.status(404).json({ error: "Item not found" });
    // Log activity for stock change
    try {
      if (before && typeof update.stock === "number") {
        const delta = update.stock - Number(before.stock || 0);
        if (delta !== 0) {
          await Activity.create({
            kind: "inventory",
            message:
              delta > 0
                ? `Inventory restocked: ${item.name}`
                : `Inventory adjusted: ${item.name}`,
            amount: delta,
            unit: "units",
            actorType: "manager",
            actorId: String(req.user?.managerId || ""),
            meta: { itemId: String(item._id) },
          });
        }
      }
    } catch (e) {
      console.warn("[inventory.js] Activity log failed:", e?.message);
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update item" });
  }
});

// POST create a new inventory item
router.post("/", authenticateToken, requireManager, async (req, res) => {
  try {
    let { name, desc, price, img, status, category, stock, unitSize } =
      req.body;
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Name is required" });
    }
    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "Valid price is required" });
    }
    name = name.trim();
    desc = typeof desc === "string" ? desc : "";
    img = typeof img === "string" ? img : "";
    status = status === "Unavailable" ? "Unavailable" : "Available";
    category =
      typeof category === "string" && category.trim()
        ? category.trim()
        : "Other";
    stock = typeof stock === "number" && stock >= 0 ? Math.floor(stock) : 0;

    if (!unitSize) {
      unitSize = deriveUnitSize(category, name) || null;
    }

    const created = await InventoryItem.create({
      name,
      desc,
      price,
      img,
      status,
      category,
      stock,
      unitSize,
    });

    // Log activity
    try {
      await Activity.create({
        kind: "inventory",
        message: `New item added: ${created.name}`,
        amount: stock,
        unit: "units",
        actorType: "manager",
        actorId: String(req.user?.managerId || ""),
        meta: { itemId: String(created._id) },
      });
    } catch (e) {
      console.warn("[inventory.js] Activity log failed:", e?.message);
    }

    res.status(201).json(created);
  } catch (err) {
    console.error("[inventory.js] create item error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// POST seed inventory from shared JSON (idempotent by name)
router.post("/seed", authenticateToken, requireManager, async (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "seed", "menu.json");
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: "Seed file not found" });
    }
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    let created = 0;
    let updated = 0;
    for (const it of data) {
      const existing = await InventoryItem.findOne({ name: it.name });
      if (existing) {
        // Update details but do not override stock unless provided
        existing.desc = it.desc ?? existing.desc;
        existing.price =
          typeof it.price === "number" ? it.price : existing.price;
        existing.img = it.img ?? existing.img;
        existing.status = it.status ?? existing.status;
        existing.category = it.category ?? existing.category;
        await existing.save();
        updated++;
      } else {
        await InventoryItem.create({
          name: it.name,
          desc: it.desc || "",
          price: it.price || 0,
          img: it.img || "",
          status: it.status || "Available",
          category: it.category || "Other",
          stock: typeof it.stock === "number" ? it.stock : 0,
          unitSize: deriveUnitSize(it.category || "", it.name || "") || null,
        });
        created++;
      }
    }
    res.json({ message: "Seed complete", created, updated });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ error: "Failed to seed inventory" });
  }
});

// DELETE remove an inventory item by id
router.delete("/:id", authenticateToken, requireManager, async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found" });
    try {
      await Activity.create({
        kind: "inventory",
        message: `Item removed: ${item.name}`,
        amount: 0,
        unit: "units",
        actorType: "manager",
        actorId: String(req.user?.managerId || ""),
        meta: { itemId: String(item._id) },
      });
    } catch (e) {
      console.warn("[inventory.js] Activity log failed:", e?.message);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = router;
