"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const statusTone = (value) => {
  const normalized = String(value || "recorded").toLowerCase();
  if (normalized === "dispensed" || normalized === "recorded") return "bg-emerald-100 text-emerald-700";
  if (normalized === "pending") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

export default function PharmacyHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setFeedback("");
      try {
        const response = await apiGet("/api/pharmacy/orders");
        const list = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
        setOrders(list);
      } catch (error) {
        console.error("Failed to load pharmacy history", error);
        setOrders([]);
        setFeedback(error?.message || "Unable to load dispense history.");
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;

    return orders.filter((order) =>
      [
        order?.patient_name,
        order?.doctor_name,
        order?.medicine_name,
        order?.id,
        order?.patient_id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [orders, search]);

  const summary = useMemo(() => {
    return {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, order) => sum + Number(order?.total_amount || 0), 0),
      totalUnits: orders.reduce((sum, order) => sum + Number(order?.quantity || 0), 0),
    };
  }, [orders]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Pharmacy History</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Dispense timeline</h1>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Review past pharmacy orders by patient, doctor, and medicine so the pharmacist team can follow recent dispensing activity.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/pharmacy/stock"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Stock
              </Link>
              <Link
                href="/pharmacy/invoice"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                New Dispense
              </Link>
              <Link
                href="/pharmacy"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {feedback ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {feedback}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Recorded orders" value={summary.totalOrders} tone="slate" />
          <MetricCard label="Total units dispensed" value={summary.totalUnits} tone="sky" />
          <MetricCard label="Recorded value" value={formatCurrency(summary.totalValue)} tone="emerald" />
        </section>

        <section className="rounded-[24px] border border-sky-100 bg-sky-50/90 p-5 text-sm text-sky-900 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.18)]">
          <p className="font-semibold">When to use this page</p>
          <p className="mt-2">
            Use history to confirm past dispensations, verify which medicines were issued to a patient, and cross-check the pharmacist desk activity before issuing more stock.
          </p>
        </section>

        <section className={surfaceCard}>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Search dispense history</h2>
              <p className="text-sm text-slate-500">Filter by patient, doctor, medicine, or order id.</p>
            </div>

            <div className="w-full md:max-w-sm">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, doctor, medicine"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </div>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Dispense records</h2>
              <p className="text-sm text-slate-500">The latest pharmacy orders recorded in the system.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${filteredOrders.length} record(s)`}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                Loading dispense history...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No pharmacy history found yet.
              </div>
            ) : (
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Doctor</th>
                    <th className="px-4 py-3 font-semibold">Medicines</th>
                    <th className="px-4 py-3 font-semibold">Qty</th>
                    <th className="px-4 py-3 font-semibold">Value</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order?.id || `${order?.patient_id || "order"}-${index}`} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">#{order?.id || "--"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium text-slate-900">{order?.patient_name || "Walk-in / Not linked"}</div>
                        <div className="text-xs text-slate-500">Patient ID: {order?.patient_id || "--"}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{order?.doctor_name || "--"}</td>
                      <td className="px-4 py-3 text-slate-700">{order?.medicine_name || "No medicines linked"}</td>
                      <td className="px-4 py-3 text-slate-700">{order?.quantity || 0}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrency(order?.total_amount || 0)}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {order?.created_at || order?.order_date
                          ? new Date(order.created_at || order.order_date).toLocaleDateString("en-IN")
                          : "--"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(order?.status)}`}>
                          {String(order?.status || "recorded").replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-100 bg-sky-50/95 text-sky-900",
    emerald: "border-emerald-100 bg-emerald-50/95 text-emerald-900",
  };

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
