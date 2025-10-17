const jwt = require("jsonwebtoken");
const Cadet = require("../models/Cadet");

// Middleware to authenticate JWT and attach user to req
exports.authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    // Optionally, fetch user from DB and attach
    // req.cadet = await Cadet.findById(decoded.id);
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};
