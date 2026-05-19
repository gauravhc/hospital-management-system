"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/inventory" },
    { name: "Analytics Dashboard", href: "/inventory/analytics-dashboard" },
    { name: "Add Items", href: "/inventory/additems" },
    { name: "Manage Items", href: "/inventory/manageitems" },
    { name: "All Stocks", href: "/inventory/allstocks" },
    { name: "Stock Batch", href: "/inventory/stockbatch" },
    { name: "Expired Stocks", href: "/inventory/expired-stocks" },
    { name: "Low Stocks", href: "/inventory/low-stocks" },
    { name: "Auto Book", href: "/inventory/auto-book" },
];

export default function InventoryLayout({ children }) {
    const router = useRouter();

    const auth = useMemo(() => {
        if (typeof window === "undefined") return { checked: false, allowed: false };
        const token = localStorage.getItem("token");
        const role = (localStorage.getItem("role") || "").toLowerCase();

        const allowed =
            Boolean(token) &&
            (role === "inventory" ||
                role.includes("inventory") ||
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
        <DashboardLayout role="inventory" navItems={NAV_ITEMS}>
            {children}
        </DashboardLayout>
    );
}
