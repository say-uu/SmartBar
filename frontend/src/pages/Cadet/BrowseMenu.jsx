import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CartContext } from "../../contexts/CartContext";
import axiosClient from "../../api/axiosClient";

export default function BrowseMenu() {
  // Local fallback unit size derivation (mirrors backend logic)
  const deriveUnitSize = (category = "", name = "") => {
    const c = category.toLowerCase();
    const n = name.toLowerCase();
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
  };
  // Fallback static items (used only if API fails or returns empty)
  const fallbackItems = [
    // Soft Drinks
    {
      name: "CocaCola 250ml",
      desc: "Chilled CocaCola soft drink.",
      price: 250,
      img: "/soft drinks/cocacola 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Cream Soda 250ml",
      desc: "Sweet and creamy soda.",
      price: 250,
      img: "/soft drinks/cream soda 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Fanta 250ml",
      desc: "Orange flavored Fanta.",
      price: 250,
      img: "/soft drinks/fanta 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Mountain Dew 250ml",
      desc: "Refreshing Mountain Dew.",
      price: 250,
      img: "/soft drinks/Mountain-Dew-250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Pepsi 250ml",
      desc: "Classic Pepsi soft drink.",
      price: 250,
      img: "/soft drinks/pepsi 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Seven Up 250ml",
      desc: "Lemon-lime Seven Up.",
      price: 250,
      img: "/soft drinks/sevenup 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    {
      name: "Sprite 250ml",
      desc: "Crisp Sprite soft drink.",
      price: 250,
      img: "/soft drinks/sprite 250ml.png",
      status: "Available",
      category: "Soft Drinks",
    },
    // Bites
    {
      name: "Cheese & Onion Mixed Bite",
      desc: "Cheesy and onion flavored snack mix.",
      price: 200,
      img: "/Bites/Cheese & Onion mixed bite.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Devilled Peanuts",
      desc: "Spicy devilled peanuts.",
      price: 150,
      img: "/Bites/Devilled peanuts.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Fried Dhal Bite",
      desc: "Crispy fried dhal snack.",
      price: 150,
      img: "/Bites/Fried dhal bite.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Garlic Mixed Bite",
      desc: "Garlic flavored snack mix.",
      price: 200,
      img: "/Bites/Garlic mixed bite.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Hot & Spicy Mixture",
      desc: "Hot and spicy snack mix.",
      price: 200,
      img: "/Bites/Hot & Spicy mixture.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Indian Mixture",
      desc: "Traditional Indian snack mix.",
      price: 200,
      img: "/Bites/Indian mixture.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Onion Mixed Bite",
      desc: "Onion flavored snack mix.",
      price: 200,
      img: "/Bites/Onion mixed bite.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Spicy Bite",
      desc: "Spicy snack bite.",
      price: 200,
      img: "/Bites/Spicy bite.png",
      status: "Available",
      category: "Bites",
    },
    {
      name: "Spicy Chick Peas Bite",
      desc: "Spicy chickpeas snack.",
      price: 200,
      img: "/Bites/Spicy chick peas bite.png",
      status: "Available",
      category: "Bites",
    },
    // Beer
    {
      name: "Carlsberg",
      desc: "Classic Carlsberg beer.",
      price: 600,
      img: "/Beer/carlsberg.png",
      status: "Available",
      category: "Beer",
    },
    {
      name: "Heineken",
      desc: "Premium Heineken beer.",
      price: 650,
      img: "/Beer/heinken.png",
      status: "Available",
      category: "Beer",
    },
    {
      name: "Lion Beer 330ml",
      desc: "Lion beer, 330ml bottle.",
      price: 500,
      img: "/Beer/Lion beer 330ml.png",
      status: "Available",
      category: "Beer",
    },
    {
      name: "Lion Beer 500ml",
      desc: "Lion beer, 500ml bottle.",
      price: 800,
      img: "/Beer/lion beer 500ml.png",
      status: "Available",
      category: "Beer",
    },
    // Hard liquor
    {
      name: "Absolut Lime",
      desc: "Absolut Lime vodka.",
      price: 7000,
      img: "/Hard liquor/Absolut lime.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Bowmore",
      desc: "Bowmore single malt whisky.",
      price: 12000,
      img: "/Hard liquor/Bowmore.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Ceylon Walker",
      desc: "Ceylon Walker whisky.",
      price: 8500,
      img: "/Hard liquor/Ceylon walker.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Chivas",
      desc: "Chivas Regal whisky.",
      price: 15000,
      img: "/Hard liquor/chivas.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Eristoff",
      desc: "Eristoff vodka.",
      price: 6000,
      img: "/Hard liquor/Eristoff.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Gold Label Premium Arrack",
      desc: "Premium arrack.",
      price: 5000,
      img: "/Hard liquor/gold label premimum arrack.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Johnnie Walker",
      desc: "Johnnie Walker whisky.",
      price: 18000,
      img: "/Hard liquor/Johnnie walker.png",
      status: "Available",
      category: "Hard Liquor",
    },
    {
      name: "Old Arrack",
      desc: "Old Arrack spirit.",
      price: 4000,
      img: "/Hard liquor/Oldarrack.png",
      status: "Available",
      category: "Hard Liquor",
    },
    // Sun crush
    {
      name: "Appifiz Green Apple",
      desc: "Green apple sun crush.",
      price: 350,
      img: "/Sun crush/Appifiz green apple.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Chocolate",
      desc: "Chocolate sun crush.",
      price: 350,
      img: "/Sun crush/chocolate.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Grape",
      desc: "Grape sun crush.",
      price: 350,
      img: "/Sun crush/Grape.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Lemon",
      desc: "Lemon sun crush.",
      price: 350,
      img: "/Sun crush/lemon.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Mango",
      desc: "Mango sun crush.",
      price: 350,
      img: "/Sun crush/mango.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Red Apple",
      desc: "Red apple sun crush.",
      price: 350,
      img: "/Sun crush/redapple.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Sparkling Green Apple",
      desc: "Sparkling green apple sun crush.",
      price: 400,
      img: "/Sun crush/sparkling green apple.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Sparkling Oragena",
      desc: "Sparkling oragena sun crush.",
      price: 400,
      img: "/Sun crush/sparkling oragena.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Strawberry Shake",
      desc: "Strawberry shake sun crush.",
      price: 400,
      img: "/Sun crush/strawberry shake.png",
      status: "Available",
      category: "Sun Crush",
    },
    {
      name: "Sun Crush Green Apple",
      desc: "Green apple sun crush.",
      price: 350,
      img: "/Sun crush/sun-crush-green-apple.png",
      status: "Available",
      category: "Sun Crush",
    },
    // Yoghurt Drinks
    {
      name: "Aloe Vera",
      desc: "Aloe vera yoghurt drink.",
      price: 300,
      img: "/Yoghurt Drinks/Alovera.png",
      status: "Available",
      category: "Yoghurt Drinks",
    },
    {
      name: "Orange",
      desc: "Orange yoghurt drink.",
      price: 300,
      img: "/Yoghurt Drinks/orange.png",
      status: "Available",
      category: "Yoghurt Drinks",
    },
    {
      name: "Strawberry",
      desc: "Strawberry yoghurt drink.",
      price: 300,
      img: "/Yoghurt Drinks/strawberry.png",
      status: "Available",
      category: "Yoghurt Drinks",
    },
    {
      name: "Vanilla",
      desc: "Vanilla yoghurt drink.",
      price: 300,
      img: "/Yoghurt Drinks/vanila(1).png",
      status: "Available",
      category: "Yoghurt Drinks",
    },
    {
      name: "Woodapple",
      desc: "Woodapple yoghurt drink.",
      price: 300,
      img: "/Yoghurt Drinks/woodapple.png",
      status: "Available",
      category: "Yoghurt Drinks",
    },
    // Chocolates
    {
      name: "Almond Milk Chocolate",
      desc: "Rich milk chocolate with crunchy almonds.",
      price: 400,
      img: "/Chocolates/Almond milk chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Cashew & Crispy Milk Chocolate",
      desc: "Milk chocolate with cashew and crispy bits.",
      price: 400,
      img: "/Chocolates/Cashew & crispy milk chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Cashew Nut Milk Chocolate",
      desc: "Smooth milk chocolate with cashew nuts.",
      price: 400,
      img: "/Chocolates/Cashew nut mil chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Fruit & Nut Milk Chocolate",
      desc: "Milk chocolate with fruit and nut mix.",
      price: 400,
      img: "/Chocolates/Fruit & nut milk chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Hazelnut Coffee Chocolate",
      desc: "Chocolate with hazelnut and coffee flavor.",
      price: 400,
      img: "/Chocolates/hazelenut coffee chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Hazelnut Milk Chocolate",
      desc: "Creamy milk chocolate with hazelnuts.",
      price: 400,
      img: "/Chocolates/Hazelnut milk chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
    {
      name: "Milk Chocolate",
      desc: "Classic smooth milk chocolate.",
      price: 350,
      img: "/Chocolates/milk chocolate.png",
      status: "Available",
      category: "Chocolates",
    },
  ];

  const categories = [
    "All Items",
    "Liquors",
    "Other Beverages",
    "Snacks",
    "Chocolates",
  ];
  const [selectedCat, setSelectedCat] = React.useState("All Items");
  const [search, setSearch] = React.useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Map UI categories to menu item categories
  const categoryMap = {
    "All Items": null,
    Liquors: ["Beer", "Hard Liquor"],
    "Other Beverages": ["Soft Drinks", "Sun Crush", "Yoghurt Drinks"],
    Snacks: ["Bites"],
    Chocolates: ["Chocolates"], // For future chocolate items
  };

  // Fetch live inventory from backend with polling for near real-time updates
  useEffect(() => {
    let mounted = true;
    let timer;
    const fetchData = async (initial = false) => {
      try {
        if (initial) setLoading(true);
        const { data } = await axiosClient.get("/api/inventory");
        if (!mounted) return;
        setItems(Array.isArray(data) && data.length ? data : fallbackItems);
      } catch (e) {
        if (initial)
          setError("Failed to load inventory. Showing default items.");
        if (initial) setItems(fallbackItems);
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };
    fetchData(true);
    // Poll every 30s
    timer = setInterval(fetchData, 30000);
    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const filteredItems = useMemo(() => {
    const src = items && items.length ? items : fallbackItems;
    const list = src.filter((item) => {
      const nameMatch = (item.name || "")
        .toLowerCase()
        .includes(search.toLowerCase());
      const descMatch = (item.desc || "")
        .toLowerCase()
        .includes(search.toLowerCase());
      if (selectedCat === "All Items") return nameMatch || descMatch;
      const mappedCats = categoryMap[selectedCat];
      return (
        mappedCats &&
        mappedCats.includes(item.category) &&
        (nameMatch || descMatch)
      );
    });
    // Keep a stable order: available first, then unavailable; then by name
    return list.sort((a, b) => {
      const aAvail = (a.status || "Available") === "Available";
      const bAvail = (b.status || "Available") === "Available";
      if (aAvail !== bAvail) return aAvail ? -1 : 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [items, search, selectedCat]);

  // Cart context
  const { addItem } = useContext(CartContext);
  // Track quantity for each item by index
  const [quantities, setQuantities] = useState({});

  const handleQty = (idx, delta) => {
    setQuantities((prev) => {
      const current = prev[idx] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [idx]: next };
    });
  };

  const handleAddToCart = (item, idx) => {
    const qty = quantities[idx] || 1;
    // Always use .name, .price, .img as .image for backend
    addItem(
      {
        name: item.name,
        price: item.price,
        img: item.img,
        image: item.img,
      },
      qty
    );
    setQuantities((prev) => ({ ...prev, [idx]: 1 })); // reset to 1 after add
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-blue-900">Menu</h2>
            <div className="text-gray-500">Choose from our fresh selection</div>
          </div>
          <Link
            to="/cadet/cart"
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold bg-green-600 hover:bg-green-700 text-white text-lg"
          >
            {/* Trolley Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
              aria-hidden="true"
            >
              {/* Handle */}
              <path d="M3 3h3l2.2 11.2a2 2 0 0 0 2 1.6H18a2 2 0 0 0 2-1.6L21 9H7" />
              {/* Basket lines */}
              <path d="M9 13h10" />
              {/* Wheels */}
              <circle cx="10" cy="20" r="1.6" />
              <circle cx="18" cy="20" r="1.6" />
            </svg>
            <span>View Cart</span>
          </Link>
        </div>
        {error && (
          <div className="mb-4 text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <input
            type="text"
            className="w-full md:w-1/2 rounded-xl border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="Search menu items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="rounded-xl border px-4 py-2 font-medium text-blue-700 bg-white hover:bg-blue-50">
            Filters
          </button>
        </div>
        {/* Category Tabs */}
        <div className="flex gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-lg font-semibold ${
                selectedCat === cat
                  ? "bg-blue-700 text-white"
                  : "bg-blue-100 text-blue-700"
              }`}
              onClick={() => setSelectedCat(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        {/* Menu Grid */}
        {loading ? (
          <div className="text-center text-blue-700">Loading items…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 items-stretch">
            {filteredItems.map((item, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl shadow p-4 flex flex-col h-full"
              >
                <div className="relative mb-2">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-40 object-cover rounded-xl"
                  />
                  {item.tag && (
                    <span className="absolute top-2 left-2 bg-orange-400 text-white text-xs font-bold px-2 py-1 rounded">
                      {item.tag}
                    </span>
                  )}
                  <span
                    className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded ${
                      (item.status || "Available") === "Available"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {(item.status || "Available") === "Available"
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </div>
                <div className="font-bold text-lg text-blue-900 mt-2 flex-grow">
                  {item.name}
                </div>
                <div className="text-gray-500 text-sm mb-2 line-clamp-3">
                  {item.desc}
                </div>
                <div className="font-bold text-xl text-blue-700 mb-2">
                  Rs. {item.price.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-blue-700/80 mb-2">
                  Size:{" "}
                  {item.unitSize ||
                    deriveUnitSize(item.category, item.name) ||
                    "—"}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <button
                    className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold"
                    onClick={() => handleQty(idx, -1)}
                    disabled={(quantities[idx] || 1) <= 1}
                  >
                    -
                  </button>
                  <span>{quantities[idx] || 1}</span>
                  <button
                    className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold"
                    onClick={() => handleQty(idx, 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className={`w-full rounded-xl px-4 py-2 font-semibold text-lg ${
                    (item.status || "Available") === "Available"
                      ? "bg-blue-700 hover:bg-blue-800 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  disabled={(item.status || "Available") !== "Available"}
                  onClick={() => handleAddToCart(item, idx)}
                >
                  {(item.status || "Available") === "Available"
                    ? "Add to Cart"
                    : "Unavailable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
