"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const subscribeToRegisterAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "role") callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

let cachedRegisterToken = null;
let cachedRegisterRole = null;
let cachedRegisterSnapshot = null;

const readRegisterAuthSnapshot = () => {
  if (typeof window === "undefined") return SERVER_REGISTER_AUTH_SNAPSHOT;

  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (token === cachedRegisterToken && role === cachedRegisterRole && cachedRegisterSnapshot) {
    return cachedRegisterSnapshot;
  }

  const allowed =
    Boolean(token) &&
    (role.includes("register") ||
      role.includes("front") ||
      role.includes("desk") ||
      role.includes("reception") ||
      role.includes("admin"));

  cachedRegisterToken = token;
  cachedRegisterRole = role;
  cachedRegisterSnapshot = { checked: true, allowed };
  return cachedRegisterSnapshot;
};

const SERVER_REGISTER_AUTH_SNAPSHOT = { checked: false, allowed: false };
const readServerRegisterAuthSnapshot = () => SERVER_REGISTER_AUTH_SNAPSHOT;

const NAV_ITEMS = [
  { name: "Dashboard", href: "/register" },
  { name: "New Patient", href: "/register/patient-create" },
  { name: "Appointments", href: "/register/registration" },
  { name: "Billing", href: "/register/billing" },
  { name: "Reports", href: "/register/report" },
  { name: "Notifications", href: "/register/notifications" },
];

export default function RegisterLayout({ children }) {
  const router = useRouter();

  const auth = useSyncExternalStore(
    subscribeToRegisterAuthChanges,
    readRegisterAuthSnapshot,
    readServerRegisterAuthSnapshot
  );

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <DashboardLayout role="register" navItems={NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
