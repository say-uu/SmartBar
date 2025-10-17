const express = require("express");
const router = express.Router();
const Cadet = require("../models/Cadet");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// Multer setup for larger photo uploads (default 8MB, configurable via env)
// Raise BASE64 fallback default to 8MB so the fallback path does not immediately fail with 413/400
const MAX_PHOTO_MB = parseInt(process.env.MAX_PHOTO_MB || "8", 10); // raw bytes limit (multipart)
const BASE64_PHOTO_MB = parseInt(process.env.BASE64_PHOTO_MB || "8", 10); // limit for legacy base64 path
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Helper to normalize a Cadet to a frontend-friendly profile payload
function toProfileDTO(cadet) {
  const name = cadet.name || "";
  const parts = name.trim().split(/\s+/);
  const firstName = cadet.firstName || parts[0] || "";
  const lastName =
    cadet.lastName || (parts.length > 1 ? parts.slice(1).join(" ") : "");
  // Fallback: older accounts may have stored intake under academyYear
  const intakeValue = (cadet.intake || cadet.academyYear || "")
    .toString()
    .trim();
  return {
    serviceNumber: cadet.serviceNumber,
    name: (firstName + (lastName ? " " + lastName : "")).trim(),
    firstName,
    lastName,
    email: cadet.email,
    company: cadet.company || "-",
    platoon: cadet.platoon || "-",
    academyYear: cadet.academyYear || "-",
    intake: intakeValue || "-",
    phone: cadet.phone || "-",
    roomNumber: cadet.roomNumber || "-",
    dob: cadet.dob || "-",
    monthlyAllowance: cadet.monthlyAllowance,
    totalSpent: cadet.totalSpent,
    firstLogin: cadet.firstLogin,
    photoUrl: cadet.photoUrl || "",
  };
}

// Ensure photoUrl is absolute (so frontend need not guess host)
function withAbsolutePhoto(dto, req) {
  if (dto.photoUrl && !/^https?:\/\//i.test(dto.photoUrl)) {
    const base =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
    dto.photoUrl = base.replace(/\/$/, "") + dto.photoUrl; // dto.photoUrl already starts with '/'
  }
  return dto;
}

