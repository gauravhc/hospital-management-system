"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  emitAuthChange,
  readStoredUser,
  subscribeToAuthChanges,
} from "@/lib/authStore";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const user = useSyncExternalStore(
    subscribeToAuthChanges,
    readStoredUser,
    () => null
  );

  const loading = false;

  const login = ({
    token,
    role,
    username,
    email,
    id,
    hospitalId,
    name,
    profile_image,
    profile_image_url,
  }) => {
    const resolvedEmail = email || username || "";
    const userData = {
      role,
      username: username || resolvedEmail,
      email: resolvedEmail,
      id,
      hospital_id: hospitalId ?? null,
      name: name || null,
      profile_image: profile_image || "",
      profile_image_url: profile_image_url || "",
    };

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    // Backward-compatible keys used by existing dashboard pages.
    localStorage.setItem("role", role || "");
    localStorage.setItem("username", userData.username || "");
    localStorage.setItem("id", id ? String(id) : "");
    localStorage.setItem("hospital_id", hospitalId ? String(hospitalId) : "");

    document.cookie = `token=${token}; path=/`;
    emitAuthChange();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("id");
    localStorage.removeItem("hospital_id");

    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    emitAuthChange();
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

