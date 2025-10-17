import React, { useContext } from "react";
import {
  FiInfo,
  FiCheckCircle,
  FiXCircle,
  FiLock,
  FiDollarSign,
  FiCreditCard,
  FiArrowLeft,
  FiCheck,
} from "react-icons/fi";
import { Link, useNavigate } from "react-router-dom";
import { CartContext } from "../../contexts/CartContext";
import { AuthContext } from "../../contexts/AuthContext";

export default function Payment() {
  const { items, total } = useContext(CartContext);
  const { user } = useContext(AuthContext);
  const monthlyAllowance = user?.monthlyAllowance ?? 0;
  const orderTotal = total();
  const allowanceSufficient = monthlyAllowance >= orderTotal;
  const exceeded = !allowanceSufficient;
  // Split payment logic
  const allowanceUsed = Math.min(orderTotal, monthlyAllowance);
  const cashOrCardDue = Math.max(0, orderTotal - monthlyAllowance);
  const [paymentMethod, setPaymentMethod] = React.useState(
    allowanceSufficient ? "Monthly Allowance" : ""
  );
  const [cardDetails, setCardDetails] = React.useState({
    number: "",
    name: "",
    expiry: "",
    cvc: "",
  });
  const [showCardForm, setShowCardForm] = React.useState(false);
  const navigate = useNavigate();

  const handleCompletePayment = () => {
    // Ensure payment method is a string, not an object
    let method = paymentMethod;
    if (typeof method === "object" && method !== null) {
      method = method.paymentMethod || "";
    }
    if (!method) {
      if (!exceeded) {
        method = "Monthly Allowance";
      } else {
        method = "Cash";
      }
    }
    console.log(
      "[Payment.jsx] handleCompletePayment: paymentMethod=",
      method,
      cardDetails
    );
    navigate("/cadet/processing-payment", {
      state: {
        paymentMethod: method,
        cardDetails,
        allowanceUsed,
        cashOrCardDue,
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-8">
          {/* Left: Payment Methods */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Payment</h2>
            <div className="mb-6">
              <div className="bg-gray-100 rounded-xl p-4 flex items-start gap-3 text-gray-700 text-base">
                <FiInfo className="text-blue-600 text-xl mt-0.5" />
                <div>
                  <div className="font-bold text-gray-900 mb-0.5">
                    Academy Payment Policy
                  </div>
                  <div className="text-sm leading-relaxed">
                    Cadets must use their monthly allowance first. Cash and card
                    payments are only available when monthly allowance is
                    exhausted (balance: Rs.0.00).
                  </div>
                </div>
              </div>
            </div>
            {/* Monthly Allowance Status Message */}
            {allowanceSufficient ? (
              <div className="bg-green-50 border border-green-400 rounded-xl p-4 mb-6 flex items-start gap-3">
                <FiCheckCircle className="text-green-600 text-2xl mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-green-800 mb-0.5">
                    Monthly Allowance Sufficient
                  </div>
                  <div className="text-green-800">
                    You can proceed with your current monthly allowance.
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-400 rounded-xl p-4 mb-6 flex items-start gap-3">
                <FiXCircle className="text-red-600 text-2xl mt-0.5" />
                <div className="text-sm">
                  <div className="font-bold text-red-800 mb-0.5">
                    Monthly Allowance Insufficient
                  </div>
                  <div className="text-red-800">
                    You have exceeded your monthly allowance. Credit card and
                    cash payments are now available.
                  </div>
                </div>
              </div>
            )}
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <div className="font-semibold text-lg mb-4">
                Select Payment Method
              </div>
              {/* Monthly Allowance Option */}
              <div
                className={`border-2 rounded-xl p-4 mb-4 flex items-center gap-4 ${
                  allowanceSufficient
                    ? "border-blue-900 bg-blue-50 cursor-pointer"
                    : "border-gray-300 bg-gray-50 opacity-60 pointer-events-none"
                }`}
                onClick={() => {
                  if (allowanceSufficient)
                    setPaymentMethod("Monthly Allowance");
                  setShowCardForm(false);
                }}
              >
                <div className="flex-1">
                  <div
                    className={`font-bold text-lg ${
                      !exceeded ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    Monthly Allowance
                  </div>
                  <div className="text-gray-700 text-sm">
                    Use your monthly cadet credit balance
                  </div>
                  <div
                    className={`font-bold mt-1 ${
                      !exceeded ? "text-green-700" : "text-gray-500"
                    }`}
                  >
                    Available: Rs.{monthlyAllowance.toLocaleString()}
                  </div>
                </div>
                {allowanceSufficient &&
                  paymentMethod === "Monthly Allowance" && (
                    <FiCheck className="text-blue-900 text-2xl" />
                  )}
                {!allowanceSufficient && (
                  <FiLock className="text-gray-400 text-2xl" />
                )}
              </div>
              {/* Cash Payment Option */}
              <div
                className={`border-2 rounded-xl p-4 mb-4 flex items-center gap-4 ${
                  !allowanceSufficient
                    ? "border-green-400 bg-green-50 cursor-pointer"
                    : "border-gray-300 bg-gray-50 opacity-60 pointer-events-none"
                }`}
                onClick={() => {
                  if (!allowanceSufficient) setPaymentMethod("Cash");
                  setShowCardForm(false);
                }}
              >
                <div className="flex-1">
                  <div
                    className={`font-bold text-lg ${
                      exceeded ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    Cash Payment
                  </div>
                  <div className="text-gray-500 text-sm">
                    Pay with cash at pickup
                  </div>
                  {!exceeded && (
                    <div className="text-red-600 font-semibold mt-1">
                      Must exhaust monthly allowance first
                    </div>
                  )}
                  {!exceeded && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2 text-xs text-red-700">
                      <span className="font-bold">Academy Policy:</span> This
                      payment method will become available when your monthly
                      allowance reaches Rs.0.00. Current balance: Rs. Rs.
                      {monthlyAllowance.toLocaleString()}
                    </div>
                  )}
                  {/* Percentage of allowance used */}
                  <div className="text-xs text-blue-700 mb-1">
                    {monthlyAllowance > 0
                      ? `${Math.min(
                          100,
                          ((orderTotal / monthlyAllowance) * 100).toFixed(1)
                        )}% of allowance used`
                      : "0% of allowance used"}
                  </div>
                  <div className="text-base text-blue-900">
                    After Purchase:{" "}
                    <span className="font-bold">
                      Rs.
                      {Math.max(
                        0,
                        monthlyAllowance - orderTotal
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
                {!allowanceSufficient && paymentMethod === "Cash" && (
                  <FiCheck className="text-green-700 text-2xl" />
                )}
                {allowanceSufficient && (
                  <FiLock className="text-gray-400 text-2xl" />
                )}
              </div>
              {/* Credit/Debit Card Option */}
              <div
                className={`border-2 rounded-xl p-4 flex items-center gap-4 ${
                  !allowanceSufficient
                    ? "border-green-400 bg-green-50 cursor-pointer"
                    : "border-gray-300 bg-gray-50 opacity-60 pointer-events-none"
                }`}
                onClick={() => {
                  if (!allowanceSufficient) {
                    setPaymentMethod("Credit Card");
                    setShowCardForm(true);
                  }
                }}
              >
                <div className="flex-1">
                  <div
                    className={`font-bold text-lg ${
                      exceeded ? "text-green-700" : "text-gray-700"
                    }`}
                  >
                    Credit/Debit Card
                  </div>
                  <div className="text-gray-500 text-sm">
                    Pay with your personal card
                  </div>
                  {!exceeded && (
                    <div className="text-red-600 font-semibold mt-1">
                      Must exhaust monthly allowance first
                    </div>
                  )}
                  {!exceeded && (
                    <div className="bg-red-50 border border-red-200 rounded p-2 mt-2 text-xs text-red-700">
                      <span className="font-bold">Academy Policy:</span> This
                      payment method will become available when your monthly
                      allowance reaches Rs.0.00. Current balance: Rs.
                      {monthlyAllowance.toLocaleString()}
                    </div>
                  )}
                </div>
                {!allowanceSufficient && paymentMethod === "Credit Card" && (
                  <FiCheck className="text-green-700 text-2xl" />
                )}
                {allowanceSufficient && (
                  <FiLock className="text-gray-400 text-2xl" />
                )}
              </div>
              {/* Credit Card Form */}
              {!allowanceSufficient && paymentMethod === "Credit Card" && (
                <div className="bg-white border border-green-400 rounded-xl p-4 mt-4">
                  <div className="font-semibold mb-2">Enter Card Details</div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      className="border rounded px-3 py-2"
                      placeholder="Card Number"
                      maxLength={19}
                      value={cardDetails.number}
                      onChange={(e) =>
                        setCardDetails({
                          ...cardDetails,
                          number: e.target.value,
                        })
                      }
                    />
                    <input
                      type="text"
                      className="border rounded px-3 py-2"
                      placeholder="Name on Card"
                      value={cardDetails.name}
                      onChange={(e) =>
                        setCardDetails({ ...cardDetails, name: e.target.value })
                      }
                    />
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="border rounded px-3 py-2 w-1/2"
                        placeholder="MM/YY"
                        maxLength={5}
                        value={cardDetails.expiry}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            expiry: e.target.value,
                          })
                        }
                      />
                      <input
                        type="text"
                        className="border rounded px-3 py-2 w-1/2"
                        placeholder="CVC"
                        maxLength={4}
                        value={cardDetails.cvc}
                        onChange={(e) =>
                          setCardDetails({
                            ...cardDetails,
                            cvc: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
              {/* Red warning if exceeded */}
              {exceeded && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mt-4 text-red-700 font-semibold">
                  You have exceeded the monthly allowance. Cash and credit card
                  payment methods are now available.
                </div>
              )}
            </div>
            {!exceeded ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-8">
                <div className="flex items-center gap-2 mb-2 font-bold text-green-800">
                  <FiCheckCircle />
                  <span>Monthly Allowance Sufficient:</span>
                </div>
                <div className="text-green-800 text-base">
                  This purchase can be completed using your monthly allowance.
                  Remaining after purchase: Rs.
                  {Math.max(0, monthlyAllowance - orderTotal).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6 mt-8">
                <div className="flex items-center gap-2 mb-2 font-bold text-red-700">
                  <FiXCircle />
                  <span>Monthly Allowance Exceeded:</span>
                </div>
                <div className="text-red-700 text-base">
                  You have exceeded the monthly allowance. Cash and credit card
                  payment methods are now available.
                </div>
              </div>
            )}
            <div className="mt-8">
              <button
                onClick={handleCompletePayment}
                className={`inline-flex items-center rounded-xl px-6 py-3 font-medium text-white text-lg gap-2 ${
                  (!exceeded && paymentMethod === "Monthly Allowance") ||
                  (exceeded && paymentMethod)
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
                disabled={
                  (!exceeded && paymentMethod !== "Monthly Allowance") ||
                  (exceeded && !paymentMethod) ||
                  (exceeded &&
                    paymentMethod === "Credit Card" &&
                    (!cardDetails.number ||
                      !cardDetails.name ||
                      !cardDetails.expiry ||
                      !cardDetails.cvc))
                }
              >
                <FiCheck /> Complete Payment
              </button>
            </div>
            <div className="mt-4">
              <Link
                to="/cadet/cart"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline"
              >
                <FiArrowLeft /> Back to Cart
              </Link>
            </div>
          </div>
          {/* Right: Order Summary */}
          <div className="w-full md:w-96 mt-8 md:mt-0">
            <div className="bg-white rounded-xl shadow p-6 mb-6">
              <div className="font-bold text-lg mb-4">Order Summary</div>
              {items.map((item, idx) => (
                <div
                  key={item.name || idx}
                  className="flex justify-between items-center mb-2"
                >
                  <div>
                    <div className="font-semibold text-gray-900">
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-500">Qty: {item.qty}</div>
                  </div>
                  <div className="font-bold text-gray-900">
                    Rs.{(item.price * item.qty).toLocaleString()}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-4 mt-4">
                <div className="font-bold text-lg">Total:</div>
                <div className="font-bold text-lg">
                  Rs.{orderTotal.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-2 text-blue-900 font-bold">
                <FiDollarSign />
                <span>Current Monthly Allowance</span>
              </div>
              <div className="text-3xl font-bold text-blue-900 mb-1">
                Rs.{monthlyAllowance.toLocaleString()}
              </div>
              <div className="text-xs text-blue-700 mb-1">
                {monthlyAllowance > 0
                  ? `${Math.min(
                      100,
                      ((orderTotal / monthlyAllowance) * 100).toFixed(1)
                    )}% of allowance used`
                  : "0% of allowance used"}
              </div>
              <div className="text-base text-blue-900">
                After Purchase:{" "}
                <span className="font-bold">
                  Rs.
                  {Math.max(0, monthlyAllowance - orderTotal).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
