"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import HRSidebar from "@/components/hr/HRSidebar";

const subscribeToHRAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "role" || event.key === "username") callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

let cachedHRToken = null;
let cachedHRRole = null;
let cachedHRUsername = null;
let cachedHRSnapshot = null;

const readHRAuthSnapshot = () => {
  if (typeof window === "undefined") return SERVER_HR_AUTH_SNAPSHOT;

  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const username = localStorage.getItem("username") || "";

  if (token === cachedHRToken && role === cachedHRRole && username === cachedHRUsername && cachedHRSnapshot) {
    return cachedHRSnapshot;
  }

  const allowed =
    Boolean(token) &&
    (role === "hr" ||
      role === "hrmanager" ||
      role === "hospital_admin" ||
      role === "admin" ||
      role === "super_admin");

  cachedHRToken = token;
  cachedHRRole = role;
  cachedHRUsername = username;
  cachedHRSnapshot = { checked: true, allowed, username };
  return cachedHRSnapshot;
};

const SERVER_HR_AUTH_SNAPSHOT = { checked: false, allowed: false, username: "" };
const readServerHRAuthSnapshot = () => SERVER_HR_AUTH_SNAPSHOT;

const NAV_ITEMS = [
  { name: "Dashboard", href: "/hr" },
  { name: "Staff", href: "/hr/staff" },
  { name: "Attendance", href: "/hr/attendance" },
  { name: "Payroll", href: "/hr/payroll" },
  { name: "Leave", href: "/hr/leave" },
];

export default function HRLayout({ children }) {
  const router = useRouter();

  const auth = useSyncExternalStore(
    subscribeToHRAuthChanges,
    readHRAuthSnapshot,
    readServerHRAuthSnapshot
  );

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="hidden md:block">
        <HRSidebar username={auth.username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="HR Manager" username={auth.username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
