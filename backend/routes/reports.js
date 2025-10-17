const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/authMiddleware");
console.log("[ReportsRouter] Loaded reports routes module");
const Order = require("../models/Order");
const InventoryItem = require("../models/InventoryItem");
const Cadet = require("../models/Cadet");

// Helper: parse date range from query (?from=YYYY-MM-DD&to=YYYY-MM-DD)
function getDateRange(query) {
  const today = new Date();
  const startOfDay = (d) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate());
  let { from, to } = query;
  let fromDate = from
    ? new Date(from)
    : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6); // default last 7 days
  let toDate = to ? new Date(to) : today;
  // Normalize boundaries
  fromDate = startOfDay(fromDate);
  toDate = new Date(
    toDate.getFullYear(),
    toDate.getMonth(),
    toDate.getDate(),
    23,
    59,
    59,
    999
  );
  return { fromDate, toDate };
}

// Wrap async handlers
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// SALES REPORT
// Returns aggregate sales metrics & daily breakdown
router.get(
  "/sales",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fromDate, toDate } = getDateRange(req.query);

    const matchStage = { createdAt: { $gte: fromDate, $lte: toDate } };

    const pipeline = [
      { $match: matchStage },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$orderId",
          total: { $first: "$total" },
          paymentMethod: { $first: "$paymentMethod" },
          allowanceUsed: { $first: "$allowanceUsed" },
          cashOrCardDue: { $first: "$cashOrCardDue" },
          createdAt: { $first: "$createdAt" },
          itemCount: { $sum: "$items.qty" },
          distinctItems: { $addToSet: "$items.name" },
        },
      },
      {
        $addFields: {
          distinctItemsCount: { $size: "$distinctItems" },
        },
      },
    ];

    const ordersAgg = await Order.aggregate(pipeline);

    let totalRevenue = 0;
    let totalOrders = ordersAgg.length;
    let totalItemsSold = 0;
    let totalAllowanceUsed = 0;
    let totalCashCard = 0;
    let avgOrderValue = 0;
    const dailyMap = new Map();

    ordersAgg.forEach((o) => {
      totalRevenue += o.total || 0;
      totalItemsSold += o.itemCount || 0;
      totalAllowanceUsed += o.allowanceUsed || 0;
      totalCashCard += o.cashOrCardDue || 0;
      const dayKey = o.createdAt.toISOString().substring(0, 10);
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          date: dayKey,
          orders: 0,
          revenue: 0,
          itemsSold: 0,
        });
      }
      const d = dailyMap.get(dayKey);
      d.orders += 1;
      d.revenue += o.total || 0;
      d.itemsSold += o.itemCount || 0;
    });
    if (totalOrders > 0) avgOrderValue = totalRevenue / totalOrders;

    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    res.json({
      type: "sales",
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalOrders,
        totalItemsSold,
        avgOrderValue: Number(avgOrderValue.toFixed(2)),
        totalAllowanceUsed,
        totalCashOrCard: totalCashCard,
      },
      daily,
    });
  })
);

// INVENTORY REPORT
router.get(
  "/inventory",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const lowStockThreshold = parseInt(req.query.lowStock || "10", 10);
    const items = await InventoryItem.find({}).lean();

    const lowStock = items
      .filter(
        (i) => typeof i.stock === "number" && i.stock <= lowStockThreshold
      )
      .map((i) => ({
        id: i._id,
        name: i.name,
        category: i.category,
        stock: i.stock,
        unitSize: i.unitSize || null,
      }));

    const byCategory = items.reduce((acc, i) => {
      const cat = i.category || "Unknown";
      if (!acc[cat]) acc[cat] = { category: cat, count: 0, totalStock: 0 };
      acc[cat].count += 1;
      acc[cat].totalStock += i.stock || 0;
      return acc;
    }, {});

    res.json({
      type: "inventory",
      generatedAt: new Date().toISOString(),
      lowStockThreshold,
      lowStock,
      categories: Object.values(byCategory),
      totalItems: items.length,
      totalStockUnits: items.reduce((s, i) => s + (i.stock || 0), 0),
    });
  })
);

// (Removed placeholder /cadet-spending route; real implementation below)

