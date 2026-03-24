"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileTabNav({ navItems = [], title = "Dashboard", username = "User" }) {
    const pathname = usePathname();

    return (
        <div className="md:hidden flex flex-col bg-white shadow-sm z-10 w-full">
            {/* Title Section */}
            <div className="px-4 py-4 flex justify-between items-center bg-white border-b">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 leading-tight capitalize">{title}</h1>
                        <p className="text-xs text-slate-500">Welcome, {username}</p>
                    </div>
                </div>

                {/* Notification Bell */}
                <div className="p-2 bg-slate-100 rounded-full text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-0 no-scrollbar border-b bg-white">
                {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== pathname && pathname.startsWith(item.href) && item.href !== "/" && item.href.split('/').length > 2);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`whitespace-nowrap pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${active
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300"
                                }`}
                        >
                            {item.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
