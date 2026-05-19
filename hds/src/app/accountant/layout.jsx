"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/accountant" },
  { name: "Invoices", href: "/accountant/invoices" },
  { name: "Collections", href: "/accountant/collections" },
  { name: "Reports", href: "/accountant/reports" },
];

export default function AccountantLayout({ children }) {
  const router = useRouter();

  const auth = useMemo(() => {
    if (typeof window === "undefined") return { checked: false, allowed: false };
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();

    const allowed =
      Boolean(token) &&
      (role.includes("account") || role.includes("admin") || role.includes("super_admin"));

    return { checked: true, allowed };
  }, []);

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
