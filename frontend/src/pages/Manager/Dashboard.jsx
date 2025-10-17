import React, { useEffect, useMemo, useState } from "react";
import { FiMenu } from "react-icons/fi";
import { FiPackage, FiUsers, FiBarChart2 } from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import ManagerSidebar from "../../components/ManagerSidebar";

export default function ManagerDashboard() {
  const [manager, setManager] = useState(null);
  const navigate = useNavigate();
  const [overview, setOverview] = useState({
    revenueToday: 0,
    activeCadets: 0,
    requireRestocking: 0,
    needAttention: 0,
  });
  const [activities, setActivities] = useState([]);
  const [alerts, setAlerts] = useState({
    critical: [],
    lowStock: [],
    notices: [],
    info: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setManager(JSON.parse(stored));
      } catch {}
    }
    (async () => {
      try {
        setError("");
        setLoading(true);
        const [ov, acts, al] = await Promise.all([
          axiosClient.get("/api/manager/dashboard/overview"),
          axiosClient.get("/api/manager/dashboard/activities?limit=5"),
          axiosClient.get("/api/manager/dashboard/alerts"),
        ]);
        setOverview(ov.data || {});
        setActivities(acts.data || []);
        setAlerts(
          al.data || { critical: [], lowStock: [], notices: [], info: [] }
        );
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    // Flash message from login
    if (window.history && window.history.state?.usr?.flash) {
      const f = window.history.state.usr.flash;
      setFlash(f);
      // remove from history
      navigate(window.location.pathname, { replace: true });
      const t = setTimeout(() => setFlash(null), 3000);
      return () => clearTimeout(t);
    }
  }, [navigate]);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(timer);
  }, [flash]);

  const formatRs = (n) =>
    `Rs.${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const formatDelta = (n) => `${n >= 0 ? "+" : "-"}${formatRs(Math.abs(n))}`;
  const timeAgo = (iso) => {
    const d = new Date(iso);
    const secs = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (secs < 60) return `${secs} sec ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-lg text-slate-700">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-rose-50 to-sky-50 py-10 px-5 md:py-14 md:px-10 relative">
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
      <div className="w-full mx-auto flex gap-7">
        <ManagerSidebar open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex-1 flex flex-col min-h-[calc(100vh-5rem)]">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-7 rounded-2xl p-6 md:p-7 shadow-md hover:shadow-lg transition border border-amber-900/40 bg-amber-800 relative">
            <div className="flex items-center gap-3 relative z-10">
              <button
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/15 text-white shadow-sm ring-1 ring-white/20 hover:bg-white/20"
                onClick={() => setNavOpen(true)}
                aria-label="Open navigation"
              >
                <FiMenu className="text-xl" />
              </button>
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl shadow ring-4 ring-amber-500/40">
                {manager?.name ? manager.name[0] : "M"}
              </div>
              <div>
                <div className="font-extrabold text-lg text-white tracking-tight">
                  Smartbar
                </div>
                <div className="text-xs text-amber-200">Manager Console</div>
              </div>
            </div>
            <div className="text-right relative z-10">
              <div className="font-semibold text-white">
                Manager {manager?.name || "-"}
              </div>
              <div className="text-xs text-amber-300">
                {manager?.managerId ? `ID: ${manager.managerId}` : "-"}
              </div>
            </div>
          </div>

          {/* Overview Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8 items-stretch auto-rows-fr">
            {/* Revenue */}
            <div className="relative rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-white border border-emerald-100 border-t-4 border-t-emerald-500 flex flex-col justify-between h-full min-h-[150px]">
              <div className="text-sm font-semibold flex items-center gap-2 text-emerald-700">
                <span>Revenue Today</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              </div>
              <div className="text-3xl font-bold mt-3 text-emerald-700 tracking-tight">
                {formatRs(overview.revenueToday)}
              </div>
              <div className="text-xs mt-2 text-emerald-600 font-medium">
                +12% from yesterday
              </div>
            </div>

            {/* Active Cadets */}
            <div className="relative rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-white border border-sky-100 border-t-4 border-t-sky-500 flex flex-col justify-between h-full min-h-[150px]">
              <div className="text-sm font-semibold flex items-center gap-2 text-sky-700">
                <span>Active Cadets</span>
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              </div>
              <div className="text-3xl font-bold mt-3 text-sky-700 tracking-tight">
                {overview.activeCadets}
              </div>
              <div className="text-xs mt-2 text-sky-600 font-medium">
                +8% from last week
              </div>
            </div>

            {/* Restocking Required */}
            <div className="relative rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-white border border-rose-100 border-t-4 border-t-rose-500 flex flex-col justify-between h-full min-h-[150px]">
              <div className="text-sm font-semibold flex items-center gap-2 text-rose-700">
                <span>Restocking Required</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-3xl font-bold mt-3 text-rose-700 tracking-tight">
                {overview.requireRestocking}
              </div>
            </div>

            {/* Need Attention */}
            <div className="relative rounded-2xl p-5 shadow-sm hover:shadow-md transition bg-white border border-rose-100 border-t-4 border-t-rose-500 flex flex-col justify-between h-full min-h-[150px]">
              <div className="text-sm font-semibold flex items-center gap-2 text-rose-700">
                <span>Need attention</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-3xl font-bold mt-3 text-rose-700 tracking-tight">
                {overview.needAttention}
              </div>
            </div>
          </div>

          {/* Quick actions (moved to middle) */}
          <div className="bg-white/95 rounded-2xl shadow-sm p-4 md:p-5 border border-slate-200/80 backdrop-blur-sm mb-8">
            <div className="font-bold text-slate-900 mb-5 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Quick
              Actions
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch auto-rows-fr">
              <Link
                to="/manager/inventory"
                className="group relative rounded-xl p-4 border border-emerald-200/70 bg-emerald-50/60 hover:bg-emerald-50 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-medium group-hover:scale-105 transition">
                    <FiPackage />
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-800 leading-tight">
                      Manage Inventory
                    </div>
                    <div className="text-[11px] text-emerald-600/80 mt-0.5">
                      Stock & thresholds
                    </div>
                  </div>
                </div>
              </Link>
              <Link
                to="/manager/cadets"
                className="group relative rounded-xl p-4 border border-indigo-200/70 bg-indigo-50/60 hover:bg-indigo-50 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl font-medium group-hover:scale-105 transition">
                    <FiUsers />
                  </div>
                  <div>
                    <div className="font-semibold text-indigo-800 leading-tight">
                      View Cadets
                    </div>
                    <div className="text-[11px] text-indigo-600/80 mt-0.5">
                      Profiles & limits
                    </div>
                  </div>
                </div>
              </Link>
              <Link
                to="/manager/reports"
                className="group relative rounded-xl p-4 border border-amber-200/70 bg-amber-50/60 hover:bg-amber-50 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xl font-medium group-hover:scale-105 transition">
                    <FiBarChart2 />
                  </div>
                  <div>
                    <div className="font-semibold text-amber-800 leading-tight">
                      Generate Reports
                    </div>
                    <div className="text-[11px] text-amber-600/80 mt-0.5">
                      Sales & usage
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Recent Activity + System Alerts (moved to last) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 flex-1 items-stretch auto-rows-fr">
            {/* Recent Activity */}
            <div className="bg-white/95 rounded-2xl shadow-sm p-5 md:p-6 border border-slate-200/80 backdrop-blur-sm flex flex-col h-full">
              <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="tracking-tight">Recent Activity</span>
              </div>
              <div className="divide-y divide-slate-100/80 rounded-xl border border-slate-100 overflow-hidden bg-slate-50/30 flex-1">
                {activities.map((a, idx) => {
                  const colorSet =
                    a.kind === "purchase"
                      ? {
                          dot: "bg-emerald-500",
                          badge: "bg-emerald-100 text-emerald-700",
                          amount:
                            a.amount >= 0
                              ? "text-emerald-600"
                              : "text-emerald-600",
                        }
                      : a.kind === "allowance"
                      ? {
                          dot: "bg-amber-500",
                          badge: "bg-amber-100 text-amber-700",
                          amount: "text-amber-600",
                        }
                      : {
                          dot: "bg-rose-500",
                          badge: "bg-rose-100 text-rose-700",
                          amount: "text-rose-600",
                        };
                  return (
                    <div
                      key={a._id || idx}
                      className="flex items-center justify-between px-4 py-3 bg-white/60 hover:bg-white transition"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shadow ${colorSet.dot}`}
                        />
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-slate-900 text-sm md:text-[15px] font-medium leading-tight">
                              {a.message}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border border-white/40 shadow-sm ${colorSet.badge}`}
                            >
                              {a.kind}
                            </span>
                          </div>
                          <div className="text-[11px] mt-0.5 text-slate-500">
                            {timeAgo(a.createdAt)}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`text-sm font-semibold tabular-nums ${colorSet.amount}`}
                      >
                        {a.unit === "Rs"
                          ? formatDelta(a.amount)
                          : a.unit === "units"
                          ? `${a.amount > 0 ? "+" : ""}${a.amount} units`
                          : null}
                      </div>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    No recent activity
                  </div>
                )}
              </div>
            </div>

            {/* System Alerts */}
            <div className="bg-white/95 rounded-2xl shadow-sm p-5 md:p-6 border border-slate-200/80 backdrop-blur-sm flex flex-col h-full">
              <div className="font-semibold text-slate-900 mb-4 flex items-center gap-2 tracking-tight">
                <span className="inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>System Alerts</span>
              </div>
              <div className="space-y-3 flex-1">
                {/* Critical */}
                {alerts.critical && alerts.critical.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-gradient-to-br from-red-50 via-red-50 to-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-600 font-bold">
                        !
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-red-700 mb-0.5">
                          Critical
                        </div>
                        <div className="text-sm text-red-700 leading-snug">
                          {alerts.critical[0].title}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Low Stock */}
                {alerts.lowStock && alerts.lowStock.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600">
                        ⚠️
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-amber-700 mb-0.5">
                          Low Stock
                        </div>
                        <div className="text-sm text-amber-700 leading-snug">
                          {alerts.lowStock[0].title}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Notice */}
                {alerts.notices && alerts.notices.length > 0 && (
                  <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-amber-50 to-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-600">
                        📣
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-amber-700 mb-0.5">
                          Notice
                        </div>
                        <div className="text-sm text-amber-700 leading-snug">
                          {alerts.notices[0].title}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Info */}
                <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 via-slate-50 to-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-medium">
                      ℹ️
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-700 mb-0.5">
                        Info
                      </div>
                      <div className="text-sm text-slate-600 leading-snug">
                        {alerts.info && alerts.info[0]
                          ? alerts.info[0].title
                          : "System operational"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Keyframes note: @keyframes shrink { from { transform: scaleX(1);} to { transform: scaleX(0);} } .animate-[shrink_2.4s_linear_forwards]{ animation: shrink 2.4s linear forwards; transform-origin:left center;} */
