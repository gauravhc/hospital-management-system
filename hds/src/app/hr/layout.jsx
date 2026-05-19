"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import HRSidebar from "@/components/hr/HRSidebar";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/hr" },
  { name: "Staff", href: "/hr/staff" },
  { name: "Attendance", href: "/hr/attendance" },
  { name: "Payroll", href: "/hr/payroll" },
  { name: "Leave", href: "/hr/leave" },
];

export default function HRLayout({ children }) {
  const router = useRouter();

  const auth = useMemo(() => {
    if (typeof window === "undefined") return { checked: false, allowed: false, username: "" };

    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const username = localStorage.getItem("username") || "";

    const allowed =
      Boolean(token) &&
      (role === "hr" ||
        role === "hrmanager" ||
        role === "hospital_admin" ||
        role === "admin" ||
        role === "super_admin");

    return { checked: true, allowed, username };
  }, []);

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="hidden md:block">
        <HRSidebar username={auth.username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="HR Manager" username={auth.username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
