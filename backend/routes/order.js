const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Cadet = require("../models/Cadet");
const { authenticateToken } = require("../middleware/authMiddleware");
const Activity = require("../models/Activity");

// Canonical item signature builder to identify logically identical orders
function buildItemsSignature(items = []) {
  try {
    const canon = (items || [])
      .map((i) => ({
        name: String(i.name || "").trim(),
        price: Number(i.price || 0),
        qty: Number(i.qty || 0),
      }))
      .sort(
        (a, b) =>
          (a.name || "").localeCompare(b.name || "") ||
          a.price - b.price ||
          a.qty - b.qty
      );
    return JSON.stringify(canon);
  } catch {
    return "[]";
  }
}

// Get all orders for the logged-in cadet (with soft dedupe for historical duplicates)
router.get("/history", authenticateToken, async (req, res) => {
  try {
    const cadetId = req.user.id;
    const orders = await Order.find({ cadet: cadetId }).sort({ createdAt: -1 });
    // Soft dedupe: keep the first order for the same signature occurring within 10 seconds
    const seen = new Map();
    const filtered = [];
    for (const o of orders) {
      // Use a conservative signature: total + items only (ignore payment method)
      const sig = `${Number(o.total || 0)}|${buildItemsSignature(o.items)}`;
      const t = new Date(o.createdAt).getTime();
      const lastT = seen.get(sig);
      // Expand window to 120s to hide previously duplicated bills
      if (lastT && Math.abs(lastT - t) <= 120 * 1000) {
        // skip duplicate within 10s window
        continue;
      }
      seen.set(sig, t);
      filtered.push(o);
    }
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch purchase history" });
  }
});

