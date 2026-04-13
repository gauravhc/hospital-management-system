"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import AccountantSidebar from "@/components/accountant/AccountantSidebar";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/accountant" },
  { name: "Invoices", href: "/accountant/invoices" },
  { name: "Collections", href: "/accountant/collections" },
  { name: "Reports", href: "/accountant/reports" },
];

export default function AccountantLayout({ children }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const user = localStorage.getItem("username");

    const allowed =
      role.includes("account") ||
      role.includes("admin") ||
      role.includes("super_admin");

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
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="hidden md:block">
        <AccountantSidebar username={username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="Accountant" username={username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
