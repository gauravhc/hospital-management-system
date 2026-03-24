"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import RegisterSidebar from "@/components/register/RegisterSidebar";
import MobileTabNav from "@/components/layout/MobileTabNav";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/register" },
    { name: "New Patient", href: "/register/patient-create" },
    { name: "Registration", href: "/register/registration" },
    { name: "Billing", href: "/register/billing" },
    { name: "Reports", href: "/register/report" },
];

export default function RegisterLayout({ children }) {
    const router = useRouter();
    const pathname = usePathname();
    const [username, setUsername] = useState("");
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = (localStorage.getItem("role") || "").toLowerCase();
        const user = localStorage.getItem("username");

        const allowed =
            role.includes("register") ||
            role.includes("front") ||
            role.includes("desk") ||
            role.includes("reception") ||
            role.includes("admin");

        if (!token || !allowed) {
            router.push("/login");
            return;
        }

        setUsername(user || "");
        setIsAuthorized(true);
    }, [router]);

    if (!isAuthorized) {
        return null; // or loading spinner
    }

    return (
        <div className="flex min-h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
            {/* Sidebar - Desktop Only */}
            <div className="hidden md:block h-full">
                <RegisterSidebar
                    username={username}
                    isOpen={true}
                    onClose={() => { }}
                />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden pt-0">
                {/* Mobile Navigation */}
                <MobileTabNav
                    navItems={NAV_ITEMS}
                    title="Registration"
                    username={username}
                />

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
