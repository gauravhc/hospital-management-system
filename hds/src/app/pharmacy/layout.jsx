"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import PharmacySidebar from "@/components/pharmacy/PharmacySidebar";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/pharmacy" },
  { name: "Stock", href: "/pharmacy/stock" },
  { name: "Dispense", href: "/pharmacy/invoice" },
  { name: "History", href: "/pharmacy/history" },
];

export default function PharmacyLayout({ children }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const user = localStorage.getItem("username");

    const allowed =
      role === "pharmacist" ||
      role === "admin" ||
      role === "hospital_admin" ||
      role === "super_admin";

    if (!token || !allowed) {
      router.push("/login");
      return;
    }

    setUsername(user || "");
    setIsAuthorized(true);
  }, [router]);

  if (!isAuthorized) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="hidden md:block">
        <PharmacySidebar username={username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="Pharmacy" username={username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
