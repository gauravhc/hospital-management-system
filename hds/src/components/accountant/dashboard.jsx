"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f7fcfb_0%,#edf7f5_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function AccountantDashboard() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [billingRows, setBillingRows] = useState([]);
  const [revenueRows, setRevenueRows] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      try {
        const [reportsData, revenueData] = await Promise.all([
          apiGet("/api/reports"),
          apiGet("/api/reports/revenue"),
        ]);

        setBillingRows(Array.isArray(reportsData?.reports) ? reportsData.reports : []);
        setRevenueRows(Array.isArray(revenueData?.data) ? revenueData.data : []);
      } catch (error) {
        console.error("Accountant dashboard error:", error);
        setBillingRows([]);
        setRevenueRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const summary = useMemo(() => {
    const invoices = billingRows;
    const totalInvoiced = invoices.reduce((sum, item) => sum + Number(item?.total_amount || 0), 0);
    const outstanding = invoices.reduce((sum, item) => {
      return sum + Number(item?.due_amount ?? item?.total_amount ?? 0);
    }, 0);
    const settled = invoices.reduce((sum, item) => {
      const status = String(item?.payment_status || item?.status || "").toLowerCase();
      if (status === "paid" || status === "completed") {
        return sum + Number(item?.total_amount || 0);
      }
      return sum;
    }, 0);
    const unpaidCount = invoices.filter((item) => {
      const status = String(item?.payment_status || item?.status || "").toLowerCase();
      return ["pending", "unpaid", "partially_paid", "surgery_paid", "bed_paid"].includes(status);
    }).length;

    return {
      invoices: invoices.length,
      totalInvoiced,
      outstanding,
      settled,
      unpaidCount,
    };
  }, [billingRows]);

  const latestRevenue = useMemo(() => {
    return revenueRows.slice(0, 7);
  }, [revenueRows]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(16,185,129,0.5)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">Finance Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Accountant dashboard</h1>
              <p className="mt-3 text-sm text-emerald-50 md:text-base">
                Review invoice activity, track outstanding collections, and monitor recent revenue from one place.
              </p>
              {username ? <p className="mt-3 text-sm text-teal-100">Working as {username}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/accountant/invoices"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Invoices
              </Link>
              <Link
                href="/accountant/collections"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Collections
              </Link>
              <Link
                href="/accountant/reports"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Finance Reports
              </Link>
              <Link
                href="/register/billing"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Billing
              </Link>
              <Link
                href="/register/report"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Review Reports
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Invoices tracked</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.invoices}</p>
            <p className="mt-2 text-sm text-slate-500">All visible billing records available to finance.</p>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Settled amount</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{formatCurrency(summary.settled)}</p>
            <p className="mt-2 text-sm text-emerald-700">Invoices already marked as paid or completed.</p>
          </div>

          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Outstanding</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{formatCurrency(summary.outstanding)}</p>
            <p className="mt-2 text-sm text-amber-700">Still pending across unpaid or partial invoices.</p>
          </div>

          <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
            <p className="text-sm text-sky-700">Needs follow-up</p>
            <p className="mt-3 text-3xl font-bold text-sky-900">{summary.unpaidCount}</p>
            <p className="mt-2 text-sm text-sky-700">Invoices that still need finance attention.</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Recent invoice activity</h2>
                <p className="text-sm text-slate-500">Latest billing records for finance review.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {loading ? "Loading..." : `${billingRows.length} records`}
              </span>
            </div>

            <div className="mt-5 overflow-x-auto">
              {billingRows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No invoice records available yet.
                </div>
              ) : (
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                      <th className="px-4 py-3 font-semibold">Patient</th>
                      <th className="px-4 py-3 font-semibold">Invoice</th>
                      <th className="px-4 py-3 font-semibold">Amount</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Method</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingRows.slice(0, 10).map((entry, index) => (
                      <tr key={entry.id || index} className="border-b border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {entry.patient_name || `Patient #${entry.patient_id || "--"}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.invoice_number || `INV-${entry.id || index + 1}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatCurrency(entry.total_amount || 0)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {String(entry.payment_status || entry.status || "unknown").replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.payment_method || "Unknown"}
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
              <h2 className="text-xl font-semibold text-slate-900">Collection summary</h2>
              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <p className="text-sm text-slate-500">Total invoiced</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(summary.totalInvoiced)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4">
                  <p className="text-sm text-emerald-700">Settled</p>
                  <p className="mt-2 text-2xl font-bold text-emerald-900">{formatCurrency(summary.settled)}</p>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                  <p className="text-sm text-amber-700">Due amount</p>
                  <p className="mt-2 text-2xl font-bold text-amber-900">{formatCurrency(summary.outstanding)}</p>
                </div>
              </div>
            </div>

            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Recent revenue trend</h2>
              <div className="mt-5 space-y-3">
                {latestRevenue.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    Revenue summary will appear here once invoice totals are available.
                  </div>
                ) : (
                  latestRevenue.map((entry, index) => (
                    <div key={`${entry.day}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
                      <p className="text-sm text-slate-500">{entry.day || "--"}</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(entry.revenue || 0)}</p>
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
