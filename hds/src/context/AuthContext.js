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

  const setCookie = (name, value, { expires, path = "/", sameSite = "Lax" } = {}) => {
    if (typeof document === "undefined") return;
    const parts = [`${name}=${encodeURIComponent(value)}`, `path=${path}`, `SameSite=${sameSite}`];
    if (expires) parts.push(`expires=${expires.toUTCString()}`);
    try {
      if (typeof window !== "undefined" && window.location?.protocol === "https:") {
        parts.push("Secure");
      }
    } catch {
      // ignore
    }
    document.cookie = parts.join("; ");
  };

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

    setCookie("token", token);
    setCookie("role", role || "");

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log("[auth] stored token:", Boolean(token));
      // eslint-disable-next-line no-console
      console.log("[auth] stored role:", role || "");
    }
    emitAuthChange();
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    localStorage.removeItem("username");
    localStorage.removeItem("id");
    localStorage.removeItem("hospital_id");

    const expired = new Date(0);
    setCookie("token", "", { expires: expired });
    setCookie("role", "", { expires: expired });
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
