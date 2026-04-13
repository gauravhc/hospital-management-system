"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/register" },
  { name: "New Patient", href: "/register/patient-create" },
  { name: "Appointments", href: "/register/registration" },
  { name: "Billing", href: "/register/billing" },
  { name: "Reports", href: "/register/report" },
  { name: "Notifications", href: "/register/notifications" },
];

export default function RegisterSidebar({ username, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-30 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:shadow-none ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-blue-600">RECEPTION DESK</h2>
            {username && (
              <p className="mt-1 text-xs text-slate-500">
                Hello, <span className="font-semibold">{username}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-slate-100 md:hidden"
            aria-label="Close sidebar"
          >
            <svg
              className="h-6 w-6 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose()}
              className={`block rounded-md px-4 py-2 font-medium transition-colors ${
                isActive(item.href)
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:bg-blue-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg bg-red-500 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
