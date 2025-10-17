import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiHome,
  FiList,
  FiShoppingCart,
  FiFileText,
  FiSettings,
} from "react-icons/fi";

export default function CadetSidebar({ open = false, onClose } = {}) {
  const { pathname } = useLocation();

  const NavItem = ({ to, icon: Icon, label, onNavigate }) => {
    const active = pathname === to;
    return (
      <Link
        to={to}
        onClick={onNavigate}
        className={`flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] font-semibold transition-all border ${
          active
            ? "bg-white text-slate-900 border-slate-200 shadow-sm ring-1 ring-slate-200/70"
            : "text-slate-700 hover:bg-white/70 hover:shadow-sm border-transparent"
        }`}
      >
        <span className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center text-xl font-semibold">
          <Icon className="text-xl" />
        </span>
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-4 self-start">
        <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-3">
          <div className="text-[11px] font-semibold text-slate-500 px-1 mb-2">
            Navigation
          </div>
          <nav className="flex flex-col gap-2">
            <NavItem to="/cadet/dashboard" icon={FiHome} label="Dashboard" />
            <NavItem to="/cadet/menu" icon={FiList} label="Browse Menu" />
            <NavItem to="/cadet/cart" icon={FiShoppingCart} label="View Cart" />
            <NavItem
              to="/cadet/history"
              icon={FiFileText}
              label="Purchase History"
            />
            <NavItem
              to="/cadet/profile"
              icon={FiSettings}
              label="Profile Settings"
            />
          </nav>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 ${
          open ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          className={`fixed inset-0 bg-black/30 transition-opacity duration-200 ${
            open ? "opacity-100" : "opacity-0"
          }`}
          onClick={onClose}
        />
        {/* Panel */}
        <div
          className={`fixed top-0 left-0 h-full w-72 max-w-[85%] bg-white rounded-r-2xl shadow-xl transform transition-transform duration-300 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="text-sm font-semibold text-slate-600">
              Navigation
            </div>
            <button
              aria-label="Close navigation"
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <nav className="flex flex-col gap-2 p-3">
            <NavItem
              to="/cadet/dashboard"
              icon={FiHome}
              label="Dashboard"
              onNavigate={onClose}
            />
            <NavItem
              to="/cadet/menu"
              icon={FiList}
              label="Browse Menu"
              onNavigate={onClose}
            />
            <NavItem
              to="/cadet/cart"
              icon={FiShoppingCart}
              label="View Cart"
              onNavigate={onClose}
            />
            <NavItem
              to="/cadet/history"
              icon={FiFileText}
              label="Purchase History"
              onNavigate={onClose}
            />
            <NavItem
              to="/cadet/profile"
              icon={FiSettings}
              label="Profile Settings"
              onNavigate={onClose}
            />
          </nav>
        </div>
      </div>
    </>
  );
}
