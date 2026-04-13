"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f7fcfb_0%,#edf7f5_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function AccountantReports() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [revenueRows, setRevenueRows] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const [billingData, revenueData] = await Promise.all([
          apiGet("/api/reports"),
          apiGet("/api/reports/revenue"),
        ]);
        setInvoiceRows(Array.isArray(billingData?.reports) ? billingData.reports : []);
        setRevenueRows(Array.isArray(revenueData?.data) ? revenueData.data : []);
      } catch (error) {
        console.error("Accountant finance reports error:", error);
        setInvoiceRows([]);
        setRevenueRows([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const summary = useMemo(() => {
    const totalRevenue = revenueRows.reduce((sum, row) => sum + Number(row?.revenue || 0), 0);
    const openDue = invoiceRows.reduce((sum, row) => sum + Number(row?.due_amount ?? row?.total_amount ?? 0), 0);
    const paidInvoices = invoiceRows.filter((row) => {
      const status = String(row?.payment_status || row?.status || "").toLowerCase();
      return status === "paid" || status === "completed";
    }).length;
    const partialInvoices = invoiceRows.filter((row) => {
      const status = String(row?.payment_status || row?.status || "").toLowerCase();
      return ["partially_paid", "surgery_paid", "bed_paid"].includes(status);
    }).length;

    return {
      totalRevenue,
      openDue,
      paidInvoices,
      partialInvoices,
    };
  }, [invoiceRows, revenueRows]);

  const paymentMethodBreakdown = useMemo(() => {
    const counts = {};
    invoiceRows.forEach((row) => {
      const key = String(row?.payment_method || "unknown").toLowerCase();
      counts[key] = (counts[key] || 0) + Number(row?.total_amount || 0);
    });
    return Object.entries(counts)
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [invoiceRows]);

  const statusBreakdown = useMemo(() => {
    const counts = {};
    invoiceRows.forEach((row) => {
      const key = String(row?.payment_status || row?.status || "unknown").toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [invoiceRows]);

  const latestRevenue = useMemo(() => revenueRows.slice(0, 10), [revenueRows]);
  const latestInvoices = useMemo(() => invoiceRows.slice(0, 8), [invoiceRows]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(16,185,129,0.5)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">Finance Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Finance reports</h1>
              <p className="mt-3 text-sm text-emerald-50 md:text-base">
                Review revenue, payment mix, settlement patterns, and current financial position from one finance view.
              </p>
              {username ? <p className="mt-3 text-sm text-teal-100">Working as {username}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/accountant/collections"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Collections
              </Link>
              <Link
                href="/accountant/invoices"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Invoice Register
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Total revenue</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{formatCurrency(summary.totalRevenue)}</p>
            <p className="mt-2 text-sm text-slate-500">Total from the current finance revenue feed.</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Open due</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{formatCurrency(summary.openDue)}</p>
            <p className="mt-2 text-sm text-amber-700">Still outstanding across current invoice records.</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Paid invoices</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.paidInvoices}</p>
            <p className="mt-2 text-sm text-emerald-700">Invoices fully cleared in the current report set.</p>
          </div>
          <div className="rounded-[28px] border border-orange-100 bg-orange-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(249,115,22,0.42)]">
            <p className="text-sm text-orange-700">Partial settlements</p>
            <p className="mt-3 text-3xl font-bold text-orange-900">{summary.partialInvoices}</p>
            <p className="mt-2 text-sm text-orange-700">Invoices paid only in part so far.</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Revenue by day</h2>
                <p className="text-sm text-slate-500">Latest revenue snapshots from saved invoice totals.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {loading ? "Loading..." : `${latestRevenue.length} days`}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {latestRevenue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500 md:col-span-2">
                  No revenue records available yet.
                </div>
              ) : (
                latestRevenue.map((row, index) => (
                  <div key={`${row.day}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                    <p className="text-sm text-slate-500">{row.day || "--"}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(row.revenue || 0)}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Payment method mix</h2>
              <div className="mt-5 space-y-3">
                {paymentMethodBreakdown.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    No payment-method data available.
                  </div>
                ) : (
                  paymentMethodBreakdown.map((entry) => (
                    <div key={entry.method} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{normalizeStatus(entry.method)}</p>
                        <p className="text-sm font-semibold text-slate-700">{formatCurrency(entry.amount)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Status breakdown</h2>
              <div className="mt-5 space-y-3">
                {statusBreakdown.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    No invoice status data available.
                  </div>
                ) : (
                  statusBreakdown.map((entry) => (
                    <div key={entry.status} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-semibold text-slate-900">{normalizeStatus(entry.status)}</p>
                        <p className="text-sm font-semibold text-slate-700">{entry.count} invoice(s)</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Latest finance records</h2>
              <p className="text-sm text-slate-500">Recent invoice entries feeding the current report figures.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${latestInvoices.length} invoices`}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {latestInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No finance records found yet.
              </div>
            ) : (
              <table className="min-w-[860px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {latestInvoices.map((entry, index) => (
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
                        {formatCurrency(entry.due_amount ?? entry.total_amount ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {normalizeStatus(entry.payment_status || entry.status)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {entry.payment_method || "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString("en-IN") : "--"}
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
