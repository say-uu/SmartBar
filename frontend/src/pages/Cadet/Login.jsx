import React, { useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import {
  sendWelcomeEmail,
  isWelcomeEmailEnabled,
} from "../../utils/emailjsClient";
import { Link, useNavigate } from "react-router-dom";
import AuthLinks from "../../components/AuthLinks";
import { FaEye, FaEyeSlash } from "react-icons/fa";

export default function CadetLogin() {
  const [form, setForm] = useState({ serviceNumber: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, firstLoginFlag, user } = useContext(AuthContext);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ id: form.serviceNumber, password: form.password }, "cadet");
      // Send welcome email on first login if enabled (await but don't block UX on failure)
      try {
        const lsFirst = localStorage.getItem("firstLoginFlag") === "true";
        const shouldWelcome = firstLoginFlag || lsFirst;
        if (isWelcomeEmailEnabled() && shouldWelcome) {
          const storedUser = localStorage.getItem("user");
          const userObj = storedUser ? JSON.parse(storedUser) : null;
          const toEmail = userObj?.email || user?.email || "";
          const toName = userObj?.name || user?.name || "Cadet";
          if (toEmail && toEmail.includes("@")) {
            await sendWelcomeEmail({ toEmail, toName });
            // Optional: we could clear the localStorage flag here, but dashboard already clears it
          } else {
            console.warn(
              "[WelcomeEmail] Missing or invalid email for welcome message",
              { toEmail }
            );
          }
        }
      } catch (e) {
        console.warn("[WelcomeEmail] send failed (non-blocking)", e);
      }
      setLoading(false);
      navigate("/cadet/dashboard", {
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
      <div className="absolute inset-0 bg-gradient-to-br from-[#1b2444]/90 via-[#1f2d5f]/90 to-[#0f1f49]/90" />
      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl p-8 backdrop-blur-sm">
        <h1 className="text-3xl font-bold text-blue-700 mb-6 text-center">
          Login
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service Number
            </label>
            <input
              name="serviceNumber"
              value={form.serviceNumber}
              onChange={handleChange}
              className="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="Enter Service Number"
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
                className="w-full rounded-xl border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none pr-10"
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
            className="w-full inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold bg-[#0d6efd] hover:bg-[#0b5ed7] text-white text-lg"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
        </form>
        <AuthLinks variant="cadet" />
      </div>
    </div>
  );
}
