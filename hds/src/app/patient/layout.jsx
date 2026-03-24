"use client";

import DashboardLayout from "@/components/layout/DashboardLayout";

const NAV_ITEMS = [
    { name: "Dashboard", href: "/patient" },
    { name: "Profile", href: "/patient/profile" },
    { name: "Medical History", href: "/patient/medical-history" },
    { name: "Documents", href: "/patient/documents" },
    { name: "Appointments", href: "/patient/appointments" },
    { name: "Bills", href: "/patient/bills" },
    { name: "Lab", href: "/patient/lab" },
    { name: "Pharmacy", href: "/patient/pharmacy" },
    { name: "Insurance", href: "/patient/insurance" },
    { name: "Ambulance", href: "/patient/ambulance" },
    { name: "Records", href: "/patient/records" },
];

export default function PatientLayout({ children }) {
    return (
        <DashboardLayout role="patient" navItems={NAV_ITEMS}>
            {children}
        </DashboardLayout>
    );
}
