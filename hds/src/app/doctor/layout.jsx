"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/doctor" },
    { name: "Appointments", href: "/doctor/appointments" },
    { name: "Patients", href: "/doctor/patients" },
    { name: "Lab Reports", href: "/doctor/lab-reports" },
    { name: "Notifications", href: "/doctor/notifications" },
];

export default function DoctorLayout({ children }) {
    return (
        <DashboardLayout role="doctor" navItems={NAV_ITEMS}>
            {children}
        </DashboardLayout>
    );
}
