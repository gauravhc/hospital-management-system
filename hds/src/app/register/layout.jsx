"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterSidebar from "@/components/register/RegisterSidebar";
import MobileTabNav from "@/components/layout/MobileTabNav";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/register" },
  { name: "New Patient", href: "/register/patient-create" },
  { name: "Appointments", href: "/register/registration" },
  { name: "Billing", href: "/register/billing" },
  { name: "Reports", href: "/register/report" },
  { name: "Notifications", href: "/register/notifications" },
];

export default function RegisterLayout({ children }) {
  const router = useRouter();
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
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-gray-50 md:flex-row">
      <div className="hidden h-full md:block">
        <RegisterSidebar
          username={username}
          isOpen={true}
          onClose={() => {}}
        />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden pt-0">
        <MobileTabNav
          navItems={NAV_ITEMS}
          title="Reception Desk"
          username={username}
        />

        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
