"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const subscribeToAccountantAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "role") callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

let cachedAccountantToken = null;
let cachedAccountantRole = null;
let cachedAccountantSnapshot = null;

const readAccountantAuthSnapshot = () => {
  if (typeof window === "undefined") return SERVER_ACCOUNTANT_AUTH_SNAPSHOT;
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (token === cachedAccountantToken && role === cachedAccountantRole && cachedAccountantSnapshot) {
    return cachedAccountantSnapshot;
  }

  const allowed =
    Boolean(token) &&
    (role.includes("account") || role.includes("admin") || role.includes("super_admin"));

  cachedAccountantToken = token;
  cachedAccountantRole = role;
  cachedAccountantSnapshot = { checked: true, allowed };
  return cachedAccountantSnapshot;
};

const SERVER_ACCOUNTANT_AUTH_SNAPSHOT = { checked: false, allowed: false };
const readServerAccountantAuthSnapshot = () => SERVER_ACCOUNTANT_AUTH_SNAPSHOT;

const NAV_ITEMS = [
  { name: "Dashboard", href: "/accountant" },
  { name: "Invoices", href: "/accountant/invoices" },
  { name: "Collections", href: "/accountant/collections" },
  { name: "Reports", href: "/accountant/reports" },
];

export default function AccountantLayout({ children }) {
  const router = useRouter();

  const auth = useSyncExternalStore(
    subscribeToAccountantAuthChanges,
    readAccountantAuthSnapshot,
    readServerAccountantAuthSnapshot
  );

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <DashboardLayout role="accountant" navItems={NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
