const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
const InventoryItem = require("../models/InventoryItem");
const Activity = require("../models/Activity");
const Order = require("../models/Order");
const Cadet = require("../models/Cadet");

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager access required" });
  }
  next();
}

// GET recent activities
router.get(
  "/activities",
  authenticateToken,
  requireManager,
  async (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit || 8), 50);
      const acts = await Activity.find({}).sort({ createdAt: -1 }).limit(limit);
      res.json(acts);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  }
);

// GET system alerts
router.get("/alerts", authenticateToken, requireManager, async (req, res) => {
  try {
    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 10);
    const all = await InventoryItem.find({}).select("name stock category");
    const outOfStock = all.filter((i) => (i.stock || 0) <= 0);
    const lowStock = all.filter(
      (i) => (i.stock || 0) > 0 && (i.stock || 0) <= LOW_STOCK_THRESHOLD
    );
    const exceededCadets = await Cadet.countDocuments({
      monthlyAllowance: { $lte: 0 },
    });

    const alerts = {
      critical: outOfStock.slice(0, 3).map((i) => ({
        title: `${i.name} are out of stock`,
      })),
      lowStock: lowStock.slice(0, 3).map((i) => ({
        title: `${i.name} (${i.stock} units remaining)`,
      })),
      notices:
        exceededCadets > 0
          ? [{ title: `${exceededCadets} cadets have exceeded monthly limits` }]
          : [],
      info: [{ title: "Monthly credit allocation completed" }],
    };
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

// GET overview tiles
router.get("/overview", authenticateToken, requireManager, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayOrders = await Order.find({ createdAt: { $gte: startOfDay } });
    const revenueToday = todayOrders.reduce(
      (sum, o) => sum + Number(o.total || 0),
      0
    );
    // Unique cadets this month (approx 30d)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentOrders = await Order.find({
      createdAt: { $gte: since },
    }).select("cadet");
    const uniqueCadets = new Set(recentOrders.map((o) => String(o.cadet)));
    const activeCadets = uniqueCadets.size;
    // Restocking and attention
    const LOW_STOCK_THRESHOLD = Number(process.env.LOW_STOCK_THRESHOLD || 10);
    const all = await InventoryItem.find({}).select("stock");
    const requireRestocking = all.filter(
      (i) => (i.stock || 0) <= LOW_STOCK_THRESHOLD
    ).length;
    const needAttention = all.filter((i) => (i.stock || 0) <= 0).length;

    res.json({ revenueToday, activeCadets, requireRestocking, needAttention });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch overview" });
  }
});

module.exports = router;