// Update Cadet Profile (for Profile Settings page)
router.put("/profile", async (req, res) => {
  try {
    let serviceNumber = (req.body.serviceNumber || "").trim();
    console.log("[PUT /profile] Incoming serviceNumber:", serviceNumber);
    if (!serviceNumber && req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        serviceNumber = decoded.serviceNumber;
        console.log(
          "[PUT /profile] Decoded serviceNumber from JWT:",
          serviceNumber
        );
      } catch (e) {
        console.warn("[PUT /profile] JWT parse/verify failed");
      }
    }
    if (!serviceNumber) {
      console.log("[PUT /profile] No serviceNumber provided.");
      return res.status(400).json({ error: "Service Number is required." });
    }

    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) {
      console.log(
        "[PUT /profile] Cadet not found for serviceNumber:",
        serviceNumber
      );
      return res.status(404).json({ error: "Cadet not found." });
    }

    // Build updates from allowed fields only
    const {
      name,
      firstName,
      lastName,
      email,
      phone,
      dob,
      company,
      platoon,
      roomNumber,
      academyYear,
      intake,
      photoBase64,
      removePhoto, // boolean flag from frontend to request deletion
    } = req.body;

    const updates = {};
    const safeTrim = (v) => (typeof v === "string" ? v.trim() : v);

    // Name handling: prefer explicit name, else combine first/last
    const combined = (
      (safeTrim(firstName) || "") +
      (safeTrim(lastName) ? " " + safeTrim(lastName) : "")
    ).trim();
    if (typeof name === "string" && name.trim() !== "") {
      updates.name = name.trim();
    } else if (combined) {
      updates.name = combined;
    }

    if (typeof email === "string" && email.trim() !== "") {
      const newEmail = email.trim().toLowerCase();
      if (newEmail !== cadet.email.toLowerCase()) {
        const exists = await Cadet.findOne({
          email: newEmail,
          _id: { $ne: cadet._id },
        });
        if (exists) {
          return res.status(400).json({ error: "Email already in use." });
        }
        updates.email = newEmail;
      }
    }

    if (phone !== undefined) updates.phone = safeTrim(phone) || "";
    if (company !== undefined) updates.company = safeTrim(company) || "";
    if (platoon !== undefined) updates.platoon = safeTrim(platoon) || "";
    if (roomNumber !== undefined)
      updates.roomNumber = safeTrim(roomNumber) || "";
    if (academyYear !== undefined)
      updates.academyYear = safeTrim(academyYear) || "";

    if (dob !== undefined) {
      const val = safeTrim(dob) || "";
      // accept yyyy-MM-dd, else store empty
      updates.dob = val && /^\d{4}-\d{2}-\d{2}$/.test(val) ? val : "";
    }

    if (intake !== undefined) updates.intake = safeTrim(intake) || "";

    // If explicitly requested, remove existing photo (fallback path when DELETE route not reachable)
    if (removePhoto === true && cadet.photoUrl) {
      const relative = cadet.photoUrl;
      if (relative.startsWith("/uploads/")) {
        try {
          const diskPath = path.join(
            __dirname,
            "..",
            relative.replace(/^[\\/]/, "")
          );
          if (fs.existsSync(diskPath)) fs.unlinkSync(diskPath);
        } catch (e) {
          console.warn("[PUT /profile] removePhoto unlink failed:", e.message);
        }
      }
      updates.photoUrl = "";
    }

    // Handle optional base64 photo upload (data URL or raw base64)
    if (photoBase64 && typeof photoBase64 === "string") {
      try {
        // Accept formats like 'data:image/png;base64,....' or raw
        const match = photoBase64.match(/^data:(image\/[^;]+);base64,(.+)$/i);
        let base64Data = photoBase64;
        let ext = "png";
        if (match) {
          base64Data = match[2];
          const mime = match[1];
          ext = mime.split("/")[1] || "png";
        }
        // Limit size after decoding using BASE64_PHOTO_MB
        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length > BASE64_PHOTO_MB * 1024 * 1024) {
          return res
            .status(400)
            .json({ error: `Photo too large (max ${BASE64_PHOTO_MB}MB)` });
        }
        const uploadsDir = path.join(__dirname, "..", "uploads", "photos");
        fs.mkdirSync(uploadsDir, { recursive: true });
        const fileName = `cadet_${cadet._id}.${ext}`;
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);
        // Public URL relative path
        updates.photoUrl = `/uploads/photos/${fileName}`;
      } catch (e) {
        console.warn("[PUT /profile] photo save failed", e.message);
        return res.status(400).json({ error: "Invalid photo data" });
      }
    }

    // Perform update if there is anything to update
    if (Object.keys(updates).length > 0) {
      await Cadet.updateOne({ _id: cadet._id }, { $set: updates });
    }

    const fresh = await Cadet.findById(cadet._id);
    return res.json(withAbsolutePhoto(toProfileDTO(fresh), req));
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile." });
  }
});

// Get Cadet Profile (for Profile Settings page)
router.get("/profile", async (req, res) => {
  try {
    // Try to get serviceNumber from query, or from JWT if available
    let serviceNumber = req.query.serviceNumber;
    console.log(
      "[GET /profile] Incoming serviceNumber (query):",
      serviceNumber
    );
    if (!serviceNumber && req.headers.authorization) {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      serviceNumber = decoded.serviceNumber;
      console.log(
        "[GET /profile] Decoded serviceNumber from JWT:",
        serviceNumber
      );
    }
    // DEV ONLY: fallback to default service number for local testing
    if (!serviceNumber && process.env.NODE_ENV !== "production") {
      serviceNumber = "4001"; // <-- set your dev test service number here
      console.log(
        "[GET /profile] Using DEV fallback serviceNumber:",
        serviceNumber
      );
    }
    if (!serviceNumber) {
      console.log("[GET /profile] No serviceNumber provided.");
      return res.status(400).json({ error: "Service Number is required." });
    }
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) {
      console.log(
        "[GET /profile] Cadet not found for serviceNumber:",
        serviceNumber
      );
      return res.status(404).json({ error: "Cadet not found." });
    }
    // One-time migration: if intake is empty but academyYear has a value, copy it to intake
    if (
      (!cadet.intake || String(cadet.intake).trim() === "") &&
      cadet.academyYear &&
      String(cadet.academyYear).trim() !== ""
    ) {
      try {
        cadet.intake = String(cadet.academyYear).trim();
        await cadet.save();
      } catch (e) {
        console.warn(
          "[GET /profile] Failed to persist intake from academyYear for",
          serviceNumber
        );
      }
    }
    // Return all relevant profile fields with derived first/last name
    res.json(withAbsolutePhoto(toProfileDTO(cadet), req));
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile." });
  }
});

