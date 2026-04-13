"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const orderTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "dispensed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export default function PharmacyDashboard() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [medicines, setMedicines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [medicinesData, ordersData, salesData] = await Promise.all([
          apiGet("/api/pharmacy/medicines"),
          apiGet("/api/pharmacy/orders"),
          apiGet("/api/pharmacy/sales"),
        ]);

        setMedicines(Array.isArray(medicinesData?.data) ? medicinesData.data : []);
        setOrders(Array.isArray(ordersData?.data) ? ordersData.data : []);
        setSales(Array.isArray(salesData?.data) ? salesData.data : []);
      } catch (err) {
        console.error("Failed to load pharmacy dashboard", err);
        setMedicines([]);
        setOrders([]);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const lowStock = medicines.filter((item) => {
      const stock = Number(item?.stock_quantity || 0);
      const reorderLevel = Number(item?.reorder_level || 0);
      return stock <= (reorderLevel || 10);
    });

    const totalStock = medicines.reduce((sum, item) => sum + Number(item?.stock_quantity || 0), 0);
    const totalSales = sales.reduce((sum, item) => sum + Number(item?.total_amount || 0), 0);
    const dispensedToday = sales.filter((item) => {
      const created = String(item?.created_at || "");
      return created.startsWith(new Date().toISOString().slice(0, 10));
    }).length;

    return {
      medicines: medicines.length,
      totalStock,
      lowStock: lowStock.length,
      totalSales,
      dispensedToday,
    };
  }, [medicines, sales]);

  const topMedicines = useMemo(() => {
    const counts = {};
    sales.forEach((entry) => {
      const name = entry?.medicine_name || `Medicine #${entry?.medicine_id || "--"}`;
      counts[name] = (counts[name] || 0) + Number(entry?.quantity || 0);
    });

    return Object.entries(counts)
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [sales]);

  const lowStockRows = useMemo(() => {
    return medicines
      .filter((item) => {
        const stock = Number(item?.stock_quantity || 0);
        const reorderLevel = Number(item?.reorder_level || 0);
        return stock <= (reorderLevel || 10);
      })
      .slice(0, 6);
  }, [medicines]);

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
      .slice(0, 8);
  }, [orders]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Pharmacy Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Pharmacist dashboard</h1>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Monitor medicines, watch low-stock risk, and review recent dispensing activity from one pharmacy workspace.
              </p>
              {username ? <p className="mt-3 text-sm text-sky-100">Working as {username}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/pharmacy/stock"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Manage Stock
              </Link>
              <Link
                href="/pharmacy/invoice"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Dispense
              </Link>
              <Link
                href="/pharmacy/history"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                View History
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-sky-100 bg-sky-50/90 p-5 text-sm text-sky-900 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.18)]">
            <p className="font-semibold">1. Check stock readiness</p>
            <p className="mt-2">Review low-stock medicines first so the pharmacist team avoids promising unavailable medicines.</p>
          </div>
          <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/90 p-5 text-sm text-emerald-900 shadow-[0_18px_50px_-24px_rgba(16,185,129,0.18)]">
            <p className="font-semibold">2. Dispense medicines</p>
            <p className="mt-2">Go to the dispense page, select the patient, add medicines, and record the issue.</p>
          </div>
          <div className="rounded-[24px] border border-violet-100 bg-violet-50/90 p-5 text-sm text-violet-900 shadow-[0_18px_50px_-24px_rgba(139,92,246,0.18)]">
            <p className="font-semibold">3. Review history</p>
            <p className="mt-2">Use pharmacy history to verify what was dispensed and to whom.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Medicines</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.medicines}</p>
            <p className="mt-2 text-sm text-slate-500">Medicines currently available to the pharmacy desk.</p>
          </div>
          <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
            <p className="text-sm text-sky-700">Total stock</p>
            <p className="mt-3 text-3xl font-bold text-sky-900">{summary.totalStock}</p>
            <p className="mt-2 text-sm text-sky-700">Combined units available across all medicines.</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Low stock alerts</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{summary.lowStock}</p>
            <p className="mt-2 text-sm text-amber-700">Medicines already at or below the reorder threshold.</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Dispensed today</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.dispensedToday}</p>
            <p className="mt-2 text-sm text-emerald-700">Orders already marked as dispensed today.</p>
          </div>
          <div className="rounded-[28px] border border-violet-100 bg-violet-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(139,92,246,0.42)]">
            <p className="text-sm text-violet-700">Recorded sales</p>
            <p className="mt-3 text-3xl font-bold text-violet-900">{formatCurrency(summary.totalSales)}</p>
            <p className="mt-2 text-sm text-violet-700">Value of all dispensed orders in the current feed.</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Recent dispensing activity</h2>
                <p className="text-sm text-slate-500">Latest pharmacy orders and their current dispense state.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {loading ? "Loading..." : `${recentOrders.length} orders`}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              {recentOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No pharmacy orders available yet.
                </div>
              ) : (
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Medicine</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((entry, index) => (
                      <tr key={entry.id || index} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {entry.patient_name || entry.patient_id || "--"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.medicine_name || `Medicine #${entry.medicine_id || "--"}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{entry.quantity || 0}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(entry.total_amount || 0)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${orderTone(entry.status)}`}>
                            {normalizeStatus(entry.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Top dispensed medicines</h2>
              <div className="mt-5 space-y-3">
                {topMedicines.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    Dispensed medicine trends will appear here once orders are created.
                  </div>
                ) : (
                  topMedicines.map((entry) => (
                    <div key={entry.name} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{entry.name}</p>
                        <p className="text-sm font-semibold text-slate-700">{entry.qty} unit(s)</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Low stock watch</h2>
              <div className="mt-5 space-y-3">
                {lowStockRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    No low-stock medicines right now.
                  </div>
                ) : (
                  lowStockRows.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{item.name || "Medicine"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Reorder level: {item.reorder_level || 0}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-amber-800">{item.stock_quantity || 0} left</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
