"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";

const subscribeToInventoryAuthChanges = (callback) => {
    if (typeof window === "undefined") return () => {};

    const onStorage = (event) => {
        if (event.key === "token" || event.key === "role") callback();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
};

let cachedInventoryToken = null;
let cachedInventoryRole = null;
let cachedInventorySnapshot = null;

const readInventoryAuthSnapshot = () => {
    if (typeof window === "undefined") return SERVER_INVENTORY_AUTH_SNAPSHOT;

    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();

    if (token === cachedInventoryToken && role === cachedInventoryRole && cachedInventorySnapshot) {
        return cachedInventorySnapshot;
    }

    const allowed =
        Boolean(token) &&
        (role === "inventory" ||
            role.includes("inventory") ||
            role === "admin" ||
            role === "hospital_admin" ||
            role === "super_admin");

    cachedInventoryToken = token;
    cachedInventoryRole = role;
    cachedInventorySnapshot = { checked: true, allowed };
    return cachedInventorySnapshot;
};

const SERVER_INVENTORY_AUTH_SNAPSHOT = { checked: false, allowed: false };
const readServerInventoryAuthSnapshot = () => SERVER_INVENTORY_AUTH_SNAPSHOT;

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

    const auth = useSyncExternalStore(
        subscribeToInventoryAuthChanges,
        readInventoryAuthSnapshot,
        readServerInventoryAuthSnapshot
    );

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
