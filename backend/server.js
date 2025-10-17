console.log("Backend server starting...");
const express = require("express");
const path = require("path");
const cors = require("cors");
const mongoose = require("mongoose");
const cron = require("node-cron");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const managerRoutes = require("./routes/manager");
const inventoryRoutes = require("./routes/inventory");
const dashboardRoutes = require("./routes/dashboard");
const reportsRoutes = require("./routes/reports");
const aiRoutes = require("./routes/ai");

const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const Order = require("./models/Order");
const Cadet = require("./models/Cadet");
const Activity = require("./models/Activity");

const app = express();
app.use(cors());
// Body parser size: allow up to ~10MB JSON to accommodate base64 (4/3 expansion)
// 2MB binary -> ~2.7MB base64; choose higher headroom for future
const JSON_LIMIT = process.env.JSON_BODY_LIMIT || "10mb";
app.use(express.json({ limit: JSON_LIMIT })); // allow base64 images larger than 5mb
// Serve uploaded profile photos
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Temporary debug logging for AI route (can remove after diagnosing 404/403)
app.use((req, res, next) => {
  if (req.path.startsWith("/api/ai")) {
    console.log(
      "[AI_REQ]",
      req.method,
      req.originalUrl,
      "AuthHeader=",
      req.headers.authorization
        ? req.headers.authorization.split(" ")[0] + " ..."
        : "(none)"
    );
  }
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/manager", managerRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/manager/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/ai", aiRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/order", orderRoutes);

// Debug endpoint to list registered routes (for troubleshooting 404s during development)
if (process.env.NODE_ENV !== "production") {
  app.get("/api/_debug/routes", (req, res) => {
    const routes = [];
    app._router.stack.forEach((layer) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods)
          .filter((m) => layer.route.methods[m])
          .map((m) => m.toUpperCase());
        routes.push({ methods, path: layer.route.path });
      } else if (
        layer.name === "router" &&
        layer.handle &&
        layer.handle.stack
      ) {
        // Nested router (mounted path detection is limited without internal props)
        layer.handle.stack.forEach((r) => {
          if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods)
              .filter((m) => r.route.methods[m])
              .map((m) => m.toUpperCase());
            routes.push({
              methods,
              path: (layer.regexp?.source || "") + r.route.path,
            });
          }
        });
      }
    });
    res.json({ count: routes.length, routes });
  });
}

// Error handler for Payload Too Large (413) and JSON parse issues
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ error: "Payload too large. Reduce file size." });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Uploaded file exceeds allowed size." });
  }
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Invalid JSON body." });
  }
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Server error." });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smartbar";
const RETRY_ATTEMPTS = parseInt(process.env.MONGO_RETRY_ATTEMPTS || "10", 10);
const RETRY_DELAY_MS = parseInt(process.env.MONGO_RETRY_DELAY_MS || "3000", 10);
const REQUIRE_DB_ON_START = process.env.REQUIRE_DB_ON_START === "true"; // if true, never start without DB

function startServer() {
  if (!app._started) {
    app._started = true;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      // Lightweight route summary (top-level only) to confirm /api/auth loaded
      try {
        const authLayer = app._router.stack.find(
          (l) =>
            l?.name === "router" &&
            String(l.regexp).includes("^\\/api\\/auth\\/?$")
        );
        if (authLayer) {
          const photoRouteExists = authLayer.handle.stack.some(
            (r) => r.route && r.route.path === "/profile/photo"
          );
          console.log(
            `[Debug] /api/auth/profile/photo registered: ${photoRouteExists}`
          );
        } else {
          console.log("[Debug] /api/auth router layer not found yet.");
        }
      } catch (e) {
        console.log("[Debug] Route inspection failed:", e.message);
      }
      console.log("Hit GET /api/_debug/routes to list all routes (dev only).");

      // Schedule: Monthly allowance reset
      // Defaults: 00:05 on the 1st of every month (server local time)
      // Configurable via env: ALLOWANCE_CRON (cron expr), ALLOWANCE_BASE_CREDIT
      try {
        const cronExpr = process.env.ALLOWANCE_CRON || "5 0 1 * *";
        const baseCreditEnv = process.env.ALLOWANCE_BASE_CREDIT;
        console.log(
          `[Cron] Scheduling monthly allowance reset with expr '${cronExpr}'` +
            (baseCreditEnv
              ? `, base credit=${baseCreditEnv}`
              : " (infer per cadet)")
        );
        cron.schedule(cronExpr, async () => {
          console.log("[Cron] Monthly allowance reset job started");
          try {
            // Fetch all cadets in manageable batches
            const cursor = Cadet.find({}).cursor();
            let processed = 0;
            const ops = [];
            for (
              let cadet = await cursor.next();
              cadet != null;
              cadet = await cursor.next()
            ) {
              const baseCredit = baseCreditEnv
                ? Number(baseCreditEnv)
                : Number(cadet.monthlyAllowance || 0) +
                  Number(cadet.totalSpent || 0);
              const normalized =
                Number.isFinite(baseCredit) && baseCredit >= 0
                  ? Math.floor(baseCredit)
                  : 0;
              const update = {
                monthlyAllowance: normalized,
                totalSpent: 0,
                allowanceHalfNotified: false,
              };
              ops.push({ updateOne: { filter: { _id: cadet._id }, update } });
              processed += 1;
              if (ops.length >= 500) {
                await Cadet.bulkWrite(ops);
                ops.length = 0;
              }
            }
            if (ops.length) {
              await Cadet.bulkWrite(ops);
            }

            // Log activity
            try {
              await Activity.create({
                kind: "allowance",
                message: "Monthly credit allocation completed",
                amount: Number(baseCreditEnv) || 0,
                unit: "Rs",
                actorType: "system",
                actorId: "",
                meta: { cronExpr, baseCreditEnv: baseCreditEnv || null },
              });
            } catch (e) {
              console.warn("[Cron] Activity log failed:", e?.message);
            }

            console.log(
              `[Cron] Monthly allowance reset completed for ${processed} cadets.`
            );
          } catch (e) {
            console.error("[Cron] Monthly allowance reset failed:", e);
          }
        });
      } catch (e) {
        console.warn("[Cron] Scheduling failed:", e?.message);
      }
    });
  }
}

let attempt = 0;
async function connectWithRetry() {
  attempt += 1;
  try {
    console.log(
      `[Mongo] Attempt ${attempt}/${RETRY_ATTEMPTS} connecting to ${MONGO_URI}`
    );
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected");
    Order.init()
      .then(() => console.log("Order indexes ensured"))
      .catch((e) => console.warn("Order index init failed:", e?.message));
    startServer();
  } catch (err) {
    console.error(`[Mongo] Connection attempt ${attempt} failed:`, err.message);
    if (attempt < RETRY_ATTEMPTS) {
      console.log(`[Mongo] Retrying in ${RETRY_DELAY_MS}ms...`);
      setTimeout(connectWithRetry, RETRY_DELAY_MS);
    } else {
      console.error("[Mongo] Exhausted retry attempts.");
      if (
        process.env.ALLOW_START_WITHOUT_DB === "true" &&
        !REQUIRE_DB_ON_START
      ) {
        console.warn(
          "Starting server without DB (ALLOW_START_WITHOUT_DB=true)"
        );
        startServer();
      } else {
        console.warn(
          "Server not started (no DB). Set ALLOW_START_WITHOUT_DB=true to bypass or lower REQUIRE_DB_ON_START."
        );
      }
    }
  }
}

connectWithRetry();
