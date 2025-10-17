import React from "react";
import { Link } from "react-router-dom";

/*
  Reusable auth links footer.
  Props:
    variant: 'cadet' | 'manager' (decides color scheme)
    className: extra wrapper classes
*/
export default function AuthLinks({ variant = "cadet", className = "" }) {
  const isCadet = variant === "cadet";
  const baseColor = isCadet ? "text-blue-600" : "text-[#b85c00]";
  const hoverColor = isCadet ? "hover:text-blue-700" : "hover:text-[#8d6242]";
  const registerPath = isCadet ? "/cadet/register" : "/manager/register";
  const forgotPath = isCadet
    ? "/cadet/forgot-password"
    : "/manager/forgot-password";

  return (
    <div className={`mt-8 ${className}`}>
      <nav
        aria-label="Authentication Links"
        className="flex flex-col items-center gap-3 text-sm"
      >
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-gray-700">
          <span className="text-gray-600">Don't have an account?</span>
          <Link
            to={registerPath}
            className={`${baseColor} ${hoverColor} font-semibold transition-colors underline-offset-4 hover:underline`}
          >
            Sign up
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to={forgotPath}
            className={`${baseColor} ${hoverColor} transition-colors text-sm underline-offset-4 hover:underline`}
          >
            Forgot Password?
          </Link>
          <span
            className="hidden sm:inline text-gray-300 select-none"
            aria-hidden="true"
          >
            |
          </span>
          <Link
            to="/"
            className="text-gray-500 hover:text-gray-700 transition-colors text-sm underline-offset-4 hover:underline"
          >
            Back to Home
          </Link>
        </div>
      </nav>
    </div>
  );
}
