"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/pharmacy" },
  { name: "Stock", href: "/pharmacy/stock" },
  { name: "Dispense", href: "/pharmacy/invoice" },
  { name: "History", href: "/pharmacy/history" },
];

export default function PharmacyLayout({ children }) {
  const router = useRouter();

  const auth = useMemo(() => {
    if (typeof window === "undefined") return { checked: false, allowed: false };
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();

    const allowed =
      Boolean(token) &&
      (role === "pharmacist" ||
        role === "admin" ||
        role === "hospital_admin" ||
        role === "super_admin");

    return { checked: true, allowed };
  }, []);

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
