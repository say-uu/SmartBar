import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PurchaseHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const res = await axiosClient.get("/api/order/history");
        setOrders(res.data);
      } catch (err) {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, []);

  // Group orders by date string
  const grouped = orders.reduce((acc, order) => {
    const date = formatDate(order.createdAt);
    if (!acc[date]) acc[date] = [];
    acc[date].push(order);
    return acc;
  }, {});

  // Helper to display payment method in friendly format
  const getPaymentMethodLabel = (method) => {
    if (!method) return "Unknown";
    const m = method.toLowerCase();
    if (m.includes("allowance")) return "Monthly Allowance";
    if (m.includes("credit")) return "Credit Card";
    if (m.includes("cash")) return "Cash";
    return method;
  };

  // Download receipt as text
  const handleDownload = (order) => {
    let receipt = `SMARTBAR\nPurchase Receipt\n`;
    receipt += `Receipt ID: ${order.orderId}\n`;
    receipt += `Date: ${formatDate(order.createdAt)}\n`;
    receipt += `Time: ${formatTime(order.createdAt)}\n`;
    receipt += `\nPURCHASE DETAILS:\n`;
    order.items.forEach((item) => {
      receipt += `${item.qty}x ${item.name} - Rs.${item.price.toFixed(2)}\n`;
    });
    receipt += `\nTOTAL: Rs.${order.total.toFixed(2)}\n`;
    receipt += `Payment Method: ${getPaymentMethodLabel(
      order.paymentMethod
    )}\n`;
    const blob = new Blob([receipt], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Smartbar_Receipt_${order.orderId}.txt`;
    link.click();
  };

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-blue-900">Purchase History</h2>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-700">
            {orders.length} transactions
          </div>
          <div className="text-xs text-gray-500">All-time purchases</div>
        </div>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : orders.length === 0 ? (
        <div className="text-gray-500">No purchases yet.</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayOrders]) =>
            dayOrders.map((order, idx) => (
              <div
                key={order._id}
                className="bg-white rounded-xl shadow p-6 flex flex-col md:flex-row md:items-center md:justify-between border mb-2"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="font-bold text-gray-900 text-base">
                      {date}
                    </div>
                    <span className="text-xs bg-gray-100 rounded px-2 py-1 font-mono">
                      {formatTime(order.createdAt)}
                    </span>
                    <span className="text-xs bg-blue-100 text-blue-900 rounded px-2 py-1 font-mono font-bold">
                      {order.orderId}
                    </span>
                    <span className="text-gray-500 text-sm ml-auto">
                      Rs.
                      {order.total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex flex-row justify-between items-start w-full">
                    <div className="flex flex-col flex-1 ml-1">
                      {order.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex flex-row items-center text-sm text-gray-800 mb-1"
                        >
                          <span>
                            {item.qty}x {item.name}
                          </span>
                        </div>
                      ))}
                      <div className="text-xs text-gray-500 mt-2">
                        Payment Method:{" "}
                        {getPaymentMethodLabel(order.paymentMethod)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end min-w-[180px]">
                      <div className="flex flex-row items-center gap-2 mb-2">
                        <button
                          onClick={() => handleDownload(order)}
                          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded shadow transition-colors"
                        >
                          <span
                            className="mr-2"
                            role="img"
                            aria-label="download"
                          >
                            ⬇️
                          </span>
                          Download Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-row justify-end mt-2">
                    {/* Total moved under payment method on the right */}
                  </div>
                </div>
                <div className="mt-4 md:mt-0 flex-shrink-0 flex flex-row md:flex-col gap-2 md:gap-4 justify-end">
                  {/* Download button moved to row above for horizontal alignment */}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
