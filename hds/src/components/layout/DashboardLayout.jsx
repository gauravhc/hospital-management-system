'use client';

import { useState, useEffect } from "react";
import Sidebar from "@/components/sidebar/sidebar";
import MobileTabNav from "@/components/layout/MobileTabNav";

export default function DashboardLayout({ children, role, navItems }) {
    const [username, setUsername] = useState("");
    const roleTitle =
        role === "admin"
            ? "Hospital Admin"
            : role === "super_admin"
                ? "Super Admin"
                : role.charAt(0).toUpperCase() + role.slice(1);

    useEffect(() => {
        const storedUser = localStorage.getItem("username");
        setUsername(storedUser || roleTitle);
    }, [roleTitle]);

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
            {/* Sidebar - Desktop */}
            <div className="hidden md:block h-full z-40 relative">
                <Sidebar role={role} />
            </div>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden h-full relative">

                {/* Mobile Navigation (Visible only on small screens) */}
                <div className="md:hidden">
                    {navItems && (
                        <MobileTabNav
                            navItems={navItems}
                            title={`${roleTitle} Portal`}
                            username={username}
                        />
                    )}
                </div>

                {/* Content */}
                <main
                    className="flex-1 overflow-y-auto p-4 md:p-8 w-full"
                    style={{
                        backgroundImage: "url('/images/Bg-image.webp')",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundAttachment: "fixed"
                    }}
                >
                    <div className="max-w-7xl mx-auto pb-20 md:pb-0">
                        {/* Fade in animation wrapper could go here */}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
