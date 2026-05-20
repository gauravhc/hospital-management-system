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

const paymentTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid" || normalized === "completed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "partially_paid" || normalized === "partial" || normalized === "surgery_paid" || normalized === "bed_paid") {
    return "bg-orange-100 text-orange-700";
  }
  if (normalized === "pending" || normalized === "unpaid") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f7fcfb_0%,#edf7f5_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function AccountantInvoices() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    method: "all",
    sort: "latest",
  });

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadInvoices = async () => {
      setLoading(true);
      try {
        const reportsData = await apiGet("/api/reports");
        setInvoices(Array.isArray(reportsData?.reports) ? reportsData.reports : []);
      } catch (error) {
        console.error("Accountant invoices error:", error);
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    let rows = [...invoices];
    const q = String(search || "").trim().toLowerCase();

    if (q) {
      rows = rows.filter((entry) => {
        return (
          String(entry?.patient_name || "").toLowerCase().includes(q) ||
          String(entry?.patient_id || "").toLowerCase().includes(q) ||
          String(entry?.invoice_number || "").toLowerCase().includes(q) ||
          String(entry?.reference_no || "").toLowerCase().includes(q)
        );
      });
    }

    if (filters.status !== "all") {
      rows = rows.filter((entry) => {
        const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
        return status === filters.status;
      });
    }

    if (filters.method !== "all") {
      rows = rows.filter((entry) => String(entry?.payment_method || "").toLowerCase() === filters.method);
    }

    rows.sort((a, b) => {
      if (filters.sort === "amountHigh") {
        return Number(b?.total_amount || 0) - Number(a?.total_amount || 0);
      }
      if (filters.sort === "amountLow") {
        return Number(a?.total_amount || 0) - Number(b?.total_amount || 0);
      }
      const aDate = new Date(a?.created_at || 0).getTime();
      const bDate = new Date(b?.created_at || 0).getTime();
      return bDate - aDate;
    });

    return rows;
  }, [filters, invoices, search]);

  const invoiceSummary = useMemo(() => {
    const rows = filteredInvoices;
    return {
      count: rows.length,
      total: rows.reduce((sum, entry) => sum + Number(entry?.total_amount || 0), 0),
      due: rows.reduce((sum, entry) => sum + Number(entry?.due_amount ?? entry?.total_amount ?? 0), 0),
      paid: rows.filter((entry) => {
        const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
        return status === "paid" || status === "completed";
      }).length,
    };
  }, [filteredInvoices]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(16,185,129,0.5)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">Finance Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Invoice register</h1>
              <p className="mt-3 text-sm text-emerald-50 md:text-base">
                Search, filter, and review invoice records with payment status and collection references.
              </p>
              {username ? <p className="mt-3 text-sm text-teal-100">Working as {username}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/accountant"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Back to Dashboard
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
            <p className="text-sm text-slate-500">Visible invoices</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{invoiceSummary.count}</p>
            <p className="mt-2 text-sm text-slate-500">Records matching your current finance filters.</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Recorded amount</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{formatCurrency(invoiceSummary.total)}</p>
            <p className="mt-2 text-sm text-emerald-700">Combined value of the visible invoices.</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Due amount</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{formatCurrency(invoiceSummary.due)}</p>
            <p className="mt-2 text-sm text-amber-700">Still open across unpaid or partial invoices.</p>
          </div>
          <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
            <p className="text-sm text-sky-700">Fully settled</p>
            <p className="mt-3 text-3xl font-bold text-sky-900">{invoiceSummary.paid}</p>
            <p className="mt-2 text-sm text-sky-700">Invoices already cleared in the visible list.</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Search and filter invoices</h2>
              <p className="text-sm text-slate-500">Find records by patient, invoice number, reference, or payment state.</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, invoice, or reference"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
            />

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="surgery_paid">Surgery Paid</option>
              <option value="bed_paid">Bed Paid</option>
            </select>

            <select
              name="method"
              value={filters.method}
              onChange={handleFilterChange}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">All methods</option>
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="insurance">Insurance</option>
            </select>

            <select
              name="sort"
              value={filters.sort}
              onChange={handleFilterChange}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="latest">Latest first</option>
              <option value="amountHigh">Amount high to low</option>
              <option value="amountLow">Amount low to high</option>
            </select>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Invoice list</h2>
              <p className="text-sm text-slate-500">Finance review table for recent and historical billing records.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${filteredInvoices.length} records`}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {filteredInvoices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
                No invoices match the current search or filters.
              </div>
            ) : (
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Invoice</th>
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((entry, index) => {
                    const status = entry?.payment_status || entry?.status || "unknown";
                    return (
                      <tr key={entry.id || index} className="border-b border-slate-100">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">
                            {entry.patient_name || `Patient #${entry.patient_id || "--"}`}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{entry.patient_id || "--"}</p>
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
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentTone(status)}`}>
                            {normalizeStatus(status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.payment_method || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.reference_no || "--"}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString("en-IN") : "--"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