// Create a new order (called after successful payment)
router.post("/create", authenticateToken, async (req, res) => {
  try {
    const cadetId = req.user.id;
    const {
      items,
      total,
      paymentMethod,
      allowanceUsed: allowanceUsedFromClient = 0, // kept only for backwards compat logs
      cashOrCardDue: cashOrCardDueFromClient = 0, // kept only for backwards compat logs
      idempotencyKey: clientIdemKey,
    } = req.body;
    console.log("[order.js] /create request body:", req.body);
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No items in order" });
    }

    // Idempotency reuse
    let existingOrder = null;
    if (clientIdemKey) {
      existingOrder = await Order.findOne({
        idempotencyKey: clientIdemKey,
        cadet: cadetId,
      });
      if (existingOrder) {
        const cadetSnap = await Cadet.findById(cadetId);
        const cadetSafeExisting = {
          serviceNumber: cadetSnap.serviceNumber,
          name: cadetSnap.name,
          email: cadetSnap.email,
          company: cadetSnap.company || "-",
          platoon: cadetSnap.platoon || "-",
          academyYear: cadetSnap.academyYear || "-",
          phone: cadetSnap.phone || "-",
          roomNumber: cadetSnap.roomNumber || "-",
          dob: cadetSnap.dob || "-",
          monthlyAllowance: cadetSnap.monthlyAllowance,
          totalSpent: cadetSnap.totalSpent,
        };
        return res.status(200).json({
          order: existingOrder,
          cadet: cadetSafeExisting,
          alerts: { allowanceHalfExceeded: false },
        });
      }
    }

    // Duplicate suppression fallback
    const itemsSig = buildItemsSignature(items);
    const now = Date.now();
    const recentWindowMs = 60 * 1000;
    const recentOrders = await Order.find({
      cadet: cadetId,
      createdAt: { $gte: new Date(now - recentWindowMs) },
      total: Number(total) || 0,
    }).sort({ createdAt: -1 });
    for (const ro of recentOrders) {
      const roSig = buildItemsSignature(ro.items);
      if (roSig === itemsSig) {
        const cadetSnap = await Cadet.findById(cadetId);
        const cadetSafeExisting = {
          serviceNumber: cadetSnap.serviceNumber,
          name: cadetSnap.name,
          email: cadetSnap.email,
          company: cadetSnap.company || "-",
          platoon: cadetSnap.platoon || "-",
          academyYear: cadetSnap.academyYear || "-",
          phone: cadetSnap.phone || "-",
          roomNumber: cadetSnap.roomNumber || "-",
          dob: cadetSnap.dob || "-",
          monthlyAllowance: cadetSnap.monthlyAllowance,
          totalSpent: cadetSnap.totalSpent,
        };
        return res.status(200).json({
          order: ro,
          cadet: cadetSafeExisting,
          alerts: { allowanceHalfExceeded: false },
        });
      }
    }

    // Create order id
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randStr = Math.floor(1000 + Math.random() * 9000);
    const orderId = `RCP-${dateStr}-${randStr}`;

    // Load cadet & allowance logic
    const cadet = await Cadet.findById(cadetId);
    if (!cadet) return res.status(404).json({ error: "Cadet not found" });

    const totalAmount = Number(total) || 0;
    const methodLower = (paymentMethod || "").toLowerCase();
    const remainderMethodLower = (
      req.body.remainderPaymentMethod ||
      req.body.secondaryPaymentMethod ||
      req.body.paymentMethod ||
      ""
    ).toLowerCase();

    const allowanceAvailable = Number(cadet.monthlyAllowance || 0);
    const baseLimitBefore =
      Number(cadet.monthlyAllowance || 0) + Number(cadet.totalSpent || 0);
    const preUsedRatio =
      baseLimitBefore > 0 ? Number(cadet.totalSpent || 0) / baseLimitBefore : 0;

    let allowanceUsed = 0;
    if (totalAmount > allowanceAvailable && allowanceAvailable > 0) {
      allowanceUsed = allowanceAvailable;
    } else if (methodLower.includes("allowance")) {
      allowanceUsed = Math.min(totalAmount, allowanceAvailable);
    }
    const cashOrCardDue = Math.max(0, totalAmount - allowanceUsed);

    cadet.monthlyAllowance = Math.max(0, allowanceAvailable - allowanceUsed);
    const postSpent = Number(cadet.totalSpent || 0) + allowanceUsed;
    cadet.totalSpent = postSpent;

    const postUsedRatio = baseLimitBefore > 0 ? postSpent / baseLimitBefore : 0;
    let allowanceHalfExceeded = false;
    if (
      !cadet.allowanceHalfNotified &&
      preUsedRatio < 0.5 &&
      postUsedRatio >= 0.5
    ) {
      cadet.allowanceHalfNotified = true;
      allowanceHalfExceeded = true;
    }
    await cadet.save();

    const effectivePaymentMethod =
      cashOrCardDue > 0
        ? remainderMethodLower.includes("credit")
          ? "Credit Card"
          : remainderMethodLower.includes("cash")
          ? "Cash"
          : methodLower.includes("credit")
          ? "Credit Card"
          : methodLower.includes("cash")
          ? "Cash"
          : "Cash"
        : "Monthly Allowance";

    const order = new Order({
      cadet: cadetId,
      items,
      total: totalAmount,
      orderId,
      paymentMethod: effectivePaymentMethod,
      allowanceUsed,
      cashOrCardDue,
      idempotencyKey: clientIdemKey || undefined,
    });

    try {
      await order.save();
    } catch (saveErr) {
      if (
        clientIdemKey &&
        (saveErr?.code === 11000 ||
          /duplicate key/i.test(saveErr?.message || ""))
      ) {
        const existing = await Order.findOne({
          idempotencyKey: clientIdemKey,
          cadet: cadetId,
        });
        if (existing) {
          const cadetSnap = await Cadet.findById(cadetId);
          const cadetSafeExisting = {
            serviceNumber: cadetSnap.serviceNumber,
            name: cadetSnap.name,
            email: cadetSnap.email,
            company: cadetSnap.company || "-",
            platoon: cadetSnap.platoon || "-",
            academyYear: cadetSnap.academyYear || "-",
            phone: cadetSnap.phone || "-",
            roomNumber: cadetSnap.roomNumber || "-",
            dob: cadetSnap.dob || "-",
            monthlyAllowance: cadetSnap.monthlyAllowance,
            totalSpent: cadetSnap.totalSpent,
          };
          return res.status(200).json({
            order: existing,
            cadet: cadetSafeExisting,
            alerts: { allowanceHalfExceeded: false },
          });
        }
      }
      throw saveErr;
    }

    // Activity logs
    try {
      const firstItemName = (items && items[0] && items[0].name) || "items";
      await Activity.create({
        kind: "purchase",
        message: `Cadet ${
          cadet.name?.split(" ")[0] || cadet.serviceNumber
        } purchased ${firstItemName}`,
        amount: Number(order.total || 0),
        unit: "Rs",
        actorType: "cadet",
        actorId: String(cadet.serviceNumber || ""),
        meta: { orderId: order.orderId },
      });
      if (cashOrCardDue > 0) {
        await Activity.create({
          kind: "allowance",
          message: `Cadet ${
            cadet.name?.split(" ")[0] || cadet.serviceNumber
          } exceeded credit limit`,
          amount: -Number(cashOrCardDue),
          unit: "Rs",
          actorType: "cadet",
          actorId: String(cadet.serviceNumber || ""),
          meta: { orderId: order.orderId },
        });
      }
    } catch (actErr) {
      console.warn("[order.js] Activity log failed:", actErr?.message);
    }

    const cadetSafe = {
      serviceNumber: cadet.serviceNumber,
      name: cadet.name,
      email: cadet.email,
      company: cadet.company || "-",
      platoon: cadet.platoon || "-",
      academyYear: cadet.academyYear || "-",
      phone: cadet.phone || "-",
      roomNumber: cadet.roomNumber || "-",
      dob: cadet.dob || "-",
      monthlyAllowance: cadet.monthlyAllowance,
      totalSpent: cadet.totalSpent,
    };

    res.status(201).json({
      order,
      cadet: cadetSafe,
      alerts: {
        allowanceHalfExceeded,
        usedPercent: Math.round(postUsedRatio * 100),
        baseLimit: baseLimitBefore,
      },
    });
  } catch (err) {
    console.error("[order.js] /create error:", err);
    res
      .status(500)
      .json({ error: "Failed to create order", details: err.message });
  }
});

module.exports = router;
