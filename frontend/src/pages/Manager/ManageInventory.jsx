import React, { useEffect, useMemo, useState } from "react";
import { FiPackage, FiEdit2, FiX, FiTrash2, FiPlus } from "react-icons/fi";
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

const CATEGORY_STORAGE_KEY = "sb-extra-categories";
const NEW_CATEGORY_VALUE = "__add_new_category__";

function loadStoredCategories() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(CATEGORY_STORAGE_KEY) || "[]"
    );
    if (Array.isArray(stored)) {
      return Array.from(
        new Set(
          stored
            .filter((c) => typeof c === "string")
            .map((c) => c.trim())
            .filter(Boolean)
        )
      );
    }
  } catch (err) {
    console.warn("Failed to parse stored categories", err);
  }
  return [];
}

export default function ManageInventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  // Category filter ("All" shows everything)
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
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
  const [customCategories, setCustomCategories] =
    useState(loadStoredCategories);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [categoryManagerMessage, setCategoryManagerMessage] = useState({
    tone: "muted",
    text: "",
  });
  const [categoryComposerVisible, setCategoryComposerVisible] = useState(false);
  const [inlineCategoryDraft, setInlineCategoryDraft] = useState("");
  const [inlineCategoryMessage, setInlineCategoryMessage] = useState({
    tone: "muted",
    text: "",
  });
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [manageCategoriesMode, setManageCategoriesMode] = useState(false);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      CATEGORY_STORAGE_KEY,
      JSON.stringify(customCategories)
    );
  }, [customCategories]);

  const detectedCategories = useMemo(() => {
    const set = new Set();
    (items || []).forEach((i) => {
      if (i.category) set.add(i.category.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const categoryOptions = useMemo(() => {
    const set = new Set(detectedCategories);
    set.add("Other");
    customCategories.forEach((cat) => set.add(cat));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [detectedCategories, customCategories]);

  const pillCategories = useMemo(() => {
    return ["All", ...categoryOptions];
  }, [categoryOptions]);

  useEffect(() => {
    if (
      categoryFilter !== "All" &&
      !categoryOptions.some(
        (cat) => cat.toLowerCase() === categoryFilter.toLowerCase()
      )
    ) {
      setCategoryFilter("All");
    }
  }, [categoryFilter, categoryOptions]);

  useEffect(() => {
    if (!categoryOptions.length) return;
    setNewItem((prev) => {
      if (!prev.category) {
        const fallback = categoryOptions[0];
        return {
          ...prev,
          category: fallback,
          unitSize: deriveUnitSize(fallback, prev.name),
        };
      }

      const match = categoryOptions.find(
        (cat) => cat.toLowerCase() === prev.category.toLowerCase()
      );
      if (match && match === prev.category) return prev;
      if (match) {
        return {
          ...prev,
          category: match,
          unitSize: deriveUnitSize(match, prev.name),
        };
      }

      const fallback = categoryOptions[0];
      return {
        ...prev,
        category: fallback,
        unitSize: deriveUnitSize(fallback, prev.name),
      };
    });
  }, [categoryOptions]);

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

  const addCategoryByName = (label, setFeedback) => {
    const trimmed = (label || "").trim();
    if (!trimmed) {
      setFeedback?.({ tone: "error", text: "Enter a category name." });
      return null;
    }
    const exists = categoryOptions.some(
      (cat) => cat.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      setFeedback?.({ tone: "error", text: "Category already exists." });
      return null;
    }
    setCustomCategories((prev) => [...prev, trimmed]);
    setFeedback?.({
      tone: "success",
      text: `Added "${trimmed}" to your quick list.`,
    });
    return trimmed;
  };

  const handleAddCategoryFromPanel = () => {
    const added = addCategoryByName(categoryDraft, setCategoryManagerMessage);
    if (added) {
      setCategoryDraft("");
    }
  };

  const handleInlineCategorySave = () => {
    const added = addCategoryByName(
      inlineCategoryDraft,
      setInlineCategoryMessage
    );
    if (added) {
      setInlineCategoryDraft("");
      setCategoryComposerVisible(false);
      setNewItem((prev) => ({
        ...prev,
        category: added,
        unitSize: deriveUnitSize(added, prev.name),
      }));
    }
  };

  const closeInlineComposer = () => {
    setCategoryComposerVisible(false);
    setInlineCategoryDraft("");
    setInlineCategoryMessage({ tone: "muted", text: "" });
  };

  const handleCategorySelect = (value) => {
    if (value === NEW_CATEGORY_VALUE) {
      setCategoryComposerVisible(true);
      return;
    }
    setCategoryComposerVisible(false);
    setInlineCategoryDraft("");
    setInlineCategoryMessage({ tone: "muted", text: "" });
    setNewItem((prev) => ({
      ...prev,
      category: value,
      unitSize: deriveUnitSize(value, prev.name),
    }));
  };

  const updateItem = async (id, patch) => {
    try {
      const res = await axiosClient.patch(`/api/inventory/${id}`, patch);
      setItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
    } catch (err) {
      alert(err.response?.data?.error || "Update failed");
    }
  };

  const deleteItem = async (id) => {
    try {
      await axiosClient.delete(`/api/inventory/${id}`);
      setItems((prev) => prev.filter((it) => it._id !== id));
    } catch (err) {
      throw new Error(err.response?.data?.error || "Delete failed");
    }
  };

  const createItem = async () => {
    try {
      setFormError("");
      // Basic validation
      const name = (newItem.name || "").toString().trim();
      if (!name) {
        setFormError("Name is required.");
        return;
      }
      const price = parseFloat(newItem.price);
      if (isNaN(price) || price < 0) {
        setFormError("Enter a valid non-negative price.");
        return;
      }
      const stock = parseInt(newItem.stock, 10);
      if (isNaN(stock) || stock < 0) {
        setFormError("Enter a valid non-negative stock value.");
        return;
      }
      const categoryValue = (newItem.category || "").toString().trim();
      if (!categoryValue) {
        setFormError("Select a category.");
        return;
      }

      setCreating(true);
      const payload = {
        name,
        desc: newItem.desc || "",
        category: categoryValue,
        price,
        stock,
        status: newItem.status || "Available",
        img: newItem.img || "",
        unitSize: newItem.unitSize || undefined,
      };

      const res = await axiosClient.post("/api/inventory", payload);
      // Prepend created item to the list
      setItems((prev) => [res.data, ...(prev || [])]);
      // Reset form (keep category default)
      setNewItem({
        name: "",
        desc: "",
        category: newItem.category || "Other",
        price: 0,
        stock: 0,
        status: "Available",
        img: "",
        unitSize: "",
      });
    } catch (err) {
      setFormError(err.response?.data?.error || "Create failed");
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

  const promptItemDeletion = (item) => {
    setConfirmDialog({
      title: "Delete item",
      message: `Delete "${item.name}"? This cannot be undone.`,
      confirmLabel: "Delete item",
      variant: "danger",
      onConfirm: () => deleteItem(item._id),
    });
  };

  const promptCategoryRemoval = (category) => {
    setConfirmDialog({
      title: "Remove category",
      message: `Remove "${category}" from your quick list? Existing items keep their label.`,
      confirmLabel: "Remove category",
      variant: "danger",
      onConfirm: () => {
        setCustomCategories((prev) =>
          prev.filter((cat) => cat.toLowerCase() !== category.toLowerCase())
        );
        if (categoryFilter === category) {
          setCategoryFilter("All");
        }
        setNewItem((prev) => {
          if (!prev.category || prev.category !== category) return prev;
          const fallback =
            categoryOptions.find((cat) => cat !== category) || "Other";
          return {
            ...prev,
            category: fallback,
            unitSize: deriveUnitSize(fallback, prev.name),
          };
        });
        setCategoryManagerMessage({
          tone: "muted",
          text: `Removed "${category}" from quick picks.`,
        });
      },
    });
  };

  // Fully delete a category: reassign all items to 'Other'
  const promptCategoryDelete = (category) => {
    setConfirmDialog({
      title: "Delete category",
      message: `Delete category "${category}" and move all its items to 'Other'? This cannot be undone.`,
      confirmLabel: "Delete category",
      variant: "danger",
      onConfirm: async () => {
        const affected = items.filter((i) => i.category === category);
        for (const it of affected) {
          try {
            setItems((prev) =>
              prev.map((x) =>
                x._id === it._id ? { ...x, category: "Other" } : x
              )
            );
            await axiosClient.patch(`/api/inventory/${it._id}`, {
              category: "Other",
            });
          } catch (err) {
            console.warn("Failed to update item", it._id, err);
          }
        }
        setCustomCategories((prev) => prev.filter((c) => c !== category));
        if (categoryFilter === category) setCategoryFilter("All");
      },
    });
  };

  const closeConfirmDialog = () => {
    if (confirmLoading) return;
    setConfirmDialog(null);
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog?.onConfirm) return;
    try {
      setConfirmLoading(true);
      await confirmDialog.onConfirm();
      setConfirmDialog(null);
    } catch (err) {
      const message = err?.message || "Action failed";
      alert(message);
    } finally {
      setConfirmLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-gradient-to-br from-slate-50 to-white py-12">
        <div className="text-lg text-slate-700">Loading inventory...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-slate-50 via-white to-sky-50 py-4 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 bg-white/80 backdrop-blur rounded-xl border border-slate-200 p-2 shadow-sm">
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
          <div className="mb-3 p-2 rounded bg-rose-50 text-rose-700 border border-rose-200 text-sm">
            {error}
          </div>
        )}
        <div className="flex mb-3">
          <div className="relative w-full">
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
        <div className="mb-2 -mt-1">
          <div
            className="flex gap-1.5 overflow-x-auto pb-1"
            role="tablist"
            aria-label="Filter inventory by category"
          >
            {pillCategories.map((cat) => {
              const active = cat === categoryFilter;
              const deletable = manageCategoriesMode && cat !== "All";
              return (
                <div key={cat} className="relative shrink-0">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setCategoryFilter(cat)}
                    className={
                      (active
                        ? "bg-emerald-600 text-white shadow-sm border-emerald-600"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200") +
                      (deletable ? " pr-7" : " pr-3") +
                      " whitespace-nowrap pl-3 py-1.5 rounded-lg text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    }
                  >
                    {cat}
                  </button>
                  {deletable && (
                    <button
                      type="button"
                      title={`Delete category ${cat}`}
                      aria-label={`Delete category ${cat}`}
                      onClick={() => promptCategoryDelete(cat)}
                      className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => setManageCategoriesMode((m) => !m)}
              className="whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition"
            >
              {manageCategoriesMode ? "Done" : "Edit"}
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mb-2 text-sm text-slate-600">
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
        <div className="mb-4 bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="text-sm font-semibold text-slate-900 mb-3">
            Add New Item
          </div>
          {formError && (
            <div className="mb-3 text-sm text-rose-700 font-medium">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-start">
            {/* Name */}
            <div className="md:col-span-2">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
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
            </div>
            {/* Category select or composer */}
            {!categoryComposerVisible && (
              <div className="md:col-span-1">
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  value={newItem.category}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                >
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value={NEW_CATEGORY_VALUE}>
                    + Add new category...
                  </option>
                </select>
              </div>
            )}
            {categoryComposerVisible && (
              <div className="md:col-span-2 flex flex-col gap-2">
                <input
                  autoFocus
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="New category name"
                  value={inlineCategoryDraft}
                  onChange={(e) => setInlineCategoryDraft(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!inlineCategoryDraft.trim()}
                    onClick={handleInlineCategorySave}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-1 justify-center w-full">
                      <FiPlus /> Save
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={closeInlineComposer}
                    className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-300 transition"
                  >
                    Cancel
                  </button>
                </div>
                {inlineCategoryDraft && (
                  <div className="text-xs text-slate-500 px-1">
                    Press Save to add category to list.
                  </div>
                )}
              </div>
            )}
            {/* Price */}
            <div className="md:col-span-1">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Price (Rs.)"
                value={newItem.price}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, price: e.target.value }))
                }
              />
            </div>
            {/* Stock */}
            <div className="md:col-span-1">
              <input
                type="number"
                min="0"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Stock"
                value={newItem.stock}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, stock: e.target.value }))
                }
              />
            </div>
            {/* Status */}
            <div className="md:col-span-1">
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                value={newItem.status}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, status: e.target.value }))
                }
              >
                <option>Available</option>
                <option>Unavailable</option>
              </select>
            </div>
            {/* Unit Size */}
            <div className="md:col-span-1">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Unit Size (e.g. 250ml, 120g)"
                value={newItem.unitSize}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, unitSize: e.target.value }))
                }
              />
            </div>
            {/* Add Button (fills remaining column when composer hidden) */}
            {!categoryComposerVisible && (
              <div className="md:col-span-1 flex items-start">
                <button
                  disabled={creating}
                  onClick={createItem}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Item"}
                </button>
              </div>
            )}
            {categoryComposerVisible && (
              <div className="md:col-span-1 flex items-start">
                <button
                  disabled={creating}
                  onClick={createItem}
                  className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {creating ? "Adding..." : "Add Item"}
                </button>
              </div>
            )}
            {/* Image URL */}
            <div className="md:col-span-7">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Image URL (optional)"
                value={newItem.img}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, img: e.target.value }))
                }
              />
            </div>
            {/* Description */}
            <div className="md:col-span-7">
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Short description"
                value={newItem.desc}
                onChange={(e) =>
                  setNewItem((p) => ({ ...p, desc: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-lg border border-slate-200">
          <table className="min-w-full">
            <thead className="bg-slate-50 text-slate-900 sticky top-0 z-10">
              <tr>
                <th className="text-left p-2 font-semibold">Item</th>
                <th className="text-left p-2 font-semibold">Category</th>
                <th className="text-left p-2 font-semibold">Unit Size</th>
                <th className="text-left p-2 font-semibold">Price (Rs.)</th>
                <th className="text-left p-2 font-semibold">Stock</th>
                <th className="text-left p-2 font-semibold">Status</th>
                <th className="text-left p-2 font-semibold">Actions</th>
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
                      {it.img && (
                        <img
                          src={it.img}
                          alt={it.name}
                          className="w-12 h-12 object-cover rounded-lg ring-1 ring-slate-100"
                          onError={(e) =>
                            (e.currentTarget.style.visibility = "hidden")
                          }
                        />
                      )}
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
                        onClick={() => promptItemDeletion(it)}
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
                  <td colSpan={7} className="p-6 text-center text-gray-500">
                    No items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-slate-600">
                    {confirmDialog.message}
                  </p>
                </div>
                <button
                  type="button"
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                  onClick={closeConfirmDialog}
                  disabled={confirmLoading}
                >
                  <FiX />
                </button>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium disabled:opacity-50"
                  onClick={closeConfirmDialog}
                  disabled={confirmLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={confirmLoading}
                  className={
                    "px-4 py-2 rounded-lg text-sm font-medium shadow-sm focus:outline-none " +
                    (confirmDialog.variant === "danger"
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white") +
                    (confirmLoading ? " opacity-50" : "")
                  }
                >
                  {confirmLoading ? "Working..." : confirmDialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
