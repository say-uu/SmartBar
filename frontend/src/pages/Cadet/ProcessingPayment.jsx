import React, { useEffect, useState, useContext } from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useNavigate, useLocation } from "react-router-dom";
import { CartContext } from "../../contexts/CartContext";
import { AuthContext } from "../../contexts/AuthContext";

const steps = [
  "Validating payment method...",
  "Processing transaction...",
  "Updating account balance...",
  "Generating receipt...",
];

export default function ProcessingPayment() {
  // Helper to display payment method in friendly format
  const getPaymentMethodLabel = (method) => {
    if (!method) return "Unknown";
    const m = method.toLowerCase();
    if (m.includes("allowance")) return "Monthly Allowance";
    if (m.includes("credit")) return "Credit Card";
    if (m.includes("cash")) return "Cash";
    return method;
  };
  const navigate = useNavigate();
  const location = useLocation();
  const { items, total } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(0);
  const [showBill, setShowBill] = useState(false);

  // Get payment data from navigation state
  const paymentMethod = location.state?.paymentMethod || "Monthly Allowance";
  const cardDetails = location.state?.cardDetails || null;
  useEffect(() => {
    console.log(
      "[ProcessingPayment.jsx] paymentMethod=",
      paymentMethod,
      cardDetails
    );
  }, [paymentMethod, cardDetails]);
  const orderTotal = total();

  useEffect(() => {
    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStep((s) => s + 1);
      }, 700);
      return () => clearTimeout(timer);
    } else {
      // Show bill for 1.2s, then navigate
      setShowBill(true);
      const timer = setTimeout(() => {
        navigate("/cadet/purchase-success", {
          state: { paymentMethod, cardDetails },
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentStep, navigate, paymentMethod, cardDetails]);

  // Progress bar width
  const progress = (currentStep / steps.length) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-10 flex flex-col items-center w-full max-w-md">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            {showBill || currentStep === steps.length ? (
              <FiCheckCircle className="text-green-600 text-5xl" />
            ) : (
              <svg
                className="animate-spin h-10 w-10 text-green-600"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z"
                />
              </svg>
            )}
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {showBill ? "Payment Complete" : "Processing Payment"}
        </h2>
        <div className="text-gray-600 mb-6">
          {showBill
            ? "Your payment has been processed."
            : "Please wait while we process your order..."}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        {!showBill ? (
          <ul className="text-left w-full text-gray-700 space-y-2">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span
                  className={`inline-block w-3 h-3 rounded-full transition-all duration-300 ${
                    idx < currentStep
                      ? "bg-green-500"
                      : idx === currentStep
                      ? "bg-green-300 animate-pulse"
                      : "bg-gray-300"
                  }`}
                ></span>
                <span
                  className={
                    idx < currentStep ? "text-green-700 font-semibold" : ""
                  }
                >
                  {step}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="w-full mt-4">
            <div className="font-bold text-lg mb-2">Bill / Receipt</div>
            <div className="mb-2 flex justify-between">
              <span className="font-medium">Payment Method:</span>
              <span>{getPaymentMethodLabel(paymentMethod)}</span>
            </div>
            <div className="font-bold mt-2 mb-1">Items:</div>
            {items.length === 0 ? (
              <div className="text-gray-500">No items</div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={item.name || idx}
                  className="flex justify-between mb-1"
                >
                  <span>
                    {item.name}{" "}
                    <span className="text-xs text-gray-500">x{item.qty}</span>
                  </span>
                  <span>Rs.{(item.price * item.qty).toLocaleString()}</span>
                </div>
              ))
            )}
            <div className="flex justify-between border-t pt-3 mt-3">
              <span className="font-bold">Total:</span>
              <span className="font-bold">
                Rs.{orderTotal.toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
