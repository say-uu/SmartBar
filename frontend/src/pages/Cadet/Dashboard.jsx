import React, { useContext, useEffect, useMemo, useState } from "react";
import { FiMenu } from "react-icons/fi";
import { FiList, FiShoppingCart, FiFileText, FiSettings } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../contexts/AuthContext";
import axiosClient from "../../api/axiosClient";
import CadetSidebar from "../../components/CadetSidebar";

export default function CadetDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, firstLoginFlag, setFirstLoginFlag } =
    useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [monthlyAllowance, setMonthlyAllowance] = useState(
    user?.monthlyAllowance ?? 15000
  );
  const [totalSpent, setTotalSpent] = useState(user?.totalSpent ?? 0);
  const [remainingBalance, setRemainingBalance] = useState(
    user?.monthlyAllowance ?? 15000
  );
  const [showAllowanceWarning, setShowAllowanceWarning] = useState(false);
  const [flash, setFlash] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  // Always fetch latest profile from backend every time dashboard is visited
  useEffect(() => {
    let ignore = false;
    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await axiosClient.get("/api/auth/profile");
        if (!ignore && res.data) {
          setUser(res.data);
          setMonthlyAllowance(res.data.monthlyAllowance);
          setTotalSpent(res.data.totalSpent);
          setRemainingBalance(res.data.monthlyAllowance);
          // Clear one-time flag after first render on dashboard
          if (localStorage.getItem("firstLoginFlag") === "true") {
            setFirstLoginFlag(false);
            localStorage.removeItem("firstLoginFlag");
          }
        }
      } catch (err) {
        if (!ignore) {
          setMonthlyAllowance(user?.monthlyAllowance ?? 15000);
          setTotalSpent(user?.totalSpent ?? 0);
          setRemainingBalance(user?.monthlyAllowance ?? 15000);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchProfile();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line
  }, [location.pathname]);

  // Sync local state with AuthContext user changes
  useEffect(() => {
    setMonthlyAllowance(user?.monthlyAllowance ?? 15000);
    setTotalSpent(user?.totalSpent ?? 0);
    setRemainingBalance(user?.monthlyAllowance ?? 15000);
  }, [user]);

  // Handle flash message passed via navigate state
  useEffect(() => {
    if (location.state && location.state.flash) {
      setFlash(location.state.flash);
      // Clean up history state so refresh doesn't re-show
      navigate(location.pathname, { replace: true });
      // Auto dismiss after 3 seconds
      const t = setTimeout(() => setFlash(null), 3000);
      return () => clearTimeout(t);
    }
  }, [location.state, location.pathname, navigate]);

  // Secondary auto-dismiss safeguard: whenever flash changes, hide after 2500ms
  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(timer);
  }, [flash]);

  // Helper for rupees formatting
  const formatRs = (amount) => `Rs.${Number(amount || 0).toLocaleString()}`;
  // Base monthly limit inferred from remaining + spent
  const baseLimit = useMemo(() => {
    const remaining = Number(remainingBalance || 0);
    const spent = Number(totalSpent || 0);
    const sum = remaining + spent;
    return sum > 0 ? sum : 15000; // fallback to design default
  }, [remainingBalance, totalSpent]);
  // Calculate percentage of allowance used (cap at 100%) using baseLimit
  const allowanceUsedPercent = useMemo(() => {
    const pct =
      baseLimit > 0
        ? Math.round((Number(totalSpent || 0) / baseLimit) * 100)
        : 0;
    return Math.min(100, Math.max(0, pct));
  }, [totalSpent, baseLimit]);

  // Determine if 50% usage warning should show (dismissible per month & cadet)
  useEffect(() => {
    const svc = user?.serviceNumber || "anon";
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const dismissKey = `allowanceWarnDismissed:${svc}:${monthKey}`;
    const dismissed = localStorage.getItem(dismissKey) === "true";
    if (!dismissed && allowanceUsedPercent >= 50) {
      setShowAllowanceWarning(true);
    } else {
      setShowAllowanceWarning(false);
    }
  }, [user?.serviceNumber, allowanceUsedPercent]);

  const dismissAllowanceWarning = () => {
    const svc = user?.serviceNumber || "anon";
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(
      now.getMonth() + 1
    ).padStart(2, "0")}`;
    const dismissKey = `allowanceWarnDismissed:${svc}:${monthKey}`;
    localStorage.setItem(dismissKey, "true");
    setShowAllowanceWarning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
        <div className="text-lg text-blue-900">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-10 px-5 md:py-14 md:px-10 relative">
      {/* Global Flash (fixed top) */}
      {flash && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-lg px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-3 border backdrop-blur bg-gradient-to-r from-white/95 to-white/80 ${
            flash.type === "success"
              ? "border-green-300 text-green-700"
              : flash.type === "error"
              ? "border-red-300 text-red-700"
              : "border-blue-300 text-blue-700"
          }`}
          role="status"
          aria-live="polite"
        >
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold shadow ${
              flash.type === "success"
                ? "bg-green-100 text-green-700"
                : flash.type === "error"
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {flash.type === "success"
              ? "✓"
              : flash.type === "error"
              ? "!"
              : "ℹ"}
          </span>
          <span className="truncate flex-1 tracking-wide">{flash.message}</span>
          <span className="relative inline-block w-16 h-1 rounded bg-gray-200 overflow-hidden">
            <span className="absolute inset-0 bg-current animate-[shrink_2.4s_linear_forwards]"></span>
          </span>
        </div>
      )}
      <div className="w-full mx-auto px-1 md:px-2">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/70 text-blue-800 shadow-sm border border-blue-100 hover:bg-white"
              onClick={() => setNavOpen(true)}
              aria-label="Open navigation"
            >
              <FiMenu className="text-xl" />
            </button>
            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-900 font-bold text-xl">
              {user?.name ? user.name[0] : "C"}
            </div>
            <div>
              <div className="font-bold text-lg text-blue-900">Smartbar</div>
              <div className="text-xs text-blue-600">
                Cadet Management System
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="font-semibold text-blue-900">
                Cadet {user?.name || "-"}
              </div>
              <div className="text-xs text-gray-500">
                {user?.serviceNumber
                  ? `Service No: ${user.serviceNumber}`
                  : "-"}
              </div>
            </div>
            <button
              className="text-blue-600 hover:underline font-medium"
              onClick={() => navigate("/")}
            >
              Exit
            </button>
          </div>
        </div>
        <div className="flex gap-7">
          <CadetSidebar open={navOpen} onClose={() => setNavOpen(false)} />
          <div className="flex-1">
            {/* Nav Tabs removed per request */}
            {/* Welcome Banner with Cadet Name and ID */}
            <div className="bg-gradient-to-r from-blue-700 to-blue-500 rounded-xl p-7 md:p-9 flex flex-col md:flex-row items-start md:items-center justify-between mb-9 shadow-lg">
              <div>
                <div className="text-white text-2xl font-bold mb-1">
                  {localStorage.getItem("firstLoginFlag") === "true" ||
                  firstLoginFlag ? (
                    <>Welcome, {user?.name ? user.name : "Cadet"}</>
                  ) : (
                    <>Welcome back, {user?.name ? user.name : "Cadet"}</>
                  )}
                </div>
                <div className="text-blue-100 text-base font-medium">
                  Service No: {user?.serviceNumber || "-"}
                </div>
              </div>
            </div>
            {/* Quick Actions - fill width responsively */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-12 items-stretch auto-rows-fr">
              <button
                className="group bg-white rounded-xl shadow p-6 border-t-4 border-blue-400 hover:shadow-md focus:ring-2 focus:ring-blue-300 outline-none transition flex flex-col items-start h-full min-h-[140px] sm:min-h-[160px]"
                onClick={() => navigate("/cadet/menu")}
              >
                <FiList className="text-3xl mb-4 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-blue-700 text-left">
                  Browse Menu
                </span>
              </button>
              <button
                className="group bg-white rounded-xl shadow p-6 border-t-4 border-green-400 hover:shadow-md focus:ring-2 focus:ring-green-300 outline-none transition flex flex-col items-start h-full min-h-[140px] sm:min-h-[160px]"
                onClick={() => navigate("/cadet/cart")}
              >
                <FiShoppingCart className="text-3xl mb-4 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-green-700 text-left">
                  View Cart
                </span>
              </button>
              <button
                className="group bg-white rounded-xl shadow p-6 border-t-4 border-orange-400 hover:shadow-md focus:ring-2 focus:ring-orange-300 outline-none transition flex flex-col items-start h-full min-h-[140px] sm:min-h-[160px]"
                onClick={() => navigate("/cadet/history")}
              >
                <FiFileText className="text-3xl mb-4 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-orange-700 text-left">
                  Purchase History
                </span>
              </button>
              <button
                className="group bg-white rounded-xl shadow p-6 border-t-4 border-yellow-400 hover:shadow-md focus:ring-2 focus:ring-yellow-300 outline-none transition flex flex-col items-start h-full min-h-[140px] sm:min-h-[160px]"
                onClick={() => navigate("/cadet/profile")}
              >
                <FiSettings className="text-3xl mb-4 text-yellow-500 group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-yellow-700 text-left">
                  Profile Settings
                </span>
              </button>
            </div>

            {/* Allowance Warning (>= 50% used) */}
            {showAllowanceWarning && (
              <div className="mb-6 p-4 rounded-xl border border-yellow-300 bg-yellow-50 text-yellow-900 flex items-start justify-between gap-4 shadow-sm">
                <div>
                  <div className="font-semibold flex items-center gap-2 mb-1">
                    <span>⚠️</span>
                    <span>Allowance usage alert</span>
                  </div>
                  <div className="text-sm">
                    You have used {allowanceUsedPercent}% of your monthly
                    allowance. Please monitor your spending.
                  </div>
                </div>
                <button
                  onClick={dismissAllowanceWarning}
                  className="text-yellow-900/70 hover:text-yellow-900 text-sm font-medium"
                  aria-label="Dismiss allowance warning"
                >
                  Dismiss
                </button>
              </div>
            )}
            {/* Allowance Cards - fill width responsively */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14 items-stretch auto-rows-fr">
              {/* Monthly Allowance */}
              <div className="bg-white rounded-xl shadow p-6 border-t-4 border-green-400 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[160px]">
                <div className="text-green-600 font-semibold mb-2">
                  Monthly Allowance
                </div>
                <div className="text-2xl font-bold text-green-700">
                  {formatRs(monthlyAllowance)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Current allocation
                </div>
              </div>
              {/* Total Spent */}
              <div className="bg-white rounded-xl shadow p-6 border-t-4 border-orange-400 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[160px]">
                <div className="text-orange-600 font-semibold mb-2">
                  Total Spent
                </div>
                <div className="text-2xl font-bold text-orange-700">
                  {formatRs(totalSpent)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {allowanceUsedPercent}% of allowance used
                </div>
              </div>
              {/* Remaining Balance */}
              <div className="bg-white rounded-xl shadow p-6 border-t-4 border-blue-400 flex flex-col justify-between h-full min-h-[140px] sm:min-h-[160px]">
                <div className="text-blue-600 font-semibold mb-2">
                  Remaining Balance
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatRs(remainingBalance)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Available for purchases
                </div>
              </div>
            </div>
            {/* Quick Actions relocated above; section removed here */}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Tailwind keyframes (if using arbitrary values requires safelist or add to global CSS). If not present, suggest adding to a CSS file: @keyframes shrink { from { transform: scaleX(1);} to { transform: scaleX(0);} } .animate-[shrink_2.4s_linear_forwards]{ animation: shrink 2.4s linear forwards; transform-origin:left center;} */
