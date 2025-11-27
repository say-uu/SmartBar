import React, { useContext, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import axiosClient from "../../api/axiosClient";
import { AuthContext } from "../../contexts/AuthContext";
import AuthLinks from "../../components/AuthLinks";

export default function ManagerLogin() {
  const [form, setForm] = useState({ managerId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { restoreFromStorage, setUser } = useContext(AuthContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axiosClient.post("/api/manager/login", {
        id: form.managerId,
        password: form.password,
      });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      localStorage.setItem("role", "manager");
      // Sync AuthContext
      restoreFromStorage();
      setUser(res.data.user);
      setLoading(false);
      navigate("/manager/dashboard", {
        state: {
          flash: { type: "success", message: "Logged in successfully" },
        },
        replace: true,
      });
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.error || "Login failed.");
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
        <h1 className="text-3xl font-bold text-[#a47551] mb-6 text-center">
          Login
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager ID
            </label>
            <input
              name="managerId"
              value={form.managerId}
              onChange={handleChange}
              className="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-[#b85c00] focus:outline-none"
              placeholder="Enter Manager ID"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-[#b85c00] focus:outline-none pr-10"
                placeholder="Enter Password"
                required
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-400"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
            <span className="text-xs text-gray-500 block mt-1">
              Password must be at least 8 characters, include letters and
              numbers.
            </span>
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold bg-[#a47551] hover:bg-[#8d6242] text-white text-lg transition-colors"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </form>
        <AuthLinks variant="manager" />
      </div>
    </div>
  );
}
