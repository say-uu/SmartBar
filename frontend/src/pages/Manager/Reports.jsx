import React, { useState, useEffect, useCallback } from "react";
import {
  FiTrendingUp,
  FiBox,
  FiUser,
  FiDollarSign,
  FiActivity,
  FiBarChart2,
  FiX,
} from "react-icons/fi";
import axiosClient from "../../api/axiosClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const COLOR_VARIANTS = {
  sales: {
    base: "bg-indigo-100 border-indigo-200",
    hover: "hover:border-indigo-300",
    badge: "bg-indigo-700",
    selectedBg: "bg-indigo-50",
    selectedText: "text-indigo-700",
    ring: "focus:ring-indigo-600",
  },
  inventory: {
    base: "bg-amber-100 border-amber-200",
    hover: "hover:border-amber-300",
    badge: "bg-amber-600",
    selectedBg: "bg-amber-50",
    selectedText: "text-amber-700",
    ring: "focus:ring-amber-500",
  },
  "cadet-spending": {
    base: "bg-sky-100 border-sky-200",
    hover: "hover:border-sky-300",
    badge: "bg-sky-600",
    selectedBg: "bg-sky-50",
    selectedText: "text-sky-700",
    ring: "focus:ring-sky-500",
  },
  financial: {
    base: "bg-emerald-100 border-emerald-200",
    hover: "hover:border-emerald-300",
    badge: "bg-emerald-600",
    selectedBg: "bg-emerald-50",
    selectedText: "text-emerald-700",
    ring: "focus:ring-emerald-500",
  },
  operational: {
    base: "bg-violet-100 border-violet-200",
    hover: "hover:border-violet-300",
    badge: "bg-violet-600",
    selectedBg: "bg-violet-50",
    selectedText: "text-violet-700",
    ring: "focus:ring-violet-500",
  },
  comparative: {
    base: "bg-rose-100 border-rose-200",
    hover: "hover:border-rose-300",
    badge: "bg-rose-600",
    selectedBg: "bg-rose-50",
    selectedText: "text-rose-700",
    ring: "focus:ring-rose-500",
  },
};

const REPORT_TYPES = [
  {
    key: "sales",
    label: "Sales Report",
    desc: "Comprehensive sales and revenue analytics for the selected period",
    eta: "2-3 minutes",
    icon: <FiTrendingUp className="w-5 h-5" />,
  },
  {
    key: "inventory",
    label: "Inventory Report",
    desc: "Stock levels, movement, and reorder suggestions",
    eta: "1-2 minutes",
    icon: <FiBox className="w-5 h-5" />,
  },
  {
    key: "cadet-spending",
    label: "Cadet Spending Report",
    desc: "Individual and company-wide spending patterns and analysis",
    eta: "3-4 minutes",
    icon: <FiUser className="w-5 h-5" />,
  },
  {
    key: "financial",
    label: "Financial Summary",
    desc: "Revenue, costs, profit margins, and financial performance",
    eta: "2-3 minutes",
    icon: <FiDollarSign className="w-5 h-5" />,
  },
  {
    key: "operational",
    label: "Operational Report",
    desc: "System usage, peak hours, and operational efficiency metrics",
    eta: "1-2 minutes",
    icon: <FiActivity className="w-5 h-5" />,
  },
  {
    key: "comparative",
    label: "Comparative Analysis",
    desc: "Period-over-period comparison and trend analysis",
    eta: "3-5 minutes",
    icon: <FiBarChart2 className="w-5 h-5" />,
  },
];

function formatNumber(n) {
  if (n === null || n === undefined) return "-";
  return Number(n).toLocaleString();
}

