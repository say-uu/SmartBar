import React, { createContext, useState, useEffect, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "./AuthContext";

export const CartContext = createContext();

export function CartProvider({ children }) {
  const { user } = useContext(AuthContext);
  const [items, setItems] = useState([]);

  // Always clear cart state before fetching new cart for current user
  useEffect(() => {
    setItems([]);
    async function fetchCart() {
      if (!user?.serviceNumber) return;
      try {
        const res = await axiosClient.get("/api/cart/get");
        const items = (res.data.items || []).map((item) => ({
          ...item,
          qty: item.qty ?? item.quantity ?? 1,
        }));
        setItems(items);
      } catch (err) {
        setItems([]);
      }
    }
    fetchCart();
  }, [user?.serviceNumber]);
  // Add item to cart (backend)
  const addItem = async (item, qty = 1) => {
    if (!user?.serviceNumber) return;
    const cartItem = {
      name: item.name,
      price: Number(item.price),
      qty: Number(qty),
      image: item.image || item.img,
    };
    try {
      await axiosClient.post("/api/cart/add", {
        item: cartItem,
      });
      const res = await axiosClient.get("/api/cart/get");
      const items = (res.data.items || []).map((item) => ({
        ...item,
        qty: item.qty ?? item.quantity ?? 1,
      }));
      setItems(items);
    } catch (err) {}
  };

  // Update quantity (remove if qty <= 0)
  const updateQty = async (name, qty) => {
    if (!user?.serviceNumber) return;
    if (qty <= 0) return removeItem(name);
    try {
      // Find item in cart
      const item = items.find((i) => i.name === name);
      if (!item) return;
      await axiosClient.post("/api/cart/add", {
        item: { ...item, qty },
      });
      const res = await axiosClient.get("/api/cart/get");
      const items = (res.data.items || []).map((item) => ({
        ...item,
        qty: item.qty ?? item.quantity ?? 1,
      }));
      setItems(items);
    } catch (err) {}
  };

  // Remove item from cart (backend)
  const removeItem = async (name) => {
    if (!user?.serviceNumber) return;
    try {
      await axiosClient.post("/api/cart/remove", {
        itemName: name,
      });
      const res = await axiosClient.get("/api/cart/get");
      const items = (res.data.items || []).map((item) => ({
        ...item,
        qty: item.qty ?? item.quantity ?? 1,
      }));
      setItems(items);
    } catch (err) {}
  };

  // Clear cart (backend)
  const clear = async () => {
    if (!user?.serviceNumber) return;
    try {
      await axiosClient.post("/api/cart/clear");
      setItems([]);
    } catch (err) {}
  };

  const total = () => items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, updateQty, removeItem, clear, total }}
    >
      {children}
    </CartContext.Provider>
  );
}
