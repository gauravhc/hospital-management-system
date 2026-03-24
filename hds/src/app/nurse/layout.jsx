"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/nurse" },
    { name: "Profile", href: "/nurse/profile" },
    { name: "Tasks", href: "/nurse/tasks" },
    { name: "Notifications", href: "/nurse/notifications" },
];

export default function NurseLayout({ children }) {
    return (
        <DashboardLayout role="nurse" navItems={NAV_ITEMS}>
            {children}
        </DashboardLayout>
    );
}
