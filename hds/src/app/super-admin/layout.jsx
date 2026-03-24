"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/super-admin" },
  { name: "Manage Users", href: "/super-admin/users" },
  { name: "Create User", href: "/super-admin/users/create" },
];

export default function Layout({ children }) {
  return (
    <DashboardLayout role="super_admin" navItems={NAV_ITEMS}>
      {children}
    </DashboardLayout>
  );
}
