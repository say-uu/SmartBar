import React from "react";
import { Link } from "react-router-dom";
import { FaUserCircle, FaChartBar } from "react-icons/fa";

export default function Home() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#232946] via-[#2d3a6b] to-[#1e3c72]">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        {/* Header Section */}
        <div className="w-full pt-16 pb-8 text-center flex flex-col items-center">
          <img src="/crest.png" alt="KDU Crest" className="h-20 mx-auto mb-4" />
          <h1 className="text-5xl font-extrabold text-white mb-4 drop-shadow-lg flex items-center justify-center gap-4">
            Welcome to Smartbar
          </h1>
          <p className="text-xl text-blue-100 mb-2">
            Bar Management System for Kothalawala Defence University Cadet Mess
          </p>
          <div className="flex justify-center gap-4 mb-2">
            <span className="text-yellow-400 font-semibold text-sm">
              Secure
            </span>
            <span className="text-yellow-400 font-semibold text-sm">
              Professional
            </span>
            <span className="text-yellow-400 font-semibold text-sm">
              Efficient
            </span>
          </div>
        </div>
        {/* Access Level Section */}
        <div className="w-full text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Choose Your Access Level
          </h2>
          <p className="text-base text-blue-100 mb-6">
            Select your role to access the appropriate interface with tailored
            features and permissions.
          </p>
        </div>
        <div className="w-full flex flex-col md:flex-row gap-8 justify-center items-stretch mb-12">
          {/* Cadet Access Card */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center min-w-[320px] max-w-md">
            <div className="mb-4 flex items-center gap-2">
              <FaUserCircle className="text-3xl text-blue-700" />
              <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
                Cadet Portal
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Cadet Access
            </h3>
            <p className="text-gray-500 mb-4 text-center">
              Access your personal account to manage credit, view purchase
              history, and browse available items.
            </p>
            <ul className="text-left text-gray-700 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> View monthly
                credit balance and spending
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Browse and
                purchase from cadet mess menu
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Access purchase
                history and receipts
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Payment options
                for exceeded limits
              </li>
            </ul>
            <Link
              to="/cadet/login"
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg text-center transition"
            >
              Enter as Cadet
            </Link>
          </div>
          {/* Manager Access Card */}
          <div className="flex-1 bg-white rounded-2xl shadow-xl p-8 flex flex-col items-center min-w-[320px] max-w-md">
            <div className="mb-4 flex items-center gap-2">
              <FaChartBar className="text-3xl text-rose-700" />
              <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-3 py-1 rounded-full">
                Admin Portal
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Bar Manager
            </h3>
            <p className="text-gray-500 mb-4 text-center">
              Administrative access to monitor operations, manage inventory, and
              oversee cadet accounts.
            </p>
            <ul className="text-left text-gray-700 space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Monitor all
                cadet spending and credit usage
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Inventory
                management and stock tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Generate
                comprehensive reports and analytics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">&#10003;</span> Manage pricing
                and menu availability
              </li>
            </ul>
            <Link
              to="/manager/login"
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-lg text-center transition"
            >
              Enter as Bar Manager
            </Link>
          </div>
        </div>
        {/* Footer Section */}
        <div className="w-full text-center py-6 text-gray-300 text-sm">
          &copy; 2025 Smartbar - Kothalawala Defence University Cadet Mess
          Management System. All rights reserved.
        </div>
      </div>
    </div>
  );
}