export default function Reports() {
  const todayStr = new Date().toISOString().substring(0, 10);
  const sevenDaysAgoStr = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
    .toISOString()
    .substring(0, 10);
  const [type, setType] = useState(null); // no selection initially
  const [from, setFrom] = useState(sevenDaysAgoStr);
  const [to, setTo] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axiosClient.get(`/api/reports/${type}`, {
        params: { from, to },
      });
      setData(resp.data);
    } catch (e) {
      if (e?.response) {
        if (e.response.status === 401) {
          setError("Unauthorized – please log in again.");
        } else if (e.response.status === 404) {
          setError(
            "Endpoint not found (404). Ensure backend with /api/reports is running."
          );
        } else {
          setError(e.response.data?.error || `Error ${e.response.status}`);
        }
      } else {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [type, from, to]);

  useEffect(() => {
    if (type) fetchReport();
  }, [fetchReport, type]);

  const handleCSV = () => {
    if (!data) return;
    let rows = [];
    if (data.type === "sales") {
      rows.push(["Date", "Orders", "Revenue", "Items Sold"]);
      (data.daily || []).forEach((d) => {
        rows.push([d.date, d.orders, d.revenue, d.itemsSold]);
      });
    } else if (data.type === "inventory") {
      rows.push(["Name", "Category", "Stock", "Unit Size"]);
      (data.lowStock || []).forEach((i) => {
        rows.push([i.name, i.category, i.stock, i.unitSize || ""]);
      });
    } else if (data.type === "cadet-spending") {
      rows.push([
        "Service #",
        "Name",
        "Orders",
        "Spent",
        "Allowance Used",
        "Cash/Card",
        "Avg Order",
        "Remaining Allowance",
      ]);
      (data.cadets || []).forEach((c) => {
        rows.push([
          c.serviceNumber,
          c.name,
          c.orders,
          c.totalSpent,
          c.allowanceUsed,
          c.cashOrCard,
          c.avgOrderValue,
          c.allowanceRemaining,
        ]);
      });
    } else if (data.type === "financial") {
      rows.push(["Date", "Revenue", "Orders"]);
      (data.daily || []).forEach((d) =>
        rows.push([d.date, d.revenue, d.orders])
      );
    } else if (data.type === "operational") {
      rows.push(["Category", "Items Sold"]);
      (data.categories || []).forEach((c) =>
        rows.push([c.category, c.itemsSold])
      );
    } else if (data.type === "comparative") {
      rows.push(["Metric", "Current", "Previous", "% Change"]);
      Object.entries(data.metrics || {}).forEach(([k, v]) =>
        rows.push([k, v.current, v.previous, v.changePct ?? "-"])
      );
    }
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.type}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePDF = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${data.type.toUpperCase()} REPORT`, 14, 14);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
    if (data.range)
      doc.text(
        `Range: ${data.range.from?.substring(
          0,
          10
        )} to ${data.range.to?.substring(0, 10)}`,
        14,
        26
      );

    const addTable = (title, head, body) => {
      doc.addPage();
      doc.setFontSize(12);
      doc.text(title, 14, 16);
      autoTable(doc, { startY: 20, head: [head], body });
    };

    if (data.type === "sales") {
      autoTable(doc, {
        startY: 32,
        head: [["Date", "Orders", "Revenue", "Items Sold"]],
        body: (data.daily || []).map((d) => [
          d.date,
          d.orders,
          d.revenue,
          d.itemsSold,
        ]),
      });
    } else if (data.type === "inventory") {
      autoTable(doc, {
        startY: 32,
        head: [["Name", "Category", "Stock", "Unit Size"]],
        body: (data.lowStock || []).map((i) => [
          i.name,
          i.category,
          i.stock,
          i.unitSize || "",
        ]),
      });
    } else if (data.type === "cadet-spending") {
      autoTable(doc, {
        startY: 32,
        head: [
          [
            "Service #",
            "Name",
            "Orders",
            "Spent",
            "Allowance Used",
            "Cash/Card",
            "Avg Order",
            "Remaining",
          ],
        ],
        body: (data.topCadets || []).map((c) => [
          c.serviceNumber,
          c.name,
          c.orders,
          c.totalSpent,
          c.allowanceUsed,
          c.cashOrCard,
          c.avgOrderValue,
          c.allowanceRemaining,
        ]),
      });
    } else if (data.type === "financial") {
      autoTable(doc, {
        startY: 32,
        head: [["Date", "Revenue", "Orders"]],
        body: (data.daily || []).map((d) => [d.date, d.revenue, d.orders]),
      });
    } else if (data.type === "operational") {
      autoTable(doc, {
        startY: 32,
        head: [["Category", "Items Sold"]],
        body: (data.categories || []).map((c) => [c.category, c.itemsSold]),
      });
    } else if (data.type === "comparative") {
      autoTable(doc, {
        startY: 32,
        head: [["Metric", "Current", "Previous", "% Change"]],
        body: Object.entries(data.metrics || {}).map(([k, v]) => [
          k,
          v.current,
          v.previous,
          v.changePct ?? "-",
        ]),
      });
    }

    doc.save(`${data.type}-report.pdf`);
  };

  const summaryBlock = () => {
    if (!data) return null;
    if (data.type === "sales") {
      const s = data.summary || {};
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPI label="Revenue" value={`Rs ${formatNumber(s.totalRevenue)}`} />
          <KPI label="Orders" value={formatNumber(s.totalOrders)} />
          <KPI label="Items Sold" value={formatNumber(s.totalItemsSold)} />
          <KPI
            label="Avg Order"
            value={`Rs ${formatNumber(s.avgOrderValue)}`}
          />
          <KPI
            label="Allowance Used"
            value={`Rs ${formatNumber(s.totalAllowanceUsed)}`}
          />
          <KPI
            label="Cash/Card"
            value={`Rs ${formatNumber(s.totalCashOrCard)}`}
          />
        </div>
      );
    }
    if (data.type === "inventory") {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <KPI label="Total Items" value={formatNumber(data.totalItems)} />
          <KPI
            label="Total Stock Units"
            value={formatNumber(data.totalStockUnits)}
          />
          <KPI
            label="Low Stock Count"
            value={formatNumber((data.lowStock || []).length)}
          />
          <KPI
            label="Categories"
            value={formatNumber((data.categories || []).length)}
          />
          <KPI label="Low Threshold" value={data.lowStockThreshold} />
        </div>
      );
    }
    if (data.type === "cadet-spending") {
      const s = data.summary || {};
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPI label="Unique Cadets" value={formatNumber(s.uniqueCadets)} />
          <KPI label="Total Spent" value={`Rs ${formatNumber(s.totalSpent)}`} />
          <KPI
            label="Allowance Used"
            value={`Rs ${formatNumber(s.totalAllowanceUsed)}`}
          />
          <KPI
            label="Cash/Card"
            value={`Rs ${formatNumber(s.totalCashCard)}`}
          />
          <KPI
            label="Avg / Cadet"
            value={`Rs ${formatNumber(s.avgPerCadet)}`}
          />
        </div>
      );
    }
    if (data.type === "financial") {
      const s = data.summary || {};
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPI label="Revenue" value={`Rs ${formatNumber(s.totalRevenue)}`} />
          <KPI label="Orders" value={formatNumber(s.totalOrders)} />
          <KPI
            label="Allowance"
            value={`Rs ${formatNumber(s.totalAllowanceUsed)}`}
          />
          <KPI
            label="Cash/Card"
            value={`Rs ${formatNumber(s.totalCashCard)}`}
          />
          <KPI
            label="Avg Daily"
            value={`Rs ${formatNumber(s.avgDailyRevenue)}`}
          />
          <KPI
            label="Avg Order"
            value={`Rs ${formatNumber(s.avgOrderValue)}`}
          />
        </div>
      );
    }
    if (data.type === "operational") {
      const s = data.summary || {};
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <KPI label="Orders" value={formatNumber(s.totalOrders)} />
          <KPI
            label="Avg Items/Order"
            value={formatNumber(s.avgItemsPerOrder)}
          />
          <KPI
            label="Median Items"
            value={formatNumber(s.medianItemsPerOrder)}
          />
          <KPI label="Busiest Hour" value={s.busiestHour?.hour ?? "-"} />
          <KPI label="Busiest Day" value={s.busiestDay?.day ?? "-"} />
          <KPI
            label="Low Stock"
            value={formatNumber((data.lowStock || []).length)}
          />
        </div>
      );
    }
    if (data.type === "comparative") {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Object.entries(data.metrics || {})
            .slice(0, 6)
            .map(([k, v]) => (
              <KPI
                key={k}
                label={k}
                value={formatNumber(v.current)}
                sub={
                  v.changePct === null
                    ? "∞"
                    : v.changePct > 0
                    ? `+${v.changePct}%`
                    : `${v.changePct}%`
                }
              />
            ))}
        </div>
      );
    }
    return null;
  };

  const renderMainTable = () => {
    if (!data) return null;
    if (data.type === "sales") {
      return (
        <SimpleTable
          headers={["Date", "Orders", "Revenue", "Items"]}
          rows={(data.daily || []).map((d) => [
            d.date,
            d.orders,
            `Rs ${formatNumber(d.revenue)}`,
            d.itemsSold,
          ])}
        />
      );
    }
    if (data.type === "inventory") {
      return (
        <SimpleTable
          headers={["Name", "Category", "Stock", "Unit Size"]}
          rows={(data.lowStock || []).map((i) => [
            i.name,
            i.category,
            i.stock,
            i.unitSize || "-",
          ])}
        />
      );
    }
    if (data.type === "cadet-spending") {
      return (
        <SimpleTable
          headers={[
            "Service #",
            "Name",
            "Orders",
            "Spent",
            "Allowance",
            "Cash/Card",
            "Avg",
            "Remaining",
          ]}
          rows={(data.topCadets || []).map((c) => [
            c.serviceNumber,
            c.name,
            c.orders,
            `Rs ${formatNumber(c.totalSpent)}`,
            `Rs ${formatNumber(c.allowanceUsed)}`,
            `Rs ${formatNumber(c.cashOrCard)}`,
            `Rs ${formatNumber(c.avgOrderValue)}`,
            `Rs ${formatNumber(c.allowanceRemaining)}`,
          ])}
        />
      );
    }
    if (data.type === "financial") {
      return (
        <SimpleTable
          headers={["Date", "Revenue", "Orders"]}
          rows={(data.daily || []).map((d) => [
            d.date,
            `Rs ${formatNumber(d.revenue)}`,
            d.orders,
          ])}
        />
      );
    }
    if (data.type === "operational") {
      return (
        <SimpleTable
          headers={["Category", "Items Sold"]}
          rows={(data.categories || []).map((c) => [c.category, c.itemsSold])}
        />
      );
    }
    if (data.type === "comparative") {
      return (
        <SimpleTable
          headers={["Metric", "Current", "Previous", "% Change"]}
          rows={Object.entries(data.metrics || {}).map(([k, v]) => [
            k,
            v.current,
            v.previous,
            v.changePct ?? "-",
          ])}
        />
      );
    }
    return null;
  };

  return (
    <div className="relative max-w-7xl mx-auto p-8 bg-white">
      <div className="relative">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-800">
            Reports & Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate comprehensive reports and view analytics
          </p>
        </header>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Selection */}
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
              <h2 className="text-sm font-medium text-gray-600 mb-4 uppercase tracking-wide">
                Select Report Type
              </h2>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {REPORT_TYPES.map((r) => {
                  const active = type === r.key;
                  const variant = COLOR_VARIANTS[r.key];
                  return (
                    <button
                      key={r.key}
                      onClick={() => {
                        setType(r.key);
                        setData(null);
                        setError(null);
                      }}
                      className={`group text-left rounded-lg border relative overflow-hidden transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        variant.ring
                      } ${
                        active
                          ? `${variant.selectedBg} border-current shadow-sm`
                          : `${variant.base} ${variant.hover}`
                      }`}
                    >
                      <div className="p-4 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-3">
                          <span
                            className={`inline-flex items-center justify-center w-9 h-9 rounded-md bg-white/70 shadow-sm ring-1 ring-inset ${
                              active ? "ring-white/60" : "ring-white/40"
                            } backdrop-blur-sm text-gray-700`}
                          >
                            {r.icon}
                          </span>
                          <span
                            className={`text-[10px] ${variant.badge} text-white px-2 py-0.5 rounded-full font-medium opacity-90 group-hover:opacity-100 transition`}
                          >
                            {r.eta}
                          </span>
                        </div>
                        <div className="font-medium text-gray-800 text-sm leading-tight mb-1 line-clamp-2">
                          {r.label}
                        </div>
                        <p className="text-xs text-gray-600 flex-1 leading-relaxed line-clamp-3">
                          {r.desc}
                        </p>
                        <div
                          className={`mt-3 text-xs font-medium ${
                            active
                              ? variant.selectedText
                              : "text-gray-600 group-hover:text-gray-800"
                          }`}
                        >
                          {active ? "Selected" : "Select"}
                        </div>
                        <span className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-white/40 pointer-events-none" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
            {type && (
              <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-end gap-4 mb-5">
                  <div className="flex gap-4 w-full md:w-auto">
                    <DateField label="From" value={from} onChange={setFrom} />
                    <DateField label="To" value={to} onChange={setTo} />
                  </div>
                  <div className="flex gap-2 -mb-1 flex-wrap">
                    <Shortcut
                      onClick={() => {
                        setFrom(sevenDaysAgoStr);
                        setTo(todayStr);
                      }}
                      label="Last 7 days"
                    />
                    <Shortcut
                      onClick={() => {
                        const d = new Date();
                        const from30 = new Date(
                          Date.now() - 29 * 24 * 60 * 60 * 1000
                        )
                          .toISOString()
                          .substring(0, 10);
                        setFrom(from30);
                        setTo(d.toISOString().substring(0, 10));
                      }}
                      label="Last 30 days"
                    />
                    <Shortcut
                      onClick={() => {
                        const d = new Date();
                        const first = new Date(d.getFullYear(), d.getMonth(), 1)
                          .toISOString()
                          .substring(0, 10);
                        setFrom(first);
                        setTo(todayStr);
                      }}
                      label="This Month"
                    />
                  </div>
                  <div className="flex gap-2 md:ml-auto">
                    <button
                      onClick={fetchReport}
                      disabled={loading || !type}
                      className="h-10 px-5 rounded-lg bg-blue-600 text-white text-sm font-medium shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-500 transition"
                    >
                      {loading ? "Generating…" : "Generate"}
                    </button>
                    <button
                      onClick={handleCSV}
                      disabled={!data}
                      className="h-10 px-4 rounded-lg bg-white border text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                    >
                      CSV
                    </button>
                    <button
                      onClick={handlePDF}
                      disabled={!data}
                      className="h-10 px-4 rounded-lg bg-white border text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
                    >
                      PDF
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start gap-2 relative animate-fade-in">
                    <span className="mt-0.5">{error}</span>
                    <button
                      onClick={() => setError(null)}
                      className="ml-auto text-red-500 hover:text-red-700 transition"
                      aria-label="Dismiss error"
                    >
                      <FiX />
                    </button>
                  </div>
                )}
                {!error && loading && (
                  <div className="text-sm text-blue-700 flex items-center gap-2 animate-pulse">
                    Generating report…{" "}
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
                  </div>
                )}
                {!error && data && (
                  <div className="animate-fade-in">
                    {summaryBlock()}
                    <div className="bg-white border rounded-lg shadow-sm overflow-auto">
                      {renderMainTable()}
                    </div>
                  </div>
                )}
                {!error && !loading && !data && (
                  <div className="text-sm text-gray-500">
                    Select a range and generate to view data.
                  </div>
                )}
              </section>
            )}
          </div>
          {/* Right Column: Placeholder / contextual panel */}
          <aside className="lg:col-span-1">
            {!type && (
              <div className="h-full rounded-xl border border-dashed border-gray-300 bg-white/60 backdrop-blur flex flex-col items-center justify-center p-8 text-center text-gray-500">
                <div className="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center ring-1 ring-gray-200 mb-4">
                  <FiBarChart2 className="w-7 h-7 text-gray-500" />
                </div>
                <h3 className="font-semibold text-gray-700 mb-1">
                  Select a Report Type
                </h3>
                <p className="text-xs leading-relaxed max-w-[220px]">
                  Choose a report type from the options on the left to get
                  started.
                </p>
              </div>
            )}
            {type && (
              <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-6 space-y-4">
                {(() => {
                  const meta = REPORT_TYPES.find((r) => r.key === type);
                  return (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-10 h-10 inline-flex items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-gray-200 text-gray-700">
                          {meta?.icon}
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-800 text-sm">
                            {meta?.label}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5 leading-snug max-w-[220px]">
                            {meta?.desc}
                          </p>
                        </div>
                      </div>
                      <div className="text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-700 text-white font-medium shadow-sm">
                        <span>⏱</span> {meta?.eta}
                      </div>
                      <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                        <li>Adjust the date range</li>
                        <li>Use shortcuts for quick periods</li>
                        <li>Export as CSV or PDF</li>
                      </ul>
                      {data && (
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-500">
                            Last generated{" "}
                            <span className="font-medium text-gray-700">
                              {new Date().toLocaleTimeString()}
                            </span>
                          </p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }) {
  return (
    <div className="relative group p-4 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent_60%)]" />
      <div className="relative">
        <div className="text-[10px] font-semibold tracking-wide text-gray-500 mb-1 uppercase">
          {label}
        </div>
        <div className="text-lg font-semibold text-gray-800">{value}</div>
        {sub !== undefined && (
          <div
            className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
              sub?.startsWith("+")
                ? "bg-green-100 text-green-700"
                : sub?.startsWith("-")
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}

function SimpleTable({ headers, rows }) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-gray-50 text-gray-600">
          {headers.map((h) => (
            <th key={h} className="text-left px-3 py-2 font-medium border-b">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={headers.length}
              className="px-3 py-4 text-center text-gray-500"
            >
              No data
            </td>
          </tr>
        )}
        {rows.map((r, i) => (
          <tr key={i} className="even:bg-gray-50/50">
            {r.map((c, j) => (
              <td key={j} className="px-3 py-2 border-b whitespace-nowrap">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Reusable small components
function DateField({ label, value, onChange }) {
  return (
    <label className="flex flex-col text-xs font-medium text-gray-600">
      {label}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-normal text-gray-700 shadow-sm focus:border-blue-500 focus:ring-blue-500"
      />
    </label>
  );
}

function Shortcut({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 h-8 rounded-full bg-gray-100 hover:bg-blue-50 text-[11px] font-medium text-gray-600 hover:text-blue-700 border border-gray-200 hover:border-blue-300 transition shadow-sm"
    >
      {label}
    </button>
  );
}

// Animations (Tailwind utility injection if needed) - rely on existing classes; if not defined you can add in global CSS:
// .animate-fade-in { @apply motion-safe:animate-[fadeIn_.4s_ease-in]; }
