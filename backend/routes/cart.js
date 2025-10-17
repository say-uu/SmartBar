const express = require("express");
const router = express.Router();
const Cart = require("../models/Cart");
const Cadet = require("../models/Cadet");
const jwt = require("jsonwebtoken");

// Middleware to verify JWT and extract serviceNumber
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  jwt.verify(token, process.env.JWT_SECRET || "secret", (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user;
    next();
  });
}

// Get cart for a cadet
router.get("/get", authenticateToken, async (req, res) => {
  try {
    const serviceNumber = req.user.serviceNumber;
    let cart = await Cart.findOne({ serviceNumber });
    if (!cart) {
      cart = new Cart({ serviceNumber, items: [] });
      await cart.save();
    }
    // Map backend items to frontend format
    const items = cart.items.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty || item.quantity || 1,
      image: item.image || item.img || "",
    }));
    res.json({ items });
  } catch (err) {
    console.error("Get cart error:", err);
    res.status(500).json({ error: "Failed to fetch cart." });
  }
});

// Add item to cart
router.post("/add", authenticateToken, async (req, res) => {
  console.log("POST /api/cart/add called");
  try {
    const serviceNumber = req.user.serviceNumber;
    const { item } = req.body;
    if (
      !item ||
      !item.name ||
      typeof item.price !== "number" ||
      typeof item.qty !== "number"
    ) {
      return res.status(400).json({
        error: "Invalid item. 'name', 'price', and 'qty' are required.",
      });
    }
    let cart = await Cart.findOne({ serviceNumber });
    if (!cart) {
      cart = new Cart({ serviceNumber, items: [] });
    }
    // Check if item already exists in cart (by name)
    const existing = cart.items.find((i) => i.name === item.name);
    if (existing) {
      existing.qty = item.qty; // set to new quantity
      existing.price = item.price;
      existing.image = item.image || item.img || "";
    } else {
      cart.items.push({
        name: item.name,
        price: item.price,
        qty: item.qty || 1,
        image: item.image || item.img || "",
      });
    }
    await cart.save();
    // Map backend items to frontend format
    const items = cart.items.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty || 1,
      image: item.image || "",
    }));
    res.json({ items });
  } catch (err) {
    console.error("Add to cart error:", err);
    if (err && err.stack) console.error(err.stack);
    res.status(500).json({
      error: "Failed to add item to cart.",
      details: err && err.message,
    });
  }
});

// Remove item from cart
router.post("/remove", authenticateToken, async (req, res) => {
  try {
    const serviceNumber = req.user.serviceNumber;
    const { itemName } = req.body;
    let cart = await Cart.findOne({ serviceNumber });
    if (!cart) return res.status(404).json({ error: "Cart not found." });
    cart.items = cart.items.filter((i) => i.name !== itemName);
    await cart.save();
    // Map backend items to frontend format
    const items = cart.items.map((item) => ({
      name: item.name,
      price: item.price,
      qty: item.qty || 1,
      image: item.image || "",
    }));
    res.json({ items });
  } catch (err) {
    console.error("Remove from cart error:", err);
    res.status(500).json({ error: "Failed to remove item from cart." });
  }
});

// Clear cart
router.post("/clear", authenticateToken, async (req, res) => {
  try {
    const serviceNumber = req.user.serviceNumber;
    const cart = await Cart.findOneAndUpdate(
      { serviceNumber },
      { $set: { items: [] } },
      { new: true }
    );
    if (!cart) return res.status(404).json({ error: "Cart not found." });
    res.json({ items: [] });
  } catch (err) {
    console.error("Clear cart error:", err);
    res.status(500).json({ error: "Failed to clear cart." });
  }
});

// Checkout (deduct allowance, clear cart)
router.post("/checkout", authenticateToken, async (req, res) => {
  try {
    const serviceNumber = req.user.serviceNumber;
    let cart = await Cart.findOne({ serviceNumber });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }
    // Calculate total
    const total = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    // Deduct from cadet's allowance
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) return res.status(404).json({ error: "Cadet not found." });
    if (cadet.monthlyAllowance < total) {
      return res.status(400).json({ error: "Insufficient allowance." });
    }
    cadet.monthlyAllowance -= total;
    cadet.totalSpent += total;
    await cadet.save();
    // Clear cart
    cart.items = [];
    await cart.save();
    res.json({
      message: "Checkout successful.",
      monthlyAllowance: cadet.monthlyAllowance,
      totalSpent: cadet.totalSpent,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: "Checkout failed." });
  }
});

module.exports = router;
