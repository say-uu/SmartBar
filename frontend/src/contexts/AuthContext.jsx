import React, { createContext, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [role, setRole] = useState(localStorage.getItem("role"));
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [firstLoginFlag, setFirstLoginFlag] = useState(false);

  useEffect(() => {
    if (token) {
      setRole(localStorage.getItem("role"));
      // Restore user from localStorage if not already set
      if (!user) {
        const stored = localStorage.getItem("user");
        if (stored) setUser(JSON.parse(stored));
      }
    } else {
      setUser(null);
      setRole(null);
    }
  }, [token]);

  const login = async (credentials, loginRole) => {
    const res = await axiosClient.post("/api/auth/login", credentials);
    setToken(res.data.token);
    setRole(loginRole);
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("role", loginRole);
    // Capture first login indicator from login response (before fetching profile)
    if (res.data?.user?.firstLoginWasTrue) {
      setFirstLoginFlag(true);
      localStorage.setItem("firstLoginFlag", "true");
    } else {
      setFirstLoginFlag(false);
      localStorage.removeItem("firstLoginFlag");
    }
    // Always fetch latest profile after login to get correct allowance
    const profileRes = await axiosClient.get("/api/auth/profile");
    setUser(profileRes.data);
    localStorage.setItem("user", JSON.stringify(profileRes.data));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setRole(null);
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
  };

  const restoreFromStorage = () => {
    setToken(localStorage.getItem("token"));
    setRole(localStorage.getItem("role"));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        role,
        token,
        login,
        logout,
        restoreFromStorage,
        firstLoginFlag,
        setFirstLoginFlag,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
