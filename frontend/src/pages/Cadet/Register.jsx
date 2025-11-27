import React, { useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import IsoDatePicker from "../../components/IsoDatePicker";

export default function Register() {
  const [form, setForm] = useState({
    serviceNumber: "",
    name: "",
    intake: "",
    phone: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // null=unknown, true/false
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailFormatValid, setEmailFormatValid] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (emailFormatValid === false) {
      setError("Please enter a valid email address.");
      return;
    }
    if (emailExists === false) {
      setError("Email does not exist.Please provide a valid email address.");
      return;
    }
    if (
      !form.serviceNumber ||
      !form.name ||
      !form.email ||
      !form.intake ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError(
        "All required fields (serviceNumber, name, email, intake, password) must be provided."
      );
      return;
    }
    if (
      isNaN(form.intake) ||
      Number(form.intake) < 1 ||
      !/^\d{2,}$/.test(String(form.intake))
    ) {
      setError(
        "Intake must be a positive two digit or more number (e.g. 41, 25, 2025)."
      );
      return;
    }
    if (!/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(form.password)) {
      setError(
        "Password must be at least 8 characters, include an uppercase letter, a number, and a special character."
      );
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post("/api/auth/register", {
        serviceNumber: form.serviceNumber,
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone?.trim() || "",
        dob: form.dob || "",
        intake: form.intake ? String(form.intake) : "",
        // Keep academyYear for backward compatibility if used elsewhere
        academyYear: form.intake ? String(form.intake) : "",
      });
      setLoading(false);
      navigate("/cadet/login");
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  // Check if email domain looks deliverable (best-effort). Uses backend DNS check.
  const checkEmailExists = async (email) => {
    const val = (email || "").toString().trim();
    // Basic client-side email format check
    const basicEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!val || !basicEmail.test(val)) {
      setEmailFormatValid(false);
      setEmailExists(null);
      return;
    }
    setEmailFormatValid(true);
    setCheckingEmail(true);
    try {
      const { data } = await axiosClient.post("/api/auth/check-email", {
        email: val,
      });
      setEmailExists(!!data.exists);
    } catch (e) {
      // If backend returned an explicit exists flag, use it; otherwise treat as unknown
      const explicit = e?.response?.data?.exists;
      if (typeof explicit === "boolean") {
        setEmailExists(!!explicit);
      } else {
        setEmailExists(null);
      }
    } finally {
      setCheckingEmail(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bar image.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1b2444]/90 via-[#1f2d5f]/90 to-[#0f1f49]/90" />
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
          Create Cadet Account
        </h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Cadet ID removed */}
          <input
            type="text"
            name="serviceNumber"
            placeholder="Service Number (must be unique)"
            value={form.serviceNumber}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="number"
            name="intake"
            placeholder="Intake (e.g. 2025)"
            value={form.intake}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="tel"
            name="phone"
            placeholder="Mobile Number"
            value={form.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            pattern="^[0-9()+\- ]{7,}$"
            title="Enter a valid phone number (digits, spaces, +, -, parentheses)"
          />
          {/* Date of Birth picker (label removed to align with other placeholders) */}
          <IsoDatePicker
            value={form.dob}
            onChange={(val) => setForm({ ...form, dob: val })}
            minYear={1950}
            maxYear={new Date().getFullYear()}
            placeholder="Date of Birth (YYYY-MM-DD)"
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => {
              handleChange(e);
              // reset existence/format state while editing
              setEmailExists(null);
              setEmailFormatValid(true);
            }}
            onBlur={() => checkEmailExists(form.email)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          {checkingEmail && (
            <div className="text-xs text-slate-500 mt-1">Checking email…</div>
          )}
          {emailFormatValid === false && (
            <div className="text-xs text-red-500 mt-1">
              Please enter a valid email address.
            </div>
          )}
          {emailFormatValid !== false && emailExists === false && (
            <div className="text-xs text-red-500 mt-1">
              Email does not exist.
            </div>
          )}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
              required
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
            {form.password && passwordRegex.test(form.password) && (
              <span className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500 text-xl">
                &#10003;
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
              required
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              onClick={() => setShowConfirm((v) => !v)}
            >
              {showConfirm ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-semibold text-lg transition"
            disabled={
              loading || emailExists === false || emailFormatValid === false
            }
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </form>
        <div className="mt-6 text-center text-gray-500 text-sm">
          Already have an account?{" "}
          <Link to="/cadet/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
