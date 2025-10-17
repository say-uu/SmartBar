import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import CadetLogin from "./pages/Cadet/Login.jsx";
import CadetRegister from "./pages/Cadet/Register.jsx";
import CadetForgotPassword from "./pages/Cadet/ForgotPassword.jsx";
import CadetDashboard from "./pages/Cadet/Dashboard.jsx";
import BrowseMenu from "./pages/Cadet/BrowseMenu.jsx";
import Cart from "./pages/Cadet/Cart.jsx";
import Payment from "./pages/Cadet/Payment.jsx";
import PurchaseSuccess from "./pages/Cadet/PurchaseSuccess.jsx";
import PurchaseHistory from "./pages/Cadet/PurchaseHistory.jsx";
import Profile from "./pages/Cadet/Profile.jsx";
import ProfileSettings from "./pages/Cadet/ProfileSettings.jsx";
import ProcessingPayment from "./pages/Cadet/ProcessingPayment.jsx";
import ManagerLogin from "./pages/Manager/Login.jsx";
import ManagerRegister from "./pages/Manager/Register.jsx";
import ManagerResetPassword from "./pages/Manager/ResetPassword.jsx";
import ManagerDashboard from "./pages/Manager/Dashboard.jsx";
import ManageInventory from "./pages/Manager/ManageInventory.jsx";
import ViewCadets from "./pages/Manager/ViewCadets.jsx";
import Reports from "./pages/Manager/Reports.jsx";
import SystemSettings from "./pages/Manager/SystemSettings.jsx";
import PrivateRoute from "./routes/PrivateRoute";

function AppInner() {
  const location = useLocation();
  // Chat assistant removed
  return (
    <>
      {/* ChatAssistant hidden */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/cadet/login" element={<CadetLogin />} />
        <Route path="/cadet/register" element={<CadetRegister />} />
        <Route
          path="/cadet/forgot-password"
          element={<CadetForgotPassword />}
        />
        <Route
          path="/cadet/dashboard"
          element={
            <PrivateRoute role="cadet">
              <CadetDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/menu"
          element={
            <PrivateRoute role="cadet">
              <BrowseMenu />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/cart"
          element={
            <PrivateRoute role="cadet">
              <Cart />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/payment"
          element={
            <PrivateRoute role="cadet">
              <Payment />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/purchase-success"
          element={
            <PrivateRoute role="cadet">
              <PurchaseSuccess />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/history"
          element={
            <PrivateRoute role="cadet">
              <PurchaseHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/profile"
          element={
            <PrivateRoute role="cadet">
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/profile/settings"
          element={
            <PrivateRoute role="cadet">
              <ProfileSettings />
            </PrivateRoute>
          }
        />
        <Route
          path="/cadet/processing-payment"
          element={
            <PrivateRoute role="cadet">
              <ProcessingPayment />
            </PrivateRoute>
          }
        />
        <Route path="/manager/login" element={<ManagerLogin />} />
        <Route path="/manager/register" element={<ManagerRegister />} />
        <Route
          path="/manager/reset-password"
          element={<ManagerResetPassword />}
        />
        <Route
          path="/manager/dashboard"
          element={
            <PrivateRoute role="manager">
              <ManagerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/inventory"
          element={
            <PrivateRoute role="manager">
              <ManageInventory />
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/cadets"
          element={
            <PrivateRoute role="manager">
              <ViewCadets />
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/reports"
          element={
            <PrivateRoute role="manager">
              <Reports />
            </PrivateRoute>
          }
        />
        <Route
          path="/manager/settings"
          element={
            <PrivateRoute role="manager">
              <SystemSettings />
            </PrivateRoute>
          }
        />
        {/** Pickup scanner route removed (QR feature deprecated) **/}
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}
