"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const subscribeToPharmacyAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "role") callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

let cachedPharmacyToken = null;
let cachedPharmacyRole = null;
let cachedPharmacySnapshot = null;

const readPharmacyAuthSnapshot = () => {
  if (typeof window === "undefined") return SERVER_PHARMACY_AUTH_SNAPSHOT;
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (token === cachedPharmacyToken && role === cachedPharmacyRole && cachedPharmacySnapshot) {
    return cachedPharmacySnapshot;
  }

  const allowed =
    Boolean(token) &&
    (role === "pharmacist" ||
      role === "admin" ||
      role === "hospital_admin" ||
      role === "super_admin");

  cachedPharmacyToken = token;
  cachedPharmacyRole = role;
  cachedPharmacySnapshot = { checked: true, allowed };
  return cachedPharmacySnapshot;
};

const SERVER_PHARMACY_AUTH_SNAPSHOT = { checked: false, allowed: false };
const readServerPharmacyAuthSnapshot = () => SERVER_PHARMACY_AUTH_SNAPSHOT;

const NAV_ITEMS = [
  { name: "Dashboard", href: "/pharmacy" },
  { name: "Stock", href: "/pharmacy/stock" },
  { name: "Dispense", href: "/pharmacy/invoice" },
  { name: "History", href: "/pharmacy/history" },
];

export default function PharmacyLayout({ children }) {
  const router = useRouter();

  const auth = useSyncExternalStore(
    subscribeToPharmacyAuthChanges,
    readPharmacyAuthSnapshot,
    readServerPharmacyAuthSnapshot
  );

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <DashboardLayout role="pharmacist" navItems={NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