// Get Cadet Allowance and Total Spent
router.get("/cadet-allowance", async (req, res) => {
  try {
    const { serviceNumber } = req.query;
    if (!serviceNumber) {
      return res.status(400).json({ error: "Service Number is required." });
    }
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) {
      return res.status(404).json({ error: "Cadet not found." });
    }
    res.json({
      monthlyAllowance: cadet.monthlyAllowance,
      totalSpent: cadet.totalSpent,
    });
  } catch (err) {
    console.error("Get cadet allowance error:", err);
    res.status(500).json({ error: "Failed to fetch allowance." });
  }
});

// Update Cadet Allowance and Total Spent after purchase
router.post("/update-allowance", async (req, res) => {
  try {
    const { serviceNumber, amount } = req.body;
    if (!serviceNumber || typeof amount !== "number") {
      return res
        .status(400)
        .json({ error: "Service Number and amount are required." });
    }
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) {
      return res.status(404).json({ error: "Cadet not found." });
    }
    // Deduct only up to remaining allowance, but add full amount to totalSpent
    const allowanceDeducted = Math.min(amount, cadet.monthlyAllowance);
    cadet.monthlyAllowance = Math.max(
      0,
      cadet.monthlyAllowance - allowanceDeducted
    );
    cadet.totalSpent += amount;
    await cadet.save();
    // Return updated user object for frontend state update
    res.json({
      message: "Allowance and total spent updated.",
      monthlyAllowance: cadet.monthlyAllowance,
      totalSpent: cadet.totalSpent,
      user: {
        serviceNumber: cadet.serviceNumber,
        name: cadet.name,
        email: cadet.email,
        academyYear: cadet.academyYear,
        intake: cadet.intake,
        monthlyAllowance: cadet.monthlyAllowance,
        totalSpent: cadet.totalSpent,
      },
    });
  } catch (err) {
    console.error("Update allowance error:", err);
    res.status(500).json({ error: "Failed to update allowance." });
  }
});

// Cadet Password Reset
router.post("/reset-password", async (req, res) => {
  try {
    const { id, newPassword, role } = req.body;
    if (role !== "cadet") {
      return res.status(400).json({ error: "Invalid role." });
    }
    if (!id || !newPassword) {
      return res
        .status(400)
        .json({ error: "Service Number and new password are required." });
    }
    const cadet = await Cadet.findOne({ serviceNumber: id });
    if (!cadet) {
      return res.status(404).json({ error: "Cadet not found." });
    }
    cadet.password = newPassword;
    cadet.markModified("password");
    await cadet.save();
    res.json({ message: "Password reset successful." });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Password reset failed." });
  }
});

