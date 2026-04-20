"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import useLiveCount from "./useLiveCount";
import backendUrl from "@/lib/backendUrl";
import { ExternalLink, Paperclip, PlusCircle } from "lucide-react";

const getClaimDocumentUrl = (claim) =>
  claim?.attachment_url ||
  claim?.document_url ||
  claim?.file_url ||
  claim?.attachment_path ||
  claim?.file_path ||
  "";

const formatAmount = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  const num = Number(value);
  return Number.isFinite(num)
    ? num.toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      })
    : String(value);
};

const formatStatus = (value) => {
  const status = String(value || "").toLowerCase();
  const label = status
    ? status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase())
    : "--";

  const className =
    status === "approved"
      ? "bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};

export default function PatientInsurancePage() {
  const activeClaims = useLiveCount("/api/claims/active/count", 30000);
  const [policies, setPolicies] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [claims, setClaims] = useState([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    invoice_id: "",
    policy_id: "",
    amount: "",
    notes: "",
    attachment: null,
  });

  const load = async () => {
    const [policyRes, invoiceRes, claimRes] = await Promise.all([
      apiGet("/api/insurance/policies"),
      apiGet("/api/patients/bills"),
      apiGet("/api/claims"),
    ]);

    setPolicies(policyRes?.data || []);
    setInvoices(invoiceRes?.data || invoiceRes?.bills || []);
    setClaims(claimRes?.data || []);
  };

  useEffect(() => {
    load().catch((error) =>
      setFeedback({
        type: "error",
        message: error?.message || "Failed to load insurance data",
      })
    );
  }, []);

  const policyById = useMemo(() => {
    const map = new Map();
    for (const policy of policies) map.set(String(policy?.id), policy);
    return map;
  }, [policies]);

  const invoiceById = useMemo(() => {
    const map = new Map();
    for (const invoice of invoices) map.set(String(invoice?.id), invoice);
    return map;
  }, [invoices]);

  const visibleClaims = useMemo(() => {
    return (claims || []).filter((claim) => {
      const policyOk =
        !claim?.policy_id ||
        policies.some((policy) => String(policy?.id) === String(claim?.policy_id));
      const invoiceOk =
        !claim?.invoice_id ||
        invoices.some((invoice) => String(invoice?.id) === String(claim?.invoice_id));
      return policyOk && invoiceOk;
    });
  }, [claims, invoices, policies]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "invoice_id") {
        const selectedInvoice = invoices.find(
          (invoice) => String(invoice?.id) === String(value || "")
        );
        if (selectedInvoice) {
          next.amount = String(
            selectedInvoice?.total_amount ?? selectedInvoice?.subtotal ?? prev.amount ?? ""
          );
        }
      }
      return next;
    });
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, attachment: file }));
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setFeedback(null);

      const payload = new FormData();
      payload.append("invoice_id", form.invoice_id || "");
      payload.append("policy_id", form.policy_id || "");
      payload.append("amount", form.amount || "");
      payload.append("notes", form.notes || "");
      if (form.attachment) payload.append("attachment", form.attachment);

      await apiPost("/api/claims", payload);

      setForm({
        invoice_id: "",
        policy_id: "",
        amount: "",
        notes: "",
        attachment: null,
      });

      await load();
      setFeedback({ type: "success", message: "Claim submitted successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error?.message || "Failed to submit claim" });
    } finally {
      setBusy(false);
    }
  };

  const formatPolicyLabel = (policy) => {
    if (!policy) return "--";
    const provider = policy?.provider_name || "--";
    const name = policy?.policy_name || policy?.policy_number || policy?.id;
    return `${provider} - ${name}`;
  };

  const formatInvoiceLabel = (invoice) => {
    if (!invoice) return "--";
    const amount = invoice?.total_amount ?? invoice?.subtotal;
    return amount !== null && amount !== undefined && amount !== ""
      ? `Invoice ${invoice.id} - ${formatAmount(amount)}`
      : `Invoice ${invoice.id}`;
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-3xl bg-slate-900 px-6 py-7 text-white shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-extrabold">Insurance Claims</h1>
              <p className="mt-1 text-sm text-slate-200">Submit new claims and track approvals.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">
                Active claims
              </p>
              <p className="mt-1 text-2xl font-extrabold">
                {Math.max(activeClaims, visibleClaims.length)}
              </p>
            </div>
          </div>
        </header>

        {feedback ? (
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <PlusCircle size={18} /> New Claim
          </h2>

          <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submitClaim}>
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Invoice</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                name="invoice_id"
                value={form.invoice_id}
                onChange={handleChange}
              >
                <option value="">Select invoice</option>
                {invoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {formatInvoiceLabel(invoice)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Policy</span>
              <select
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                name="policy_id"
                value={form.policy_id}
                onChange={handleChange}
              >
                <option value="">Select policy</option>
                {policies.map((policy) => (
                  <option key={policy.id} value={policy.id}>
                    {formatPolicyLabel(policy)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Amount</span>
              <input
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                name="amount"
                value={form.amount}
                onChange={handleChange}
                type="number"
                min="0"
                step="0.01"
                placeholder="Claim amount"
                required
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Notes</span>
              <textarea
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Optional notes"
                rows={3}
              />
            </label>

            <div className="space-y-2 md:col-span-2">
              <span className="text-sm font-bold text-slate-700">Attachment</span>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 hover:border-sky-400 hover:bg-sky-50">
                <span className="inline-flex items-center gap-2">
                  <Paperclip size={16} />
                  {form.attachment ? form.attachment.name : "Upload PDF/JPG/PNG/WEBP"}
                </span>
                <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-extrabold shadow-sm">
                  Choose
                </span>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleAttachmentChange}
                />
              </label>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                disabled={busy || !form.policy_id || !form.amount}
                className="rounded-2xl bg-sky-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-sky-700 disabled:opacity-60"
              >
                {busy ? "Submitting..." : "Submit Claim"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-slate-900">My Claims</h2>
          {visibleClaims.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No claims yet.</p>
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="min-w-[900px] w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Policy</th>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Document</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClaims.map((claim) => {
                    const policy = claim?.policy_id
                      ? policyById.get(String(claim.policy_id))
                      : null;
                    const invoice = claim?.invoice_id
                      ? invoiceById.get(String(claim.invoice_id))
                      : null;

                    const docUrl = getClaimDocumentUrl(claim);
                    const claimAmount = claim?.amount ?? claim?.claim_amount;

                    return (
                      <tr
                        key={claim?.id || `${claim?.policy_id}-${claim?.invoice_id}-${claimAmount}`}
                        className="border-t border-slate-100"
                      >
                        <td className="py-3 pr-3 font-semibold text-slate-900">
                          {claim?.id ?? "--"}
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {formatPolicyLabel(policy)}
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {formatInvoiceLabel(invoice)}
                        </td>
                        <td className="py-3 pr-3 text-slate-700">
                          {formatAmount(claimAmount)}
                        </td>
                        <td className="py-3 pr-3">{formatStatus(claim?.status)}</td>
                        <td className="py-3 pr-3">
                          {docUrl ? (
                            <a
                              className="inline-flex items-center gap-1 font-bold text-sky-700 hover:underline"
                              href={backendUrl(docUrl)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View <ExternalLink size={14} />
                            </a>
                          ) : (
                            <span className="text-slate-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
