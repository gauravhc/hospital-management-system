"use client";

import { useState } from "react";
// Header removed to avoid duplication
import MobileTabNav from "@/components/layout/MobileTabNav";
import InventorySidebar from "@/components/inventory/sidebar";

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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex flex-col h-screen bg-slate-50">
            {/* Header is provided by RootLayout */}

            <div className="flex flex-1 overflow-hidden">
                {/* Desktop Sidebar - Hidden on Mobile */}
                <div className="hidden md:block h-full">
                    <InventorySidebar
                        isOpen={isSidebarOpen}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                </div>

                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Mobile Navigation - Horizontal Scroll */}
                    <MobileTabNav
                        navItems={NAV_ITEMS}
                        title="Inventory"
                        username="Inventory Mgr"
                    />

                    <main className="flex-1 overflow-y-auto p-4 md:p-6 transition-all duration-300">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
