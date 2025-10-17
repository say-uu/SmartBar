const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const CadetSchema = new mongoose.Schema({
  serviceNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  firstName: { type: String, default: "" },
  lastName: { type: String, default: "" },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  company: String,
  platoon: String,
  academyYear: String,
  intake: { type: String, default: "" },
  phone: { type: String, default: "" },
  roomNumber: { type: String, default: "" },
  dob: { type: String, default: "" },
  monthlyAllowance: { type: Number, default: 15000 },
  totalSpent: { type: Number, default: 0 },
  firstLogin: { type: Boolean, default: true },
  allowanceHalfNotified: { type: Boolean, default: false },
  // Publicly accessible (relative) URL to the cadet's profile photo
  photoUrl: { type: String, default: "" },
});

CadetSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

CadetSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("Cadet", CadetSchema);
