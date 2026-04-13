"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FaBars,
    FaCalendarAlt,
    FaFlask,
    FaPrescriptionBottleAlt,
    FaFileInvoiceDollar,
    FaFileMedical,
    FaAmbulance,
    FaShieldAlt,
    FaUserMd,
    FaUserNurse,
    FaVial,
    FaHome,
    FaSignOutAlt
} from "react-icons/fa";

/* ---------------- Configuration ---------------- */
const ROLE_MENUS = {
    patient: [
        {
            title: "Home", items: [
                { title: "Dashboard", href: "/patient", icon: <FaHome size={18} />, subtitle: "Overview" }
            ]
        },
        {
            title: "Health Services", items: [
                { title: "Profile", href: "/patient/profile", icon: <FaUserMd size={18} />, subtitle: "Personal Info" },
                { title: "Medical History", href: "/patient/medical-history", icon: <FaFileMedical size={18} />, subtitle: "Health Summary" },
                { title: "Documents", href: "/patient/documents", icon: <FaFileMedical size={18} />, subtitle: "Uploads" },
                { title: "Appointments", href: "/patient/appointments", icon: <FaCalendarAlt size={18} />, subtitle: "Schedule" },
                { title: "Bills", href: "/patient/bills", icon: <FaFileInvoiceDollar size={18} />, subtitle: "Payments" },
                { title: "Lab Reports", href: "/patient/lab", icon: <FaFlask size={18} />, subtitle: "Results" },
                { title: "Pharmacy", href: "/patient/pharmacy", icon: <FaPrescriptionBottleAlt size={18} />, subtitle: "Medicines" },
                { title: "Insurance", href: "/patient/insurance", icon: <FaShieldAlt size={18} />, subtitle: "Claims" },
                { title: "Ambulance", href: "/patient/ambulance", icon: <FaAmbulance size={18} />, subtitle: "Emergency" },
                { title: "Records", href: "/patient/records", icon: <FaFileMedical size={18} />, subtitle: "Documents" },
                { title: "Notifications", href: "/patient/notifications", icon: <FaShieldAlt size={18} />, subtitle: "Alerts" }, // Added
            ]
        }
    ],
    doctor: [
        {
            title: "Main", items: [
                { title: "Dashboard", href: "/doctor", icon: <FaUserMd size={18} />, subtitle: "Overview" },
                { title: "Profile", href: "/doctor/profile", icon: <FaUserMd size={18} />, subtitle: "My Info" },
                { title: "Appointments", href: "/doctor/appointments", icon: <FaCalendarAlt size={18} />, subtitle: "Manage" },
                { title: "Patients", href: "/doctor/patients", icon: <FaUserMd size={18} />, subtitle: "My Patients" },
                { title: "Treatment & Tests", href: "/doctor/assign-task", icon: <FaFileMedical size={18} />, subtitle: "Plan" },
                { title: "Notifications", href: "/doctor/notifications", icon: <FaShieldAlt size={18} />, subtitle: "Alerts" }, // Added
            ]
        }
    ],
    nurse: [
        {
            title: "Main", items: [
                { title: "Dashboard", href: "/nurse", icon: <FaUserNurse size={18} />, subtitle: "Overview" },
                { title: "Profile", href: "/nurse/profile", icon: <FaUserNurse size={18} />, subtitle: "My Info" },
                { title: "Tasks", href: "/nurse/tasks", icon: <FaCalendarAlt size={18} />, subtitle: "Assigned" },
                { title: "Notifications", href: "/nurse/notifications", icon: <FaShieldAlt size={18} />, subtitle: "Alerts" }, // Added
            ]
        }
    ],
    lab: [
        {
            title: "Main", items: [
                { title: "Dashboard", href: "/lab", icon: <FaVial size={18} />, subtitle: "Overview" },
                { title: "Test Requests", href: "/lab/requests", icon: <FaFlask size={18} />, subtitle: "Pending" },
                { title: "Reports", href: "/lab/reports", icon: <FaFileMedical size={18} />, subtitle: "Completed" },
                { title: "Notifications", href: "/lab/notifications", icon: <FaShieldAlt size={18} />, subtitle: "Alerts" },
            ]
        }
    ],
    admin: [
        {
            title: "Management", items: [
                { title: "Dashboard", href: "/admin", icon: <FaHome size={18} />, subtitle: "Overview" },
                { title: "Manage Users", href: "/admin/users", icon: <FaUserMd size={18} />, subtitle: "Staff & Patients" },
                { title: "Create User", href: "/admin/create", icon: <FaUserNurse size={18} />, subtitle: "Onboarding" },
                { title: "Settings", href: "/admin/settings", icon: <FaShieldAlt size={18} />, subtitle: "System" },
            ]
        }
    ],
    super_admin: [
        {
            title: "Management", items: [
                { title: "Dashboard", href: "/super-admin", icon: <FaHome size={18} />, subtitle: "Overview" },
                { title: "Manage Users", href: "/super-admin/users", icon: <FaUserMd size={18} />, subtitle: "All Staff" },
                { title: "Create User", href: "/super-admin/users/create", icon: <FaUserNurse size={18} />, subtitle: "Onboarding" },
            ]
        }
    ]
};

