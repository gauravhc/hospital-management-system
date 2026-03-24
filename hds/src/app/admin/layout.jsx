"use client";
import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/admin" },
    { name: "Manage Users", href: "/admin/users" },
    { name: "Create User", href: "/admin/create" },
    { name: "Ambulance", href: "/admin/ambulance" },
    { name: "Settings", href: "/admin/settings" },
];

export default function Layout({ children }) {
    return (
        <DashboardLayout role="admin" navItems={NAV_ITEMS}>
            {children}
        </DashboardLayout>
    );
}
