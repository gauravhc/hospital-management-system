"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import InsuranceSidebar from "@/components/insurance/InsuranceSidebar";

const NAV_ITEMS = [{ name: "Dashboard", href: "/insurance" }];

export default function InsuranceLayout({ children }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = (localStorage.getItem("role") || "").toLowerCase();
    const user = localStorage.getItem("username");

    const allowed =
      role.includes("insurance") ||
      role.includes("admin") ||
      role.includes("hospital_admin") ||
      role.includes("super_admin");

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
        <InsuranceSidebar username={username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="Insurance" username={username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}