/* ---------------- Components ---------------- */
function SidebarCard({ icon, title, subtitle, href, isOpen, isActive }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-3 p-3 rounded-xl transition mb-2 ${isActive
                ? "bg-blue-50 text-blue-600 border border-blue-100"
                : "hover:bg-slate-50 text-slate-600"
                } ${!isOpen ? "justify-center" : ""}`}
        >
            <span className={`${!isOpen ? "text-xl" : ""} ${isActive ? "text-blue-600" : "text-slate-500"}`}>{icon}</span>
            {isOpen && (
                <div className="overflow-hidden">
                    <p className={`font-medium text-sm ${isActive ? "text-blue-700" : "text-slate-700"}`}>{title}</p>
                    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                </div>
            )}
        </Link>
    );
}

export default function Sidebar({ role = "patient" }) {
    const pathname = usePathname();
    const roleLabel =
        role === "admin" ? "Hospital Admin" : role === "super_admin" ? "Super Admin" : role;
    // Default open on desktop
    const [isOpen, setIsOpen] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 768) setIsOpen(false);
            else setIsOpen(true);
        };
        // Initial check
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const sections = ROLE_MENUS[role] || ROLE_MENUS.patient;
    const toggleSidebar = () => setIsOpen(!isOpen);

    const isItemActive = (href, title) => {
        if (pathname === href) return true;
        // Dashboard should only be active on its exact route, not on child routes.
        if (String(title || "").toLowerCase() === "dashboard") return false;
        if (href === "/super-admin/users" && pathname?.startsWith("/super-admin/users/create")) {
            return false;
        }
        return pathname?.startsWith(href + "/");
    };

    // Logout function
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={`
                    fixed md:sticky top-0 left-0 h-screen pt-[125px] md:pt-0 bg-white border-r border-slate-200 shadow-sm z-40 transition-all duration-300 flex flex-col
                    ${isOpen ? "w-64" : "w-20 md:w-20 w-0 -translate-x-full md:translate-x-0"}
                `}
            >
                {/* Header */}
                <div className="h-12 flex items-center justify-between px-4 mb-2 shrink-0">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition"
                    >
                        <FaBars size={18} />
                    </button>
                    {isOpen && (
                        <span className="font-bold text-lg text-slate-800 tracking-tight capitalize mr-auto ml-3">
                            {roleLabel} Portal
                        </span>
                    )}
                </div>

                {/* Menu */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {sections.map((section, idx) => (
                        <div key={idx}>
                            {isOpen && (
                                <h3 className="px-1 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    {section.title}
                                </h3>
                            )}
                            <div>
                                {section.items.map((item) => (
                                    <SidebarCard
                                        key={item.href}
                                        {...item}
                                        isOpen={isOpen}
                                        isActive={isItemActive(item.href, item.title)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer (Logout) */}
                <div className="p-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
                    {isOpen && (
                        <div className="px-1 mb-3 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                                {roleLabel.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-xs font-bold text-slate-700">{roleLabel}</p>
                                <p className="text-[10px] text-slate-500 truncate">Logged In</p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 transition-all border border-transparent hover:border-rose-100 ${!isOpen ? "justify-center" : ""}`}
                    >
                        <span className="text-lg"><FaSignOutAlt /></span>
                        {isOpen && (
                            <div className="font-medium text-sm">Logout</div>
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}