// Register
router.post("/register", async (req, res) => {
  try {
    const {
      serviceNumber,
      name,
      email,
      password,
      academyYear,
      intake,
      phone,
      dob,
    } = req.body;
    if (!serviceNumber || !name || !email || !password || !academyYear) {
      return res.status(400).json({
        error:
          "All required fields (serviceNumber, name, email, password, academyYear) must be provided.",
      });
    }
    // Check for existing serviceNumber or email
    const serviceNumberExists = await Cadet.findOne({ serviceNumber });
    if (serviceNumberExists)
      return res.status(400).json({ error: "Service Number already exists." });
    const emailExists = await Cadet.findOne({ email });
    if (emailExists)
      return res.status(400).json({ error: "Email already exists." });

    // Create and save new cadet
    const parts = (name || "").trim().split(/\s+/);
    const firstName = parts[0] || "";
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
    // sanitize dob to yyyy-MM-dd or empty
    const dobStr =
      typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : "";

    const cadet = new Cadet({
      serviceNumber,
      name,
      firstName,
      lastName,
      email: (email || "").toLowerCase(),
      password,
      academyYear,
      phone: typeof phone === "string" ? phone.trim() : "",
      dob: dobStr,
      firstLogin: true,
      intake: intake || "",
    });
    await cadet.save();
    // Generate JWT for immediate login after registration
    const token = jwt.sign(
      { id: cadet._id, serviceNumber: cadet.serviceNumber, role: "cadet" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );
    res.status(201).json({
      message: "Account created successfully.",
      token,
      user: withAbsolutePhoto(
        {
          id: cadet._id,
          serviceNumber: cadet.serviceNumber,
          name: cadet.name,
          firstName,
          lastName,
          email: cadet.email,
          academyYear: cadet.academyYear,
          intake: cadet.intake,
          phone: cadet.phone || "",
          dob: cadet.dob || "",
          monthlyAllowance: cadet.monthlyAllowance,
          totalSpent: cadet.totalSpent,
          firstLoginWasTrue: true,
          photoUrl: cadet.photoUrl || "",
        },
        req
      ),
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { id, password } = req.body;
    if (!id || !password) {
      return res
        .status(400)
        .json({ error: "Service Number and password are required." });
    }
    const cadet = await Cadet.findOne({ serviceNumber: id });
    if (!cadet) {
      return res
        .status(400)
        .json({ error: "Invalid Service Number or password." });
    }
    const isMatch = await cadet.comparePassword(password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ error: "Invalid Service Number or password." });
    }
    // Generate JWT
    const token = jwt.sign(
      { id: cadet._id, serviceNumber: cadet.serviceNumber, role: "cadet" },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "1d" }
    );
    // Detect first login
    const firstLoginWasTrue = !!cadet.firstLogin;
    if (cadet.firstLogin) {
      cadet.firstLogin = false;
      await cadet.save();
    }
    res.json({
      token,
      user: withAbsolutePhoto(
        {
          id: cadet._id,
          serviceNumber: cadet.serviceNumber,
          name: cadet.name,
          firstName: cadet.firstName,
          lastName: cadet.lastName,
          email: cadet.email,
          academyYear: cadet.academyYear,
          phone: cadet.phone || "",
          dob: cadet.dob || "",
          monthlyAllowance: cadet.monthlyAllowance,
          totalSpent: cadet.totalSpent,
          firstLoginWasTrue,
          photoUrl: cadet.photoUrl || "",
        },
        req
      ),
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed." });
  }
});

/**
 * Multipart photo upload (preferred over base64 for large files)
 * Endpoint: POST /api/auth/profile/photo
 * Form field: photo
 */
router.post("/profile/photo", upload.single("photo"), async (req, res) => {
  // Prefer JWT serviceNumber (authoritative) over body to avoid mismatch 404s
  let jwtServiceNumber = null;
  if (req.headers.authorization) {
    try {
      const token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
      jwtServiceNumber = decoded.serviceNumber;
    } catch (e) {
      console.warn("[POST /profile/photo] JWT decode failed:", e.message);
    }
  }
  const bodyServiceNumber = req.body.serviceNumber?.trim();
  const serviceNumber = (jwtServiceNumber || bodyServiceNumber || "").trim();
  console.log("[POST /profile/photo] hit", {
    hasFile: !!req.file,
    jwtServiceNumber,
    bodyServiceNumber,
    resolvedServiceNumber: serviceNumber,
  });
  try {
    if (!serviceNumber) {
      return res
        .status(400)
        .json({ error: "Service Number is required (missing token?)." });
    }
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) {
      console.warn(
        "[POST /profile/photo] Cadet not found for serviceNumber=",
        serviceNumber
      );
      return res.status(404).json({ error: "Cadet not found for upload." });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }
    const mime = req.file.mimetype;
    const ext = mime.split("/")[1] || "png";
    const uploadsDir = path.join(__dirname, "..", "uploads", "photos");
    fs.mkdirSync(uploadsDir, { recursive: true });
    const fileName = `cadet_${cadet._id}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, req.file.buffer);
    cadet.photoUrl = `/uploads/photos/${fileName}`;
    await cadet.save();
    const dto = withAbsolutePhoto(toProfileDTO(cadet), req);
    console.log("[POST /profile/photo] Saved", {
      cadet: cadet.serviceNumber,
      file: filePath,
      photoUrl: dto.photoUrl,
      size: req.file.size,
      mime: req.file.mimetype,
    });
    return res.json(dto);
  } catch (err) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(413)
        .json({ error: `Photo too large (max ${MAX_PHOTO_MB}MB)` });
    }
    console.error("[POST /profile/photo] Unexpected error:", err);
    return res.status(500).json({ error: "Failed to upload photo." });
  }
});

// Remove current profile photo (clears photoUrl and deletes file if local)
router.delete("/profile/photo", async (req, res) => {
  try {
    // Resolve serviceNumber from JWT (preferred)
    let serviceNumber = null;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        serviceNumber = decoded.serviceNumber;
      } catch (_) {}
    }
    // Fallback: allow explicit body serviceNumber in non-prod only
    if (!serviceNumber && process.env.NODE_ENV !== "production") {
      serviceNumber = (req.body?.serviceNumber || "").trim();
    }
    if (!serviceNumber) {
      return res
        .status(400)
        .json({ error: "Service Number is required (missing token?)." });
    }
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet) return res.status(404).json({ error: "Cadet not found." });

    // If there is a stored local file, try to delete it
    const relative = cadet.photoUrl || "";
    if (relative && relative.startsWith("/uploads/")) {
      try {
        const diskPath = path.join(
          __dirname,
          "..",
          relative.replace(/^\//, "")
        );
        if (fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
      } catch (e) {
        // Non-fatal; continue clearing DB reference
        console.warn("[DELETE /profile/photo] unlink failed:", e?.message);
      }
    }

    cadet.photoUrl = "";
    await cadet.save();
    return res.json(withAbsolutePhoto(toProfileDTO(cadet), req));
  } catch (err) {
    console.error("[DELETE /profile/photo] Unexpected error:", err);
    return res.status(500).json({ error: "Failed to remove photo." });
  }
});

// Defensive GET handler: if frontend (or user) mistakenly tries to GET the upload endpoint,
// redirect to the current cadet photo if available (based on JWT) or return 204 (no content)
router.get("/profile/photo", async (req, res) => {
  try {
    let serviceNumber;
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        serviceNumber = decoded.serviceNumber;
      } catch (_) {}
    }
    if (!serviceNumber) return res.status(204).end();
    const cadet = await Cadet.findOne({ serviceNumber });
    if (!cadet || !cadet.photoUrl) return res.status(204).end();
    // Ensure absolute
    const dto = withAbsolutePhoto(toProfileDTO(cadet), req);
    // Redirect browser to actual file so the image tag will show it
    return res.redirect(dto.photoUrl);
  } catch (e) {
    return res.status(204).end();
  }
});

module.exports = router;

// Debug route: returns cadet photo metadata and whether file exists (dev only)
if (process.env.NODE_ENV !== "production") {
  router.get("/_debug/cadet-photo", async (req, res) => {
    try {
      let serviceNumber = req.query.serviceNumber;
      if (!serviceNumber && req.headers.authorization) {
        try {
          const token = req.headers.authorization.split(" ")[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
          serviceNumber = decoded.serviceNumber;
        } catch (_) {}
      }
      if (!serviceNumber)
        return res.status(400).json({ error: "serviceNumber required" });
      const cadet = await Cadet.findOne({ serviceNumber });
      if (!cadet) return res.status(404).json({ error: "Cadet not found" });
      const relative = cadet.photoUrl;
      const absDto = withAbsolutePhoto(toProfileDTO(cadet), req);
      let exists = false;
      let diskPath = null;
      if (relative && relative.startsWith("/uploads/")) {
        diskPath = path.join(__dirname, "..", relative.replace(/^\//, ""));
        exists = fs.existsSync(diskPath);
      }
      return res.json({
        serviceNumber: cadet.serviceNumber,
        storedPhotoUrl: cadet.photoUrl,
        absolutePhotoUrl: absDto.photoUrl,
        diskPath,
        fileExists: exists,
      });
    } catch (e) {
      return res.status(500).json({ error: "debug failed", detail: e.message });
    }
  });
}
