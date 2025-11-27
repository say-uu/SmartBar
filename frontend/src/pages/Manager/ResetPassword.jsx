import React, { useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

export default function ManagerResetPassword() {
  const [form, setForm] = useState({
    managerId: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!form.managerId || !form.newPassword || !form.confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post("/api/manager/reset-password", {
        managerId: form.managerId,
        newPassword: form.newPassword,
      });
      setSuccess("Password reset successful. You can now login.");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "Reset failed.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bar image.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0f0502]/95 via-[#1c0b05]/95 to-[#050100]/95" />
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-[#a47551] mb-6 text-center">
          Manager Reset Password
        </h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <input
            type="text"
            name="managerId"
            placeholder="Manager ID (e.g. 1001)"
            value={form.managerId}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00]"
            required
          />
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={form.newPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00]"
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00]"
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#a47551] hover:bg-[#8d6242] text-white font-semibold text-lg transition"
            disabled={loading}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
          {success && (
            <div className="text-green-500 text-sm mt-2">{success}</div>
          )}
        </form>
        <div className="mt-6 text-center text-gray-500 text-sm">
          Remembered your password?{" "}
          <Link
            to="/manager/login"
            className="text-[#b85c00] hover:underline font-semibold"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
