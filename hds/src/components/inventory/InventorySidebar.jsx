"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    PlusCircle,
    Package,
    Boxes,
    AlertTriangle,
    Clock,
    BookmarkCheck,
    Bell
} from "lucide-react";

export default function InventorySidebar({ username = "Inventory Mgr", isOpen, onClose }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.clear();
        router.push("/login");
    };

    const isActive = (path) => pathname === path;

    const navItems = [
        { name: "Dashboard", href: "/inventory/analytics-dashboard", icon: LayoutDashboard },
        { name: "Add Items", href: "/inventory/additems", icon: PlusCircle },
        { name: "Manage Items", href: "/inventory/manageitems", icon: Package },
        { name: "All Stocks", href: "/inventory/allstocks", icon: Boxes },
        { name: "Stock Batch", href: "/inventory/stockbatch", icon: Clock },
        { name: "Expired Stocks", href: "/inventory/expired-stocks", icon: AlertTriangle },
        { name: "Low Stocks", href: "/inventory/low-stocks", icon: AlertTriangle },
        { name: "Auto Book", href: "/inventory/auto-book", icon: BookmarkCheck },
        { name: "Notifications", href: "/inventory/notifications", icon: Bell },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black/50 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Panel */}
            <aside
                className={`fixed top-0 left-0 z-30 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:shadow-none ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div>
                        <h2 className="text-xl font-semibold text-blue-600">INVENTORY</h2>
                        {username && (
                            <p className="text-xs text-slate-500 mt-1">Hello, <span className="font-semibold">{username}</span> 👋</p>
                        )}
                    </div>
                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="rounded-md p-1 hover:bg-slate-100 md:hidden"
                        aria-label="Close sidebar"
                    >
                        <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onClose && onClose()}
                                className={`flex items-center gap-3 px-4 py-2 rounded-md font-medium transition-colors ${isActive(item.href)
                                    ? "bg-blue-100 text-blue-700"
                                    : "text-slate-700 hover:bg-blue-50"
                                    }`}
                            >
                                <Icon size={20} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto">
                    <button
                        onClick={handleLogout}
                        className="w-full rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </aside>
        </>
    );
}
