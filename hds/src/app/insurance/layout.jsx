"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import MobileTabNav from "@/components/layout/MobileTabNav";
import InsuranceSidebar from "@/components/insurance/InsuranceSidebar";

const subscribeToInsuranceAuthChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event) => {
    if (event.key === "token" || event.key === "role" || event.key === "username") callback();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
};

let cachedInsuranceToken = null;
let cachedInsuranceRole = null;
let cachedInsuranceUsername = null;
let cachedInsuranceSnapshot = null;

const readInsuranceAuthSnapshot = () => {
  if (typeof window === "undefined") return SERVER_INSURANCE_AUTH_SNAPSHOT;

  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const username = localStorage.getItem("username") || "";

  if (
    token === cachedInsuranceToken &&
    role === cachedInsuranceRole &&
    username === cachedInsuranceUsername &&
    cachedInsuranceSnapshot
  ) {
    return cachedInsuranceSnapshot;
  }

  const allowed =
    Boolean(token) &&
    (role.includes("insurance") ||
      role.includes("admin") ||
      role.includes("hospital_admin") ||
      role.includes("super_admin"));

  cachedInsuranceToken = token;
  cachedInsuranceRole = role;
  cachedInsuranceUsername = username;
  cachedInsuranceSnapshot = { checked: true, allowed, username };
  return cachedInsuranceSnapshot;
};

const SERVER_INSURANCE_AUTH_SNAPSHOT = { checked: false, allowed: false, username: "" };
const readServerInsuranceAuthSnapshot = () => SERVER_INSURANCE_AUTH_SNAPSHOT;

const NAV_ITEMS = [{ name: "Dashboard", href: "/insurance" }];

export default function InsuranceLayout({ children }) {
  const router = useRouter();

  const auth = useSyncExternalStore(
    subscribeToInsuranceAuthChanges,
    readInsuranceAuthSnapshot,
    readServerInsuranceAuthSnapshot
  );

  useEffect(() => {
    if (auth.checked && !auth.allowed) router.push("/login");
  }, [auth.allowed, auth.checked, router]);

  if (!auth.checked || !auth.allowed) return null;

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-50 md:flex-row">
      <div className="hidden md:block">
        <InsuranceSidebar username={auth.username} isOpen={true} onClose={() => {}} />
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileTabNav navItems={NAV_ITEMS} title="Insurance" username={auth.username} />
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
