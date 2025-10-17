import React, { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CartContext } from "../../contexts/CartContext";
import { AuthContext } from "../../contexts/AuthContext"; // <-- add this

export default function Cart() {
  const { user } = useContext(AuthContext);
  const { items, updateQty, removeItem, total } = useContext(CartContext);
  // Always use backend value for monthlyAllowance
  const monthlyAllowance = user?.monthlyAllowance ?? 0;
  const orderTotal = total();
  // Show green if allowance covers order, red if not
  const allowanceSufficient = monthlyAllowance >= orderTotal;
  const navigate = useNavigate();
  const handleProceedToPayment = () => {
    navigate("/cadet/payment", {
      state: { orderTotal, monthlyAllowance },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-gray-900">Your Order</h2>
        <div className="mb-8">
          <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3 text-gray-700 text-base">
            <span className="font-bold text-lg">
              ℹ️ Academy Payment Policy:
            </span>
            <span>
              Monthly allowance must be used first. Cash and card payments
              become available when allowance reaches Rs.0.00.
            </span>
          </div>
        </div>
        {items.length === 0 ? (
          <>
            <div className="text-gray-500 mb-8">Your cart is empty.</div>
            {/* Show current monthly allowance if cart is empty */}
          </>
        ) : (
          <div className="space-y-6 mb-8">
            {items.map((item) => (
              <div
                key={item.name}
                className="flex items-center gap-4 bg-white rounded-xl shadow p-4 border-b"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded"
                />
                <div className="flex-1">
                  <div className="font-bold text-lg text-gray-900">
                    {item.name}
                  </div>
                  <div className="font-bold text-blue-900 text-base mb-2">
                    Rs.{item.price.toLocaleString()} each
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold"
                      onClick={() =>
                        updateQty(item.name, Math.max(1, item.qty - 1))
                      }
                      disabled={item.qty <= 1}
                    >
                      -
                    </button>
                    <span>{item.qty}</span>
                    <button
                      className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold"
                      onClick={() => updateQty(item.name, item.qty + 1)}
                    >
                      +
                    </button>
                    <button
                      className="ml-4 px-2 py-1 rounded bg-red-100 text-red-700 font-bold"
                      onClick={() => removeItem(item.name)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="font-bold text-blue-700 text-xl min-w-[80px] text-right">
                  Rs.{(item.price * item.qty).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
        {/* Order Summary Section */}
        <div className="w-full bg-[#183153] rounded-2xl p-8 mt-8 shadow-lg flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
            <div className="text-white text-2xl font-bold mb-2 md:mb-0">
              Order Total:
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                Rs.{orderTotal.toLocaleString()}
              </span>
            </div>
          </div>
          {allowanceSufficient && (
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div className="text-white text-lg font-medium">
                Monthly Allowance Left:
              </div>
              <div className="text-2xl font-bold text-[#00ffae]">
                Rs.{(monthlyAllowance - orderTotal).toLocaleString()}
              </div>
            </div>
          )}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <button
              className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-xl text-lg flex items-center justify-center gap-2 transition"
              onClick={handleProceedToPayment}
              disabled={items.length === 0}
            >
              <span>✔️</span> Proceed to Payment
            </button>
          </div>
          {!allowanceSufficient && (
            <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-700 border border-red-300">
              <div className="flex items-center gap-2 mb-1 font-bold">
                <span>❌</span>
                <span>Monthly Allowance Insufficient:</span>
              </div>
              <div className="text-base text-red-700">
                You have exceeded your monthly allowance. Credit card and cash
                payments are now available.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
