"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPut } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const paymentTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid" || normalized === "completed") return "bg-emerald-100 text-emerald-700";
  if (["partially_paid", "partial", "surgery_paid", "bed_paid"].includes(normalized)) return "bg-orange-100 text-orange-700";
  if (normalized === "pending" || normalized === "unpaid") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f7fcfb_0%,#edf7f5_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function AccountantCollections() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState("");
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [updateForm, setUpdateForm] = useState({});

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  const loadCollections = async () => {
    setLoading(true);
    try {
      const reportsData = await apiGet("/api/reports");
      const rows = Array.isArray(reportsData?.reports) ? reportsData.reports : [];
      setInvoices(rows);
      setUpdateForm(
        rows.reduce((acc, entry) => {
          acc[entry.id] = {
            payment_status: entry.payment_status || entry.status || "unpaid",
            payment_method: entry.payment_method || "cash",
            reference_no: entry.reference_no || "",
            settlement_scope: entry.settlement_scope || "full_bill",
            paid_amount: entry.paid_amount || "",
            payment_note: entry.payment_note || "",
          };
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Accountant collections error:", error);
      setInvoices([]);
      setUpdateForm({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCollections();
  }, []);

  const visibleInvoices = useMemo(() => {
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

    if (onlyOpen) {
      rows = rows.filter((entry) => {
        const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
        return ["pending", "unpaid", "partially_paid", "surgery_paid", "bed_paid"].includes(status);
      });
    }

    return rows.sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }, [invoices, onlyOpen, search]);

  const summary = useMemo(() => {
    return {
      count: visibleInvoices.length,
      due: visibleInvoices.reduce((sum, entry) => sum + Number(entry?.due_amount ?? entry?.total_amount ?? 0), 0),
      partial: visibleInvoices.filter((entry) => {
        const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
        return ["partially_paid", "surgery_paid", "bed_paid"].includes(status);
      }).length,
      unpaid: visibleInvoices.filter((entry) => {
        const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
        return ["pending", "unpaid"].includes(status);
      }).length,
    };
  }, [visibleInvoices]);

  const handleFieldChange = (invoiceId, field, value) => {
    setUpdateForm((prev) => ({
      ...prev,
      [invoiceId]: {
        ...(prev[invoiceId] || {}),
        [field]: value,
      },
    }));
  };

  const handleUpdate = async (invoice) => {
    const invoiceId = invoice?.id;
    if (!invoiceId) return;

    setFeedback({ type: "", text: "" });
    setUpdatingId(String(invoiceId));
    const formState = updateForm[invoiceId] || {};

    try {
      const payload = {
        status: formState.payment_status || invoice.payment_status || invoice.status || "unpaid",
        payment_status: formState.payment_status || invoice.payment_status || invoice.status || "unpaid",
        payment_method: formState.payment_method || invoice.payment_method || "cash",
        reference_no: formState.reference_no || "",
        settlement_scope: formState.settlement_scope || invoice.settlement_scope || "full_bill",
        paid_amount: formState.paid_amount || invoice.paid_amount || "",
        payment_note: formState.payment_note || "",
        amount: invoice.total_amount || invoice.grand_total || 0,
      };

      const data = await apiPut(`/api/billing/invoices/${invoiceId}/status`, payload);
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Failed to update collection." });
        return;
      }

      setFeedback({ type: "success", text: "Collection status updated successfully." });
      await loadCollections();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: error?.message || "Failed to update collection." });
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(16,185,129,0.5)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-100">Finance Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Collections and dues</h1>
              <p className="mt-3 text-sm text-emerald-50 md:text-base">
                Track unpaid invoices, review partial settlements, and update collection records when payments arrive later.
              </p>
              {username ? <p className="mt-3 text-sm text-teal-100">Working as {username}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/accountant/invoices"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Invoice Register
              </Link>
              <Link
                href="/register/billing"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Open Billing
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Visible collections</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.count}</p>
            <p className="mt-2 text-sm text-slate-500">Invoices currently in the finance follow-up view.</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Due value</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{formatCurrency(summary.due)}</p>
            <p className="mt-2 text-sm text-amber-700">Outstanding amount still open for collection.</p>
          </div>
          <div className="rounded-[28px] border border-orange-100 bg-orange-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(249,115,22,0.42)]">
            <p className="text-sm text-orange-700">Partial settlements</p>
            <p className="mt-3 text-3xl font-bold text-orange-900">{summary.partial}</p>
            <p className="mt-2 text-sm text-orange-700">Invoices cleared only in part so far.</p>
          </div>
          <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
            <p className="text-sm text-sky-700">Unpaid / pending</p>
            <p className="mt-3 text-3xl font-bold text-sky-900">{summary.unpaid}</p>
            <p className="mt-2 text-sm text-sky-700">Invoices still waiting for any collection update.</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Collections filter</h2>
              <p className="text-sm text-slate-500">Search invoice records and focus on collection work that still needs attention.</p>
            </div>
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={onlyOpen}
                onChange={(e) => setOnlyOpen(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Show only open invoices
            </label>
          </div>

          <div className="mt-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, invoice, or reference"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
            />
          </div>

          {feedback.text ? (
            <div className={`mt-4 rounded-2xl px-4 py-3 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
              {feedback.text}
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          {visibleInvoices.length === 0 ? (
            <div className={`${surfaceCard} border-dashed text-center text-sm text-slate-500`}>
              No collection records match the current filters.
            </div>
          ) : (
            visibleInvoices.map((invoice, index) => {
              const formState = updateForm[invoice.id] || {};
              const paymentStatus = formState.payment_status || invoice.payment_status || invoice.status || "unpaid";
              const settlementScope = formState.settlement_scope || invoice.settlement_scope || "full_bill";

              return (
                <div key={invoice.id || index} className={surfaceCard}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Collection record</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">
                        {invoice.invoice_number || `INV-${invoice.id || index + 1}`}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {invoice.patient_name || `Patient #${invoice.patient_id || "--"}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentTone(paymentStatus)}`}>
                        {normalizeStatus(paymentStatus)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {normalizeStatus(settlementScope)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total bill</p>
                      <p className="mt-2 font-semibold text-slate-900">{formatCurrency(invoice.total_amount || 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Due amount</p>
                      <p className="mt-2 font-semibold text-slate-900">{formatCurrency(invoice.due_amount ?? invoice.total_amount ?? 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Paid amount</p>
                      <p className="mt-2 font-semibold text-slate-900">{formatCurrency(invoice.paid_amount || 0)}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Method</p>
                      <p className="mt-2 font-semibold text-slate-900">{invoice.payment_method || "Unknown"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Reference</p>
                      <p className="mt-2 font-semibold text-slate-900">{invoice.reference_no || "--"}</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment status</label>
                        <select
                          value={formState.payment_status || invoice.payment_status || invoice.status || "unpaid"}
                          onChange={(e) => handleFieldChange(invoice.id, "payment_status", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="pending">Pending</option>
                          <option value="surgery_paid">Surgery Paid</option>
                          <option value="bed_paid">Bed Paid</option>
                          <option value="partially_paid">Partially Paid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Settlement type</label>
                        <select
                          value={settlementScope}
                          onChange={(e) => handleFieldChange(invoice.id, "settlement_scope", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <option value="full_bill">Full Bill</option>
                          <option value="surgery_only">Surgery Only</option>
                          <option value="bed_only">Bed Only</option>
                          <option value="custom">Custom Amount</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment method</label>
                        <select
                          value={formState.payment_method || invoice.payment_method || "cash"}
                          onChange={(e) => handleFieldChange(invoice.id, "payment_method", e.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        >
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                          <option value="insurance">Insurance</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Paid amount</label>
                        <input
                          type="number"
                          value={formState.paid_amount || ""}
                          onChange={(e) => handleFieldChange(invoice.id, "paid_amount", e.target.value)}
                          placeholder="Optional amount"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference / receipt</label>
                        <input
                          type="text"
                          value={formState.reference_no || ""}
                          onChange={(e) => handleFieldChange(invoice.id, "reference_no", e.target.value)}
                          placeholder="Reference number"
                          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_auto]">
                      <textarea
                        rows={3}
                        value={formState.payment_note || ""}
                        onChange={(e) => handleFieldChange(invoice.id, "payment_note", e.target.value)}
                        placeholder="Finance note for this collection update"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(invoice)}
                        disabled={updatingId === String(invoice.id)}
                        className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {updatingId === String(invoice.id) ? "Updating..." : "Update collection"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
