"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import MobileTabNav from "@/components/layout/MobileTabNav";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/lab" },
    { name: "Test Requests", href: "/lab/requests" },
    { name: "Reports", href: "/lab/reports" },
];

export default function LabLayout({ children }) {
    const [username, setUsername] = useState("");

    useEffect(() => {
        const user = localStorage.getItem("username");
        setUsername(user || "Lab Tech");
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
            {/* Sidebar - Desktop Only */}
            <div className="hidden md:block h-full">
                <Sidebar role="lab" />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden pt-0">
                {/* Mobile Navigation */}
                <MobileTabNav
                    navItems={NAV_ITEMS}
                    title="Lab Portal"
                    username={username}
                />

                <main
                    className="flex-1 overflow-y-auto p-4 md:p-8"
                    style={{
                        backgroundImage: "url('/images/Bg-image.webp')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}
