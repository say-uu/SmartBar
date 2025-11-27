import React, { useContext, useState } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { AuthContext } from "../../contexts/AuthContext";

export default function ManagerRegister() {
  const [form, setForm] = useState({
    managerId: "",
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const { restoreFromStorage, setUser } = useContext(AuthContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.managerId) {
      setError("Manager ID is required.");
      return;
    }
    if (!form.name) {
      setError("Name is required.");
      return;
    }
    if (!form.email) {
      setError("Email is required.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await axiosClient.post("/api/manager/register", {
        managerId: form.managerId,
        name: form.name,
        email: form.email,
        password: form.password,
      });
      // Auto-login and redirect to dashboard
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", "manager");
      setLoading(false);
      // Sync AuthContext
      restoreFromStorage();
      setUser(res.data.user);
      navigate("/manager/dashboard");
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "Registration failed.");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/bar image.webp')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1d0b05]/95 via-[#2b1209]/95 to-[#0d0402]/95" />
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <h2 className="text-3xl font-bold text-[#a47551] mb-6 text-center">
          Create Manager Account
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
            type="text"
            name="name"
            placeholder="Full Name"
            value={form.name}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00]"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00]"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00] pr-10"
              required
            />
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </span>
          </div>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#b85c00] pr-10"
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
            className="w-full py-3 rounded-lg bg-[#a47551] hover:bg-[#8d6242] text-white font-semibold text-lg transition"
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </form>
        <div className="mt-6 text-center text-gray-500 text-sm">
          Already have an account?{" "}
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