// CADET SPENDING REPORT
router.get(
  "/cadet-spending",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fromDate, toDate } = getDateRange(req.query);
    const orders = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    })
      .populate("cadet", "serviceNumber name monthlyAllowance")
      .lean();

    const cadetStats = new Map();
    let totalSpent = 0;
    let totalAllowanceUsed = 0;
    let totalCashCard = 0;
    orders.forEach((o) => {
      totalSpent += o.total || 0;
      totalAllowanceUsed += o.allowanceUsed || 0;
      totalCashCard += o.cashOrCardDue || 0;
      const key = o.cadet?._id?.toString() || "unknown";
      if (!cadetStats.has(key)) {
        cadetStats.set(key, {
          cadetId: key,
          serviceNumber: o.cadet?.serviceNumber || "",
          name: o.cadet?.name || "Unknown",
          monthlyAllowance: o.cadet?.monthlyAllowance || 0,
          orders: 0,
          totalSpent: 0,
          allowanceUsed: 0,
          cashOrCard: 0,
        });
      }
      const cs = cadetStats.get(key);
      cs.orders += 1;
      cs.totalSpent += o.total || 0;
      cs.allowanceUsed += o.allowanceUsed || 0;
      cs.cashOrCard += o.cashOrCardDue || 0;
    });

    const cadets = Array.from(cadetStats.values()).map((c) => ({
      ...c,
      avgOrderValue: c.orders
        ? Number((c.totalSpent / c.orders).toFixed(2))
        : 0,
      allowanceRemaining: Math.max(
        0,
        (c.monthlyAllowance || 0) - (c.allowanceUsed || 0)
      ),
    }));
    cadets.sort((a, b) => b.totalSpent - a.totalSpent);

    res.json({
      type: "cadet-spending",
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      generatedAt: new Date().toISOString(),
      summary: {
        uniqueCadets: cadets.length,
        totalSpent,
        totalAllowanceUsed,
        totalCashCard,
        avgPerCadet: cadets.length
          ? Number((totalSpent / cadets.length).toFixed(2))
          : 0,
      },
      topCadets: cadets.slice(0, 10),
      cadets,
    });
  })
);

// FINANCIAL REPORT
router.get(
  "/financial",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fromDate, toDate } = getDateRange(req.query);
    const orders = await Order.find({
      createdAt: { $gte: fromDate, $lte: toDate },
    }).lean();
    let totalRevenue = 0;
    let totalAllowanceUsed = 0;
    let totalCashCard = 0;
    const paymentBreakdown = {};
    const dailyMap = new Map();

    orders.forEach((o) => {
      totalRevenue += o.total || 0;
      totalAllowanceUsed += o.allowanceUsed || 0;
      totalCashCard += o.cashOrCardDue || 0;
      paymentBreakdown[o.paymentMethod] = paymentBreakdown[o.paymentMethod] || {
        method: o.paymentMethod,
        revenue: 0,
        orders: 0,
      };
      paymentBreakdown[o.paymentMethod].revenue += o.total || 0;
      paymentBreakdown[o.paymentMethod].orders += 1;
      const dayKey = o.createdAt.toISOString().substring(0, 10);
      if (!dailyMap.has(dayKey))
        dailyMap.set(dayKey, { date: dayKey, revenue: 0, orders: 0 });
      const d = dailyMap.get(dayKey);
      d.revenue += o.total || 0;
      d.orders += 1;
    });
    const totalOrders = orders.length;
    const avgDailyRevenue = dailyMap.size
      ? Number((totalRevenue / dailyMap.size).toFixed(2))
      : 0;
    const avgOrderValue = totalOrders
      ? Number((totalRevenue / totalOrders).toFixed(2))
      : 0;
    const daily = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const highestRevenueDay =
      daily.slice().sort((a, b) => b.revenue - a.revenue)[0] || null;

    res.json({
      type: "financial",
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      generatedAt: new Date().toISOString(),
      summary: {
        totalRevenue,
        totalOrders,
        totalAllowanceUsed,
        totalCashCard,
        avgDailyRevenue,
        avgOrderValue,
        highestRevenueDay,
      },
      paymentMethods: Object.values(paymentBreakdown),
      daily,
    });
  })
);

