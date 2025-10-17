import React, { useEffect, useMemo, useState } from "react";
import { FiPackage } from "react-icons/fi";
import axiosClient from "../../api/axiosClient";

// Client-side mirror of backend unit size derivation for immediate UI display
function deriveUnitSize(category, name = "") {
  if (!category) return "";
  const c = category.toLowerCase();
  const n = (name || "").toLowerCase();
  if (c.includes("chocolate")) return "120g";
  if (c.includes("bite")) return "120g";
  if (c.includes("soft")) return "250ml";
  if (c.includes("yoghurt")) return "250ml";
  if (c.includes("sun") || c.includes("crush")) return "200ml";
  if (c.includes("beer")) {
    if (n.includes("500")) return "500ml";
    if (n.includes("330")) return "330ml";
    return "330ml";
  }
  if (
    c.includes("liquor") ||
    c.includes("hard") ||
    c.includes("arrack") ||
    c.includes("whisky")
  )
    return "750ml";
  return "";
}

export default function ManageInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // Category filter ("All" shows everything)
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState({
    name: "",
    desc: "",
    category: "Other",
    price: 0,
    stock: 0,
    status: "Available",
    img: "",
    unitSize: "",
  });

  async function fetchInventory() {
    setError("");
    setLoading(true);
    try {
      const res = await axiosClient.get("/api/inventory");
      setItems(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInventory();
  }, []);

  // Derive unique categories for pill filters
  const categories = useMemo(() => {
    const set = new Set();
    (items || []).forEach((i) => {
      if (i.category) set.add(i.category.trim());
    });
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (items || []).filter((i) => {
      const matchesSearch =
        i.name?.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q);
      const matchesCategory =
        categoryFilter === "All" || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, categoryFilter]);

  const updateItem = async (id, patch) => {
    try {
      const res = await axiosClient.patch(`/api/inventory/${id}`, patch);
      setItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await axiosClient.delete(`/api/inventory/${id}`);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (err) {
      alert(err.response?.data?.error || "Delete failed");
    }
  };

  const createItem = async () => {
    try {
      setCreating(true);
      const payload = {
        name: newItem.name.trim(),
        desc: newItem.desc,
        category: newItem.category,
        price: Number(newItem.price),
        stock: Number(newItem.stock),
        status: newItem.status,
        img: newItem.img,
        unitSize: newItem.unitSize || undefined,
      };
      if (!payload.name) return alert("Name is required");
      if (isNaN(payload.price) || payload.price < 0)
        return alert("Enter a valid price");
      const res = await axiosClient.post("/api/inventory", payload);
      setItems((prev) => [res.data, ...prev]);
      setNewItem({
        name: "",
        desc: "",
        category: "Other",
        price: 0,
        stock: 0,
        status: "Available",
        img: "",
        unitSize: "",
      });
    } catch (err) {
      alert(err.response?.data?.error || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const seedIfEmpty = async () => {
    try {
      const res = await axiosClient.post("/api/inventory/seed");
      // Refresh list
      await fetchInventory();
      alert(
        `Seed complete: created ${res.data?.created || 0}, updated ${
          res.data?.updated || 0
        }`
      );
    } catch (err) {
      alert(err.response?.data?.error || "Seed failed (manager only)");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-lg text-slate-700">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 bg-white/80 backdrop-blur rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-sky-100 text-sky-700">
                <FiPackage className="w-5 h-5" />
              </span>
              <span>Manage Inventory</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                {items.length} items
              </span>
            </h2>
            <div className="text-sm text-slate-600">
              View and update menu items
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white shadow-sm hover:shadow-md hover:bg-sky-700 transition"
              onClick={fetchInventory}
            >
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 text-rose-700 border border-rose-200">
            {error}
          </div>
        )}
        <div className="flex mb-6">
          <div className="relative w-full md:w-1/2">
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or category..."
              className="w-full rounded-2xl border border-slate-200 bg-white/90 pl-10 pr-4 py-2 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-4 -mt-2">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Filter inventory by category"
          >
            {categories.map((cat) => {
              const active = cat === categoryFilter;
              return (
                <button
                  key={cat}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategoryFilter(cat)}
                  className={
                    (active
                      ? "bg-emerald-600 text-white shadow-sm border-emerald-600"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200") +
                    " whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  }
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-4 mb-3 text-sm text-slate-600">
          <div>
            Showing{" "}
            <span className="font-semibold text-slate-900">
              {filtered.length}
            </span>{" "}
            item{filtered.length === 1 ? "" : "s"}
            {categoryFilter !== "All" && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {categoryFilter}
              </span>
            )}
          </div>
          {categoryFilter !== "All" && (
            <button
              type="button"
              onClick={() => setCategoryFilter("All")}
              className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Add New Item */}
        <div className="mb-6 bg-gradient-to-b from-white to-slate-50 rounded-2xl shadow border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            Add New Item
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Name*"
              value={newItem.name}
              onChange={(e) =>
                setNewItem((p) => {
                  const name = e.target.value;
                  return {
                    ...p,
                    name,
                    unitSize: deriveUnitSize(p.category, name),
                  };
                })
              }
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Category"
              value={newItem.category}
              onChange={(e) =>
                setNewItem((p) => {
                  const category = e.target.value;
                  return {
                    ...p,
                    category,
                    unitSize: deriveUnitSize(category, p.name),
                  };
                })
              }
            />
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Price (Rs.)"
              value={newItem.price}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, price: e.target.value }))
              }
            />
            <input
              type="number"
              min="0"
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Stock"
              value={newItem.stock}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, stock: e.target.value }))
              }
            />
            <select
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              value={newItem.status}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, status: e.target.value }))
              }
            >
              <option>Available</option>
              <option>Unavailable</option>
            </select>
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              placeholder="Unit Size (e.g. 250ml, 120g)"
              value={newItem.unitSize}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, unitSize: e.target.value }))
              }
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent md:col-span-3"
              placeholder="Image URL (optional)"
              value={newItem.img}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, img: e.target.value }))
              }
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent md:col-span-3"
              placeholder="Short description"
              value={newItem.desc}
              onChange={(e) =>
                setNewItem((p) => ({ ...p, desc: e.target.value }))
              }
            />
          </div>
          <div className="mt-3">
            <button
              disabled={creating}
              onClick={createItem}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm hover:shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {creating ? "Adding..." : "Add Item"}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-slate-900 sticky top-0 z-10">
              <tr>
                <th className="text-left p-3 font-semibold">Item</th>
                <th className="text-left p-3 font-semibold">Category</th>
                <th className="text-left p-3 font-semibold">Unit Size</th>
                <th className="text-left p-3 font-semibold">Price (Rs.)</th>
                <th className="text-left p-3 font-semibold">Stock</th>
                <th className="text-left p-3 font-semibold">Status</th>
                <th className="text-left p-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((it) => (
                <tr
                  key={it._id}
                  className="hover:bg-sky-50/50 odd:bg-white even:bg-slate-50/20"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={it.img}
                        alt={it.name}
                        className="w-12 h-12 object-cover rounded-lg ring-1 ring-slate-100"
                        onError={(e) =>
                          (e.currentTarget.style.visibility = "hidden")
                        }
                      />
                      <div>
                        <div className="font-semibold text-slate-900">
                          {it.name}
                        </div>
                        <div className="text-xs text-gray-500">{it.desc}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-gray-700">{it.category}</td>
                  <td className="p-3 text-gray-600 text-sm whitespace-nowrap">
                    <input
                      className="w-24 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-sm shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                      value={
                        it.unitSize ||
                        deriveUnitSize(it.category, it.name) ||
                        ""
                      }
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x._id === it._id
                              ? { ...x, unitSize: e.target.value }
                              : x
                          )
                        )
                      }
                      onBlur={() =>
                        updateItem(it._id, {
                          unitSize:
                            it.unitSize ||
                            deriveUnitSize(it.category, it.name) ||
                            undefined,
                        })
                      }
                      placeholder="e.g. 250ml"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      inputMode="numeric"
                      className="w-28 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                      value={it.price}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x._id === it._id
                              ? { ...x, price: Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      onBlur={() =>
                        updateItem(it._id, { price: Number(it.price) })
                      }
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100/70 text-slate-700 border border-slate-200 hover:bg-slate-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Decrease stock"
                        disabled={(it.stock || 0) <= 0}
                        onClick={() =>
                          updateItem(it._id, {
                            stock: Math.max(0, (it.stock || 0) - 1),
                          })
                        }
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="0"
                        className="w-20 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-center shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                        value={it.stock || 0}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((x) =>
                              x._id === it._id
                                ? {
                                    ...x,
                                    stock: Math.max(0, Number(e.target.value)),
                                  }
                                : x
                            )
                          )
                        }
                        onBlur={() =>
                          updateItem(it._id, {
                            stock: Math.max(0, Number(it.stock || 0)),
                          })
                        }
                      />
                      <button
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100/70 text-slate-700 border border-slate-200 hover:bg-slate-200 transition"
                        aria-label="Increase stock"
                        onClick={() =>
                          updateItem(it._id, { stock: (it.stock || 0) + 1 })
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="p-3">
                    <select
                      className="rounded-lg border border-slate-200 bg-white/90 px-2 py-1 shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-transparent focus:outline-none"
                      value={it.status}
                      onChange={(e) =>
                        updateItem(it._id, { status: e.target.value })
                      }
                    >
                      <option>Available</option>
                      <option>Unavailable</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button
                        className="px-4 py-2 rounded-xl bg-emerald-600 text-white shadow-sm hover:shadow-md hover:bg-emerald-700 transition inline-flex items-center gap-2"
                        onClick={() =>
                          updateItem(it._id, {
                            price: it.price,
                            stock: it.stock,
                            status: it.status,
                            unitSize:
                              it.unitSize ||
                              deriveUnitSize(it.category, it.name) ||
                              undefined,
                          })
                        }
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M9 16.17l-3.88-3.88L4 13.41 9 18.41 20 7.41 18.59 6l-9.59 9.59z" />
                        </svg>
                        <span>Save</span>
                      </button>
                      <button
                        title="Delete item"
                        className="p-2 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-100 transition inline-flex items-center justify-center"
                        onClick={() => deleteItem(it._id, it.name)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="w-4 h-4"
                        >
                          <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
