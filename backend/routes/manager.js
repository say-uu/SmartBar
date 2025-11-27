const express = require("express");
const router = express.Router();
const Manager = require("../models/Manager");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../middleware/authMiddleware");
const Cadet = require("../models/Cadet");
const Activity = require("../models/Activity");

// Manager Registration
router.post("/register", async (req, res) => {
  try {
    const { managerId, name, email, password } = req.body;
    if (!managerId || !name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    // Check for existing managerId or email
    const idExists = await Manager.findOne({ managerId });
    if (idExists)
      return res.status(400).json({ error: "Manager ID already exists." });
    const emailExists = await Manager.findOne({ email });
    if (emailExists)
      return res.status(400).json({ error: "Email already exists." });

    const manager = new Manager({ managerId, name, email, password });
    await manager.save();
    // Generate JWT
    const token = jwt.sign(
      { managerId: manager.managerId, role: "manager" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );
    res.status(201).json({
      message: "Manager account created successfully.",
      token,
      user: {
        managerId: manager.managerId,
        name: manager.name,
        email: manager.email,
      },
    });
  } catch (err) {
    console.error("Manager registration error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Manager Login
router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res
        .status(400)
        .json({ error: "Manager ID and password are required." });
    }
    const manager = await Manager.findOne({ managerId: id });
    if (!manager) {
      return res.status(400).json({ error: "Invalid Manager ID or password." });
    }
    const isMatch = await manager.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid Manager ID or password." });
    }
    // Generate JWT
    const token = jwt.sign(
      { managerId: manager.managerId, role: "manager" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );
    res.json({
      token,
      user: {
        managerId: manager.managerId,
        name: manager.name,
        email: manager.email,
      },
    });
  } catch (err) {
    console.error("Manager login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

// Manager Password Reset
router.post("/reset-password", async (req, res) => {
  try {
    const { managerId, newPassword } = req.body;
    if (!managerId || !newPassword) {
      return res
        .status(400)
        .json({ error: "Manager ID and new password are required." });
    }
    const manager = await Manager.findOne({ managerId });
    if (!manager) {
      return res.status(404).json({ error: "Manager not found." });
    }
    manager.password = newPassword;
    manager.markModified("password");
    await manager.save();
    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Manager reset password error:", err);
    res.status(500).json({ error: "Password reset failed." });
  }
});

// Below: manager cadet listing and summary endpoints

function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ error: "Manager access required" });
  }
  next();
}

// GET /api/manager/cadets - list cadets with computed credit usage, search and status filter
router.get("/cadets", authenticateToken, requireManager, async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const status = (req.query.status || "").toLowerCase(); // "active" | "exceeded" | ""

    // Build Mongo filter for basic search on name, serviceNumber, company, platoon
    const or = [];
    if (q) {
      or.push(
        { name: { $regex: q, $options: "i" } },
        { serviceNumber: { $regex: q, $options: "i" } },
        { company: { $regex: q, $options: "i" } },
        { platoon: { $regex: q, $options: "i" } }
      );
    }
    const baseFilter = or.length ? { $or: or } : {};

    const cadets = await Cadet.find(baseFilter).sort({ name: 1 });
    const rows = cadets.map((c) => {
      const remaining = Number(c.monthlyAllowance || 0);
      const spent = Number(c.totalSpent || 0);
      const baseLimit = remaining + spent; // current cycle limit
      const usage = baseLimit > 0 ? Math.round((spent / baseLimit) * 100) : 0;
      const exceeded = remaining <= 0;
      return {
        id: String(c._id),
        serviceNumber: c.serviceNumber,
        name: c.name,
        company: c.company || "-",
        platoon: c.platoon || "-",
        academyYear: c.academyYear || "-",
        email: c.email,
        monthlyCredit: baseLimit,
        spent,
        remaining,
        usage,
        status: exceeded ? "exceeded" : "active",
      };
    });

    const filtered =
      status === "active"
        ? rows.filter((r) => r.status === "active")
        : status === "exceeded"
        ? rows.filter((r) => r.status === "exceeded")
        : rows;

    res.json({ data: filtered });
  } catch (err) {
    console.error("[manager] cadets list error:", err);
    res.status(500).json({ error: "Failed to fetch cadets" });
  }
});

// GET /api/manager/cadets/summary - tiles counts
router.get(
  "/cadets/summary",
  authenticateToken,
  requireManager,
  async (req, res) => {
    try {
      const total = await Cadet.countDocuments({});
      const exceeded = await Cadet.countDocuments({
        monthlyAllowance: { $lte: 0 },
      });
      const active = Math.max(0, total - exceeded);

      // average spending this month per cadet (approx using totalSpent field)
      const cadets = await Cadet.find({}).select("totalSpent");
      const totalSpentAll = cadets.reduce(
        (s, c) => s + Number(c.totalSpent || 0),
        0
      );
      const avgSpending = total > 0 ? totalSpentAll / total : 0;

      res.json({ total, active, exceeded, avgSpending });
    } catch (err) {
      console.error("[manager] cadets summary error:", err);
      res.status(500).json({ error: "Failed to fetch summary" });
    }
  }
);

// POST /api/manager/cadets/set-allowance - bulk update monthly allowance
router.post(
  "/cadets/set-allowance",
  authenticateToken,
  requireManager,
  async (req, res) => {
    try {
      const { amount } = req.body;
      const numeric = Number(amount);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return res.status(400).json({ error: "Invalid allowance amount." });
      }
      const normalized = Math.round(numeric);
      const updateResult = await Cadet.updateMany(
        {},
        {
          $set: {
            monthlyAllowance: normalized,
            allowanceHalfNotified: false,
          },
        }
      );
      try {
        await Activity.create({
          kind: "allowance",
          message: `Monthly allowance set to Rs.${normalized}`,
          amount: normalized,
          unit: "Rs",
          actorType: "manager",
          actorId: req.user?.managerId || "",
          meta: { bulk: true },
        });
      } catch (activityErr) {
        console.warn("[manager] allowance activity log failed", activityErr);
      }
      res.json({
        message: "Monthly allowance updated successfully.",
        updated: updateResult.modifiedCount,
        value: normalized,
      });
    } catch (err) {
      console.error("[manager] set allowances error:", err);
      res.status(500).json({ error: "Failed to update allowances" });
    }
  }
);

module.exports = router;