// OPERATIONAL REPORT
router.get(
  "/operational",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fromDate, toDate } = getDateRange(req.query);
    const lowStockThreshold = parseInt(req.query.lowStock || "10", 10);
    const [orders, inventory] = await Promise.all([
      Order.find({ createdAt: { $gte: fromDate, $lte: toDate } }).lean(),
      InventoryItem.find({}).lean(),
    ]);

    if (!orders.length) {
      return res.json({
        type: "operational",
        range: { from: fromDate.toISOString(), to: toDate.toISOString() },
        generatedAt: new Date().toISOString(),
        summary: { orders: 0 },
        message: "No orders in selected period",
      });
    }

    // Build name -> category map
    const nameToCategory = inventory.reduce((m, i) => {
      m[i.name] = i.category || "Unknown";
      return m;
    }, {});

    let totalItems = 0;
    const itemsPerOrder = [];
    const hourMap = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      orders: 0,
    }));
    const dowMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
      (d) => ({ day: d, orders: 0 })
    );
    const categoryMap = {};

    orders.forEach((o) => {
      const itemsCount = (o.items || []).reduce(
        (s, it) => s + (it.qty || 0),
        0
      );
      totalItems += itemsCount;
      itemsPerOrder.push(itemsCount);
      const hr = new Date(o.createdAt).getHours();
      hourMap[hr].orders += 1;
      const dow = new Date(o.createdAt).getDay();
      dowMap[dow].orders += 1;
      (o.items || []).forEach((it) => {
        const cat = nameToCategory[it.name] || "Unknown";
        if (!categoryMap[cat])
          categoryMap[cat] = { category: cat, itemsSold: 0 };
        categoryMap[cat].itemsSold += it.qty || 0;
      });
    });
    const totalOrders = orders.length;
    const avgItemsPerOrder = totalOrders
      ? Number((totalItems / totalOrders).toFixed(2))
      : 0;
    const avgOrderSizeMedian = (() => {
      const sorted = itemsPerOrder.slice().sort((a, b) => a - b);
      if (!sorted.length) return 0;
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? sorted[mid]
        : Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2));
    })();
    const busiestHour = hourMap.slice().sort((a, b) => b.orders - a.orders)[0];
    const busiestDay = dowMap.slice().sort((a, b) => b.orders - a.orders)[0];

    const lowStock = inventory
      .filter(
        (i) => typeof i.stock === "number" && i.stock <= lowStockThreshold
      )
      .map((i) => ({
        id: i._id,
        name: i.name,
        stock: i.stock,
        category: i.category,
        unitSize: i.unitSize || null,
      }));

    res.json({
      type: "operational",
      range: { from: fromDate.toISOString(), to: toDate.toISOString() },
      generatedAt: new Date().toISOString(),
      summary: {
        totalOrders,
        avgItemsPerOrder,
        medianItemsPerOrder: avgOrderSizeMedian,
        busiestHour,
        busiestDay,
      },
      demandByHour: hourMap,
      demandByDay: dowMap,
      categories: Object.values(categoryMap).sort(
        (a, b) => b.itemsSold - a.itemsSold
      ),
      lowStockThreshold,
      lowStock,
    });
  })
);

// COMPARATIVE REPORT
router.get(
  "/comparative",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fromDate, toDate } = getDateRange(req.query);
    const durationMs = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    const [currentOrders, prevOrders] = await Promise.all([
      Order.find({ createdAt: { $gte: fromDate, $lte: toDate } }).lean(),
      Order.find({ createdAt: { $gte: prevFrom, $lte: prevTo } }).lean(),
    ]);

    function metrics(orders) {
      let revenue = 0,
        allowance = 0,
        cash = 0,
        items = 0;
      orders.forEach((o) => {
        revenue += o.total || 0;
        allowance += o.allowanceUsed || 0;
        cash += o.cashOrCardDue || 0;
        items += (o.items || []).reduce((s, it) => s + (it.qty || 0), 0);
      });
      const ordersCount = orders.length;
      return {
        revenue,
        orders: ordersCount,
        itemsSold: items,
        avgOrderValue: ordersCount
          ? Number((revenue / ordersCount).toFixed(2))
          : 0,
        allowanceUsed: allowance,
        cashOrCard: cash,
      };
    }

    function pctChange(curr, prev) {
      if (prev === 0) return curr === 0 ? 0 : null; // null denotes undefined growth from zero baseline
      return Number((((curr - prev) / prev) * 100).toFixed(2));
    }

    const current = metrics(currentOrders);
    const previous = metrics(prevOrders);

    const comparison = Object.keys(current).reduce((acc, key) => {
      acc[key] = {
        current: current[key],
        previous: previous[key],
        changePct: pctChange(current[key], previous[key]),
      };
      return acc;
    }, {});

    res.json({
      type: "comparative",
      currentRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
      previousRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      generatedAt: new Date().toISOString(),
      metrics: comparison,
    });
  })
);

module.exports = router;
