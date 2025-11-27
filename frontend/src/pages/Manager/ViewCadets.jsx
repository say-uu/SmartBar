import React, { useEffect, useMemo, useState } from "react";
import axiosClient from "../../api/axiosClient";

export default function ViewCadets() {
  const [summary, setSummary] = useState({
    total: 0,
    active: 0,
    exceeded: 0,
    avgSpending: 0,
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(""); // "" | "active" | "exceeded"
  const [intake, setIntake] = useState("All"); // "All" or specific intake string
  // Note: server API doesn't currently expose intake filter param here; we filter client-side.

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [sumRes, listRes] = await Promise.all([
          axiosClient.get("/api/manager/cadets/summary"),
          axiosClient.get(
            `/api/manager/cadets?q=${encodeURIComponent(
              q
            )}&status=${encodeURIComponent(status)}`
          ),
        ]);
        setSummary(
          sumRes.data || { total: 0, active: 0, exceeded: 0, avgSpending: 0 }
        );
        setRows((listRes.data && listRes.data.data) || []);
      } catch (e) {
        setError(e.response?.data?.error || "Failed to load cadets");
      } finally {
        setLoading(false);
      }
    })();
  }, [q, status]);

  // Fixed allowed intake list (only show these options)
  const intakes = useMemo(() => {
    return ["All", "37", "38", "39", "40", "41", "42"];
  }, []);

  const rowsFilteredByIntake = useMemo(() => {
    if (intake === "All") return rows;
    return rows.filter((r) => {
      const v = (r.intake || r.academyYear || "").toString().trim();
      return v === intake;
    });
  }, [rows, intake]);

  const formatRs = (n) =>
    `Rs.${Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const resetFilters = () => {
    setQ("");
    setStatus("");
    setIntake("All");
  };

  const UsageBar = ({ usage = 0, exceeded = false }) => {
    const pct = Math.max(0, Math.min(100, Number(usage || 0)));
    return (
      <div className="mt-2">
        <div className="w-48 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${
              exceeded
                ? "bg-red-500"
                : pct > 80
                ? "bg-amber-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-[10px] mt-1 text-gray-500">{pct}% used</div>
      </div>
    );
  };

  const downloadCsv = () => {
    const headers = [
      "ServiceNumber",
      "Name",
      "Company",
      "Platoon",
      "MonthlyCredit",
      "Spent",
      "Remaining",
      "Usage",
      "Status",
    ];
    const lines = rows.map((r) =>
      [
        r.serviceNumber,
        r.name,
        r.company,
        r.platoon,
        r.monthlyCredit,
        r.spent,
        r.remaining,
        r.usage + "%",
        r.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cadets.csv";
    a.click();
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-sky-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">
              Cadet Management
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Monitor monthly credits, usage, and status at a glance
            </p>
          </div>
          <button
            onClick={downloadCsv}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path d="M12 16l4-5h-3V4h-2v7H8l4 5z" />
              <path d="M20 18H4v2h16v-2z" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
          {/* Tile 1 */}
          <div className="rounded-2xl p-5 bg-sky-100 border border-sky-200 shadow-sm hover:shadow-md transition group">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                  Total Cadets
                </div>
                <div className="text-4xl font-bold mt-1 text-slate-800 tracking-tight flex items-center gap-2">
                  {summary.total}
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-white/70 text-sky-600 border border-sky-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-4 h-4"
                    >
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zM8 11c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V20h14v-3.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V20h6v-3.5c0-2.33-4.67-3.5-7-3.5z" />
                    </svg>
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Registered cadets
                </div>
              </div>
            </div>
          </div>
          {/* Tile 2 */}
          <div className="rounded-2xl p-5 bg-emerald-100 border border-emerald-200 shadow-sm hover:shadow-md transition">
            <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Active Cadets
            </div>
            <div className="text-4xl font-bold mt-1 text-slate-800 tracking-tight">
              {summary.active}
            </div>
            <div className="text-[11px] text-emerald-600 mt-2 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Within credit limits
            </div>
          </div>
          {/* Tile 3 */}
          <div className="rounded-2xl p-5 bg-rose-100 border border-rose-200 shadow-sm hover:shadow-md transition">
            <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Exceeded Limits
            </div>
            <div className="text-4xl font-bold mt-1 text-slate-800 tracking-tight">
              {summary.exceeded}
            </div>
            <div className="text-[11px] text-rose-600 mt-2 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Over monthly allowance
            </div>
          </div>
          {/* Tile 4 */}
          <div className="rounded-2xl p-5 bg-amber-100 border border-amber-200 shadow-sm hover:shadow-md transition">
            <div className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
              Avg. Spending
            </div>
            <div className="text-4xl font-bold mt-1 text-slate-800 tracking-tight">
              {formatRs(summary.avgSpending)}
            </div>
            <div className="text-[11px] text-amber-600 mt-2 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Per cadet this month
            </div>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-4.35-4.35m1.35-4.65a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search cadets by name, ID, or company..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl border border-slate-200 bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="exceeded">Exceeded</option>
          </select>
          <select
            value={intake}
            onChange={(e) => setIntake(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {intakes.map((i) => (
              <option key={i} value={i}>
                {i === "All" ? "All Intakes" : `Intake ${i}`}
              </option>
            ))}
          </select>
          {(q || status) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-sm flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 mt-0.5"
            >
              <path d="M12 2L1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2V9h2v4z" />
            </svg>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-4 animate-pulse"
                >
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="mt-2 h-3 w-24 bg-slate-200 rounded" />
                  <div className="mt-4 grid grid-cols-4 gap-6">
                    {[...Array(4)].map((__, j) => (
                      <div key={j} className="h-6 bg-slate-200 rounded" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : rowsFilteredByIntake.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              <div className="text-3xl">🗂️</div>
              <div className="font-semibold mt-2">No cadets found</div>
              <div className="text-sm mt-1">
                Try adjusting your search or filters.
              </div>
              {(q || status || intake !== "All") && (
                <button
                  onClick={resetFilters}
                  className="mt-4 inline-flex px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            rowsFilteredByIntake.map((r) => (
              <div
                key={r.id || r._id || r.serviceNumber}
                className={`relative rounded-2xl border p-6 bg-white/95 backdrop-blur shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden group ${
                  r.status === "exceeded"
                    ? "border-rose-300"
                    : "border-emerald-200"
                }`}
                style={{
                  borderTopWidth: 8,
                  borderTopColor:
                    r.status === "exceeded"
                      ? "#fb7185" // rose-400
                      : "#34d399", // emerald-400
                }}
              >
                {/* Decorative background gradient */}
                <div className="absolute inset-0 pointer-events-none opacity-5 bg-[radial-gradient(circle_at_30%_20%,#10b981_0,transparent_60%)]" />
                <div className="flex items-start justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-full grid place-items-center text-white text-lg font-bold shadow-sm border-4 border-white ${
                        r.status === "exceeded"
                          ? "bg-rose-500"
                          : "bg-emerald-500"
                      } group-hover:scale-105 transition-transform`}
                    >
                      {(r.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-lg tracking-tight">
                        {r.name}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        CD-{r.serviceNumber} • {r.company} • {r.platoon}
                      </div>
                      <UsageBar
                        usage={r.usage}
                        exceeded={r.status === "exceeded"}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold">
                        Monthly Credit
                      </div>
                      <div className="font-bold text-slate-900">
                        {formatRs(r.monthlyCredit)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold">Spent</div>
                      <div className="font-semibold text-rose-600">
                        {formatRs(r.spent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold">
                        Remaining
                      </div>
                      <div className="font-semibold text-emerald-600">
                        {formatRs(r.remaining)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 font-semibold">Usage</div>
                      <div className="font-semibold text-slate-800">
                        {r.usage}%
                      </div>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full border font-bold inline-flex items-center gap-1 shadow-sm ${
                        r.status === "exceeded"
                          ? "bg-rose-100 text-rose-700 border-rose-300"
                          : "bg-emerald-100 text-emerald-700 border-emerald-300"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          r.status === "exceeded"
                            ? "bg-rose-500"
                            : "bg-emerald-500"
                        }`}
                      />
                      {r.status === "exceeded" ? "Exceeded" : "Active"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
