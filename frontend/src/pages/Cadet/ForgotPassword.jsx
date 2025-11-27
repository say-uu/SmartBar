import React, { useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

export default function CadetForgotPassword() {
  const [serviceNumber, setServiceNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!serviceNumber || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await axiosClient.post("/api/auth/reset-password", {
        role: "cadet",
        id: serviceNumber,
        newPassword,
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#1b2444]/90 via-[#1f2d5f]/90 to-[#0f1f49]/90" />
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-blue-700 mb-6 text-center">
          Forgot Password
        </h2>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <input
            type="text"
            name="serviceNumber"
            placeholder="Service Number (e.g. 8000)"
            value={serviceNumber}
            onChange={(e) => setServiceNumber(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            name="newPassword"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            required
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#0d6efd] hover:bg-[#0b5ed7] text-white font-semibold text-lg transition"
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
          <Link to="/cadet/login" className="text-blue-600 hover:underline">
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
