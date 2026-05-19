"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

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

  const auth = useMemo(() => {
    if (typeof window === "undefined") return { checked: false, allowed: false };

    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();

    const allowed =
      Boolean(token) &&
      (role.includes("register") ||
        role.includes("front") ||
        role.includes("desk") ||
        role.includes("reception") ||
        role.includes("admin"));

    return { checked: true, allowed };
  }, []);

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
