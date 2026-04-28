"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [{ name: "Dashboard", href: "/insurance" }];

export default function InsuranceSidebar({ username, isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const isActive = (path) => pathname === path;

  return (
    <>
      {isOpen ? (
        <div className="fixed inset-0 z-20 bg-black/40 md:hidden" onClick={onClose} />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen w-64 flex-col transform border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-sky-700">INSURANCE</h2>
          {username ? (
            <p className="mt-1 text-xs text-slate-500">
              Signed in as <span className="font-semibold">{username}</span>
            </p>
          ) : null}
        </div>

        <nav className="space-y-2 px-4 py-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => onClose?.()}
              className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-sky-100 text-sky-800"
                  : "text-slate-700 hover:bg-sky-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

