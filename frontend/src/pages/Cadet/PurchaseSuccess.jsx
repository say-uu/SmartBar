import React, { useContext, useEffect, useRef, useState } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useLocation, Link } from "react-router-dom";
import { CartContext } from "../../contexts/CartContext";
import { AuthContext } from "../../contexts/AuthContext";
import axiosClient from "../../api/axiosClient";
import { sendReceiptEmail, isEmailJSEnabled } from "../../utils/emailjsClient";
// PDF libraries
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function formatDate(date) {
  if (!date) return "-";
  if (typeof date === "string") date = new Date(date);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "-";
  if (typeof date === "string") date = new Date(date);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function PurchaseSuccess() {
  const { items, total, clear } = useContext(CartContext);
  const { user, setUser } = useContext(AuthContext);
  const location = useLocation();
  const [order, setOrder] = useState(null); // Store order from backend
  const [loading, setLoading] = useState(true);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailSentTo, setEmailSentTo] = useState("");
  const [alerts, setAlerts] = useState(null); // backend-calculated allowance stats
  // QR pickup feature removed: no QR state retained
  const receiptRef = useRef();
  const postedRef = useRef(false);
  // Stable idempotency key for this purchase attempt across StrictMode re-mounts
  const idempotencyKeyRef = useRef(null);
  if (!idempotencyKeyRef.current) {
    const STORAGE_KEY = "smartbar_purchase_idem_key";
    const existing =
      typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY);
    const generated =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const stable = existing || generated;
    if (!existing && typeof window !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, stable);
    }
    idempotencyKeyRef.current = stable;
  }
  const paymentMethod = location.state?.paymentMethod || "Monthly Allowance";
  const cardDetails = location.state?.cardDetails || null;
  const allowanceUsed = location.state?.allowanceUsed ?? 0;
  const cashOrCardDue = location.state?.cashOrCardDue ?? 0;
  useEffect(() => {
    console.log(
      "[PurchaseSuccess.jsx] paymentMethod=",
      paymentMethod,
      cardDetails
    );
  }, [paymentMethod, cardDetails]);

  useEffect(() => {
    async function processOrder() {
      if (postedRef.current) return; // prevent double submission
      if (items.length === 0) {
        setLoading(false);
        return;
      }
      try {
        postedRef.current = true;
        // Save order to backend for history, include paymentMethod and split payment
        const orderRes = await axiosClient.post("/api/order/create", {
          items: items.map(({ name, price, qty }) => ({ name, price, qty })),
          total: total(),
          paymentMethod,
          allowanceUsed,
          cashOrCardDue,
          idempotencyKey: idempotencyKeyRef.current,
        });
        const createdOrder = orderRes.data?.order ?? orderRes.data;
        const updatedCadet = orderRes.data?.cadet;
        const serverAlerts = orderRes.data?.alerts || null;
        setOrder(createdOrder);
        if (serverAlerts) setAlerts(serverAlerts);
        if (updatedCadet) {
          setUser(updatedCadet);
          localStorage.setItem("user", JSON.stringify(updatedCadet));
        } else {
          // Fallback: fetch profile if backend didn't return cadet (older servers)
          const profileRes = await axiosClient.get("/api/auth/profile");
          if (profileRes.data) {
            setUser(profileRes.data);
            localStorage.setItem("user", JSON.stringify(profileRes.data));
          }
        }
        // Try sending receipt via EmailJS (frontend) if configured
        if (isEmailJSEnabled()) {
          const toEmail = (updatedCadet?.email || user?.email || "").trim();
          const result = await sendReceiptEmail({
            toEmail: toEmail || undefined,
            toName: user?.name,
            order: createdOrder,
            cadet: updatedCadet || user,
          });
          setEmailStatus(result);
          if (toEmail) setEmailSentTo(toEmail);
        }
        // Clear cart and idempotency key now that processing succeeded
        try {
          sessionStorage.removeItem("smartbar_purchase_idem_key");
        } catch {}
        clear();
        setLoading(false);
      } catch (err) {
        setOrder(null);
        // Do NOT remove the idempotency key on error so a retry reuses the same key
        clear();
        setLoading(false);
      }
    }
    processOrder();
    // eslint-disable-next-line
  }, []);

  // Download receipt as plain text
  // Helper to display payment method in friendly format
  const getPaymentMethodLabel = (method) => {
    if (!method) return "Unknown";
    const m = method.toLowerCase();
    if (m.includes("allowance")) return "Monthly Allowance";
    if (m.includes("credit")) return "Credit Card";
    if (m.includes("cash")) return "Cash";
    return method;
  };

  const handleDownload = () => {
    if (!order) return;
    const doc = new jsPDF();
    const lineHeight = 6;
    let y = 10;
    const pageWidth = doc.internal.pageSize.getWidth();
    const centerText = (text, yPos, fontSize = 12, style = "") => {
      doc.setFontSize(fontSize);
      doc.setFont(undefined, style || "normal");
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, yPos);
    };
    centerText("SMARTBAR", y, 18, "bold");
    y += lineHeight + 2;
    centerText("Purchase Receipt", y, 14);
    y += lineHeight * 2;
    doc.setFontSize(10);
    doc.text(`Receipt ID: ${order.orderId}`, 14, y);
    y += lineHeight;
    doc.text(`Date: ${formatDate(order.createdAt)}`, 14, y);
    y += lineHeight;
    doc.text(`Time: ${formatTime(order.createdAt)}`, 14, y);
    y += lineHeight;
    y += 2;
    doc.setFont(undefined, "bold");
    doc.text("Cadet Information", 14, y);
    y += lineHeight;
    doc.setFont(undefined, "normal");
    doc.text(`Name: ${user?.name || "-"}`, 14, y);
    y += lineHeight;
    doc.text(`Service Number: ${user?.serviceNumber || "-"}`, 14, y);
    y += lineHeight;
    doc.text(`University: Kothalawala Defence University`, 14, y);
    y += lineHeight + 2;
    // Items table
    autoTable(doc, {
      startY: y,
      head: [["Item", "Unit Price", "Qty", "Total"]],
      body: order.items.map((i) => [
        i.name,
        `Rs.${Number(i.price).toFixed(2)}`,
        i.qty,
        `Rs.${(Number(i.price) * Number(i.qty)).toFixed(2)}`,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [24, 49, 83] },
    });
    y = (doc.lastAutoTable?.finalY || y) + 4;
    doc.setFont(undefined, "bold");
    doc.text("Totals", 14, y);
    y += lineHeight;
    doc.setFont(undefined, "normal");
    doc.text(`Subtotal: Rs.${order.total.toFixed(2)}`, 14, y);
    y += lineHeight;
    doc.text(`Tax: Rs.0.00`, 14, y);
    y += lineHeight;
    doc.text(`Grand Total: Rs.${order.total.toFixed(2)}`, 14, y);
    y += lineHeight + 2;
    // Payment breakdown
    doc.setFont(undefined, "bold");
    doc.text("Payment Breakdown", 14, y);
    y += lineHeight;
    doc.setFont(undefined, "normal");
    if ((order.allowanceUsed ?? 0) > 0) {
      doc.text(
        `Monthly Allowance: Rs.${Number(order.allowanceUsed).toFixed(2)}`,
        14,
        y
      );
      y += lineHeight;
    }
    if ((order.cashOrCardDue ?? 0) > 0) {
      doc.text(
        `${getPaymentMethodLabel(
          order.paymentMethod || paymentMethod
        )}: Rs.${Number(order.cashOrCardDue).toFixed(2)}`,
        14,
        y
      );
      y += lineHeight;
    }
    y += 2;
    doc.setFont(undefined, "bold");
    doc.text("Monthly Credit Summary", 14, y);
    y += lineHeight;
    doc.setFont(undefined, "normal");
    const monthlyAllowance = Number(user?.monthlyAllowance ?? 0);
    doc.text(`Monthly Allowance: Rs.${monthlyAllowance.toFixed(2)}`, 14, y);
    y += lineHeight;
    doc.text(`Amount Spent (this order): Rs.${order.total.toFixed(2)}`, 14, y);
    y += lineHeight;
    doc.text(`Remaining Balance: Rs.${monthlyAllowance.toFixed(2)}`, 14, y);
    y += lineHeight + 4;
    doc.setFontSize(9);
    doc.text("Thank you for your purchase!", 14, y);
    y += lineHeight;
    doc.text("For queries contact Smartbar Management", 14, y);
    y += lineHeight;
    doc.text("Academy Year 2024-2025", 14, y);
    y += lineHeight;
    doc.text(
      `Generated on: ${formatDate(order.createdAt)}, ${formatTime(
        order.createdAt
      )}`,
      14,
      y
    );
    doc.save(`Smartbar_Receipt_${order.orderId}.pdf`);
  };

  // QR fetch effect removed

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-700">Processing your order...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 flex flex-col">
      <div className="max-w-6xl mx-auto flex-1 w-full">
        {/* Top-right Back to Home Button */}
        <div className="w-full flex justify-end mb-6">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all text-sm"
          >
            <span className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center shadow-inner group-hover:bg-white/25 transition-colors">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4"
              >
                <path d="M15 18l-6-6 6-6" />
                <path d="M9 12h12" />
              </svg>
            </span>
            <span>Back to Home</span>
          </Link>
        </div>
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 rounded-full w-20 h-20 flex items-center justify-center mb-4">
            <FiCheckCircle className="text-green-600 text-5xl" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Order Successful!
          </h2>
          <div className="text-gray-600 mb-2">
            Your payment has been processed and your order is confirmed.
          </div>
          <div className="text-green-700 font-semibold mb-4">
            {emailStatus?.sent ? (
              <>
                Your bill has been emailed to{" "}
                <span className="underline">{emailSentTo || user?.email}</span>.
              </>
            ) : isEmailJSEnabled() ? (
              "Emailing your receipt..."
            ) : (
              "Email service is not configured."
            )}
          </div>
        </div>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Order Details */}
          <div
            className="bg-white rounded-xl shadow p-6 flex-1"
            ref={receiptRef}
          >
            <div className="font-bold text-lg mb-4">Order Details</div>
            <div className="mb-2 flex justify-between">
              <span className="font-medium">Order ID:</span>{" "}
              <span>{order?.orderId || "-"}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <span className="font-medium">Date:</span>{" "}
              <span>{formatDate(order?.createdAt)}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <span className="font-medium">Time:</span>{" "}
              <span>{formatTime(order?.createdAt)}</span>
            </div>
            <div className="mb-2 flex justify-between">
              <span className="font-medium">Payment Method:</span>{" "}
              <span>
                {getPaymentMethodLabel(order?.paymentMethod || paymentMethod)}
              </span>
            </div>
            <div className="font-bold mt-4 mb-2">Items Ordered:</div>
            {order?.items && order.items.length > 0 ? (
              order.items.map((item, idx) => (
                <div
                  key={item.name || idx}
                  className="flex justify-between mb-1"
                >
                  <span>
                    {item.name}{" "}
                    <span className="text-xs text-gray-500">
                      Quantity: {item.qty}
                    </span>
                  </span>
                  <span>Rs.{(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))
            ) : (
              <div className="text-gray-500">No items</div>
            )}
            <div className="flex justify-between border-t pt-4 mt-4">
              <span className="font-bold text-lg">Total Paid:</span>
              <span className="font-bold text-lg">
                Rs.{order?.total?.toLocaleString() || "-"}
              </span>
            </div>
          </div>
          {/* Next Steps */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="bg-white rounded-xl shadow p-6">
              <div className="font-bold text-lg mb-2">Next Steps</div>
              <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                <div className="flex items-center gap-2 font-bold text-green-800 mb-1">
                  <FiCheckCircle className="text-green-600" />
                  <span>Payment Complete:</span>
                </div>
                <ul className="text-green-800 text-sm list-disc ml-6">
                  <li>Your order is being prepared</li>
                  <li>Visit the Academy Bar for pickup</li>
                  <li>Show this confirmation to staff</li>
                  <li>Estimated pickup time: 5-10 minutes</li>
                </ul>
              </div>
              <button
                onClick={handleDownload}
                className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2 px-4 rounded-xl mb-2"
              >
                Download Receipt
              </button>
              <div className="flex gap-2">
                <Link
                  to="/cadet/menu"
                  className="flex-1 bg-green-100 hover:bg-green-200 text-green-800 font-semibold py-2 px-4 rounded-xl text-center"
                >
                  Order More
                </Link>
                <Link
                  to="/cadet/dashboard"
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-xl text-center"
                >
                  Dashboard
                </Link>
              </div>
            </div>
            {/* QR code section removed */}
            {/* Updated Allowance */}
            <div className="bg-[#183153] rounded-xl p-6 text-white flex flex-col items-center">
              <div className="font-bold text-lg mb-2">
                Updated Monthly Allowance
              </div>
              <div className="text-4xl font-bold mb-1">
                {`Rs.${Number(user?.monthlyAllowance ?? 0).toLocaleString()}`}
              </div>
              <div className="text-xs text-blue-100 mb-1">
                Remaining Monthly Allowance
              </div>
              <div className="text-base text-blue-100">
                {(() => {
                  const used = Number(user?.totalSpent ?? 0);
                  const baseLimit =
                    (alerts?.baseLimit ??
                      Number(user?.monthlyAllowance ?? 0) +
                        Number(user?.totalSpent ?? 0)) ||
                    15000;
                  return `Rs.${used.toLocaleString()} of Rs.${baseLimit.toLocaleString()} used this month`;
                })()}
              </div>
            </div>
          </div>
        </div>
        {/* Back to Home button moved to top-right */}
      </div>
    </div>
  );
}
