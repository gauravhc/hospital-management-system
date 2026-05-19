"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

export default function MobileTabNav({ navItems = [], title = "Dashboard", username = "User" }) {
    const pathname = usePathname();
    const homeHref = navItems?.[0]?.href || "/";
    const LOGO_SRC = "/logo.png";

    return (
        <div className="md:hidden flex flex-col bg-white dark:bg-slate-900 shadow-sm z-10 w-full">
            {/* Title Section */}
            <div className="px-4 py-3 flex justify-between items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                    <Link href={homeHref} className="shrink-0" aria-label="Medicore Vault Home">
                        <Image
                            src={LOGO_SRC}
                            alt="Medicore Vault - Secure Care, Limitless Trust"
                            width={64}
                            height={64}
                            className="object-contain w-16 h-16"
                            priority
                            sizes="64px"
                            unoptimized
                        />
                    </Link>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight capitalize truncate">{title}</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Welcome, {username}</p>
                    </div>
                </div>

                {/* Notification Bell */}
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
            </div>

            {/* Horizontal Tabs */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-0 no-scrollbar border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== pathname && pathname.startsWith(item.href) && item.href !== "/" && item.href.split('/').length > 2);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`whitespace-nowrap pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${active
                                ? "border-blue-600 text-blue-600"
                                : "border-transparent text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600"
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
