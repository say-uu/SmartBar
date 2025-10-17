import React, { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function PrivateRoute({ children, role }) {
  const { token, role: sessionRole } = useContext(AuthContext);
  // If no token at all, redirect to correct login based on desired role
  if (!token) {
    const loginPath = role === "manager" ? "/manager/login" : "/cadet/login";
    return <Navigate to={loginPath} replace />;
  }
  // If role is specified and doesn't match session, block access
  if (role && sessionRole && role !== sessionRole) {
    const loginPath = role === "manager" ? "/manager/login" : "/cadet/login";
    return <Navigate to={loginPath} replace />;
  }
  return children;
}
