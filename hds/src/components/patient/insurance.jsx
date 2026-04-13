"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";

import { apiGet, apiPost } from "@/services/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function fileLabel(file) {
  if (!file) return "No file selected";
  return file.name || "Selected file";
}

function toAbsoluteUrl(pathValue) {
  const raw = String(pathValue || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${API_BASE_URL}${raw}`;
  return `${API_BASE_URL}/${raw}`;
}

export default function PatientInsurancePage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [existing, setExisting] = useState(null);

  const patientId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      return String(parsed?.id || localStorage.getItem("id") || "").trim();
    } catch {
      return String(localStorage.getItem("id") || "").trim();
    }
  }, []);

  const [form, setForm] = useState({
    aadhaar_number: "",
    pan_number: "",
    insurance_number: "",
    policy_id: "",
    validity_date: "",
    claim_amount: "",
    aadhaar_photo: null,
    pan_photo: null,
    insurance_card_photo: null,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        if (!patientId) return;
        const res = await apiGet(`/api/insurance/${patientId}`);
        if (res?.success && res?.data) {
          setExisting(res.data);
          setForm((prev) => ({
            ...prev,
            aadhaar_number: String(res.data.aadhaar_number || ""),
            pan_number: String(res.data.pan_number || ""),
            insurance_number: String(res.data.insurance_number || ""),
            policy_id: String(res.data.policy_id || ""),
            validity_date: res.data.validity_date ? String(res.data.validity_date).split("T")[0] : "",
            claim_amount:
              res.data.claim_amount === null || res.data.claim_amount === undefined
                ? ""
                : String(res.data.claim_amount),
          }));
        } else {
          setExisting(null);
        }
      } catch (err) {
        // Not fatal for first-time users.
        setExisting(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId]);

  const updateField = (name, value) => {
    setForm((p) => {
      const isFile = ["aadhaar_photo", "pan_photo", "insurance_card_photo"].includes(name);
      const nextValue = isFile ? value || null : value ?? "";
      return { ...p, [name]: nextValue };
    });
  };

  const validateStep1 = () => {
    const missing = [];
    if (!String(form.aadhaar_number || "").trim()) missing.push("Aadhaar number");
    if (!String(form.pan_number || "").trim()) missing.push("PAN number");
    if (!existing?.aadhaar_photo && !form.aadhaar_photo) missing.push("Aadhaar photo");
    if (!existing?.pan_photo && !form.pan_photo) missing.push("PAN photo");
    if (missing.length) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const missing = [];
    if (!String(form.insurance_number || "").trim()) missing.push("Insurance number");
    if (!String(form.policy_id || "").trim()) missing.push("Policy ID");
    if (!existing?.insurance_card_photo && !form.insurance_card_photo) missing.push("Insurance card");
    if (!String(form.validity_date || "").trim()) missing.push("Validity date");
    if (form.claim_amount === "" || Number.isNaN(Number(form.claim_amount))) missing.push("Claim amount");
    if (missing.length) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return false;
    }
    return true;
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      if (!validateStep1() || !validateStep2()) return;

      const fd = new FormData();
      fd.append("aadhaar_number", String(form.aadhaar_number).trim());
      fd.append("pan_number", String(form.pan_number).trim());
      fd.append("insurance_number", String(form.insurance_number).trim());
      fd.append("policy_id", String(form.policy_id).trim());
      fd.append("validity_date", String(form.validity_date).trim());
      fd.append("claim_amount", String(form.claim_amount).trim());

      if (form.aadhaar_photo) fd.append("aadhaar_photo", form.aadhaar_photo);
      if (form.pan_photo) fd.append("pan_photo", form.pan_photo);
      if (form.insurance_card_photo) fd.append("insurance_card_photo", form.insurance_card_photo);

      const res = await apiPost("/api/insurance", fd);
      if (!res?.success) throw new Error(res?.message || "Failed to save insurance details");

      setMessage("Insurance details saved successfully.");
      setStep(1);

      if (patientId) {
        const fresh = await apiGet(`/api/insurance/${patientId}`);
        setExisting(fresh?.data || null);
      }
    } catch (err) {
      setError(err?.message || "Failed to save insurance details.");
    } finally {
      setSaving(false);
    }
  };
=======
import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import useLiveCount from "./useLiveCount";
import backendUrl from "@/lib/backendUrl";
import { ExternalLink, Paperclip, PlusCircle } from "lucide-react";

const PatientInsurancePage = () => {
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
    setPolicies(policyRes.data || []);
    setInvoices(invoiceRes.data || invoiceRes.bills || []);
    setClaims(claimRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "invoice_id") {
        const selectedInvoice = invoices.find((invoice) => String(invoice?.id) === String(value || ""));
        if (selectedInvoice) {
          next.amount = String(selectedInvoice?.total_amount ?? selectedInvoice?.subtotal ?? prev.amount ?? "");
        }
      }
      return next;
    });
  };

  const submitClaim = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      const payload = new FormData();
      payload.append("invoice_id", form.invoice_id || "");
      payload.append("policy_id", form.policy_id || "");
      payload.append("amount", form.amount || "");
      payload.append("notes", form.notes || "");
      if (form.attachment) payload.append("attachment", form.attachment);
      await apiPost("/api/claims", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm({ invoice_id: "", policy_id: "", amount: "", notes: "", attachment: null });
      await load();
      setFeedback({ type: "success", message: "Claim submitted successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, attachment: file }));
  };

  const visibleClaims = claims.filter((claim) => {
    const policyOk =
      !claim?.policy_id || policies.some((policy) => String(policy?.id) === String(claim?.policy_id));
    const invoiceOk =
      !claim?.invoice_id || invoices.some((invoice) => String(invoice?.id) === String(claim?.invoice_id));
    return policyOk && invoiceOk;
  });

  const formatAmount = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }) : value;
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

  const formatStatus = (value) => {
    const status = String(value || "").toLowerCase();
    const label = status ? status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "--";
    const className =
      status === "approved"
        ? "bg-emerald-50 text-emerald-700"
        : status === "rejected"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
  };

  const getClaimDocumentUrl = (claim) =>
    claim?.attachment_url || claim?.document_url || claim?.file_url || claim?.attachment_path || claim?.file_path || "";
>>>>>>> 7fdfd7e (committing the changes)

  return (
    <div className="space-y-6 bg-slate-50 p-6 min-h-screen">
      <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-fuchsia-500 to-indigo-500 p-8 text-white shadow-lg">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <ShieldCheck />
          Insurance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-indigo-50">
          Upload identity and insurance details to enable claims workflow.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

<<<<<<< HEAD
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading insurance details...
          </div>
        ) : (
          <>
            {existing ? (
              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold">Last uploaded files</p>
                <div className="mt-2 grid gap-1 text-xs">
                  <a className="text-sky-700 hover:underline" href={toAbsoluteUrl(existing.aadhaar_photo)} target="_blank" rel="noreferrer">
                    Aadhaar photo
                  </a>
                  <a className="text-sky-700 hover:underline" href={toAbsoluteUrl(existing.pan_photo)} target="_blank" rel="noreferrer">
                    PAN photo
                  </a>
                  <a className="text-sky-700 hover:underline" href={toAbsoluteUrl(existing.insurance_card_photo)} target="_blank" rel="noreferrer">
                    Insurance card
                  </a>
                </div>
=======
          {/* HEADER */}
          <header className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                Claim Insurance
              </h2>
              <p className="text-slate-600">
                Submit your insurance claims and track the current review status.
              </p>
            </div>

            <div className="text-right p-4 bg-white/90 rounded-xl shadow border">
              <div className="text-sm text-slate-500">
                Active Claims
              </div>
              <div className="text-2xl font-bold text-sky-700">
                {Math.max(activeClaims, visibleClaims.length)}
              </div>
            </div>
          </header>

          {/* NEW CLAIM FORM */}
          <section className="bg-white/90 rounded-2xl shadow-xl p-8 border border-white/30">
            <h4 className="font-semibold mb-4 text-xl flex items-center gap-2">
              <PlusCircle size={20} /> New Claim
            </h4>

            {feedback ? (
              <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                {feedback.message}
              </div>
            ) : null}

            <form className="grid gap-4 md:grid-cols-2" onSubmit={submitClaim}>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Invoice</span>
                <select className="w-full rounded-xl border p-3" name="invoice_id" value={form.invoice_id} onChange={handleChange}>
                  <option value="">Select an invoice</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {formatInvoiceLabel(invoice)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Policy</span>
                <select className="w-full rounded-xl border p-3" name="policy_id" value={form.policy_id} onChange={handleChange}>
                  <option value="">Select a policy</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {formatPolicyLabel(policy)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold text-slate-700">Claim Amount</span>
                <input className="w-full rounded-xl border p-3" name="amount" value={form.amount} onChange={handleChange} type="number" min="0" step="0.01" placeholder="Enter claim amount" required />
              </label>

              <label className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Notes</span>
                <textarea className="w-full rounded-xl border p-3" name="notes" value={form.notes} onChange={handleChange} placeholder="Add supporting claim notes" />
              </label>

              <div className="block space-y-2 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700">Claim Document</span>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 transition hover:border-sky-400 hover:bg-sky-50">
                  <span className="inline-flex items-center gap-2">
                    <Paperclip size={16} />
                    {form.attachment ? form.attachment.name : "Upload PDF, JPG, PNG, or WEBP"}
                  </span>
                  <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">Choose File</span>
                  <input type="file" accept=".pdf,image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleAttachmentChange} />
                </label>
>>>>>>> 7fdfd7e (committing the changes)
              </div>
            ) : null}

<<<<<<< HEAD
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-900">
                Step {step} of 2
=======
              <div className="md:col-span-2 flex justify-end">
                <button disabled={busy || !form.policy_id || !form.amount} className="px-5 py-2 bg-sky-600 text-white rounded-xl shadow hover:bg-sky-700 transition disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? "Submitting..." : "Submit Claim"}
                </button>
>>>>>>> 7fdfd7e (committing the changes)
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-yellow-100 text-yellow-800" : "bg-slate-100"}`}>Identity</span>
                <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-yellow-100 text-yellow-800" : "bg-slate-100"}`}>Insurance</span>
              </div>
            </div>

<<<<<<< HEAD
            {step === 1 ? (
              <div key="insurance-step-1" className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Aadhaar number</label>
                  <input
                    value={form.aadhaar_number || ""}
                    onChange={(e) => updateField("aadhaar_number", e.target.value)}
                    className={inputClass}
                    placeholder="XXXX XXXX XXXX"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">PAN number</label>
                  <input
                    value={form.pan_number || ""}
                    onChange={(e) => updateField("pan_number", e.target.value)}
                    className={inputClass}
                    placeholder="ABCDE1234F"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Upload Aadhaar photo</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => updateField("aadhaar_photo", e.target.files?.[0] || null)}
                    className={inputClass}
                    required={!existing?.aadhaar_photo}
                  />
                  <p className="mt-1 text-xs text-slate-500">{fileLabel(form.aadhaar_photo)}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Upload PAN photo</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => updateField("pan_photo", e.target.files?.[0] || null)}
                    className={inputClass}
                    required={!existing?.pan_photo}
                  />
                  <p className="mt-1 text-xs text-slate-500">{fileLabel(form.pan_photo)}</p>
                </div>
              </div>
            ) : (
              <div key="insurance-step-2" className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Insurance number</label>
                  <input
                    value={form.insurance_number || ""}
                    onChange={(e) => updateField("insurance_number", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Policy ID</label>
                  <input
                    value={form.policy_id || ""}
                    onChange={(e) => updateField("policy_id", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Upload insurance card</label>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => updateField("insurance_card_photo", e.target.files?.[0] || null)}
                    className={inputClass}
                    required={!existing?.insurance_card_photo}
                  />
                  <p className="mt-1 text-xs text-slate-500">{fileLabel(form.insurance_card_photo)}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Validity date</label>
                  <input
                    type="date"
                    value={form.validity_date || ""}
                    onChange={(e) => updateField("validity_date", e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Claim amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.claim_amount ?? ""}
                    onChange={(e) => updateField("claim_amount", e.target.value)}
                    className={inputClass}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {step === 2 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setMessage("");
                    setStep(1);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Back
                </button>
              ) : null}

              {step === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setError("");
                    if (validateStep1()) setStep(2);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={submit}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                  {saving ? "Saving..." : "Save Insurance Details"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
=======
          <section className="mt-8 bg-white/90 rounded-2xl shadow-xl p-8 border border-white/30">
            <h4 className="font-semibold mb-4 text-xl">My Claims</h4>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-3 font-semibold">Policy</th>
                    <th className="px-3 py-3 font-semibold">Invoice</th>
                    <th className="px-3 py-3 font-semibold">Amount</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Document</th>
                    <th className="px-3 py-3 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleClaims.length ? (
                    visibleClaims.map((claim) => {
                      const policy = policies.find((item) => String(item.id) === String(claim.policy_id));
                      const invoice = invoices.find((item) => String(item.id) === String(claim.invoice_id));
                      return (
                        <tr key={claim.id} className="border-b border-slate-100">
                          <td className="px-3 py-3">{policy ? formatPolicyLabel(policy) : claim.policy_id || "--"}</td>
                          <td className="px-3 py-3">{invoice ? formatInvoiceLabel(invoice) : claim.invoice_id ? `Invoice ${claim.invoice_id}` : "--"}</td>
                          <td className="px-3 py-3">{formatAmount(claim.amount)}</td>
                          <td className="px-3 py-3">{formatStatus(claim.status)}</td>
                          <td className="px-3 py-3">
                            {getClaimDocumentUrl(claim) ? (
                              <a href={backendUrl(getClaimDocumentUrl(claim))} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                                <ExternalLink size={14} />
                                View File
                              </a>
                            ) : (
                              "--"
                            )}
                          </td>
                          <td className="px-3 py-3">{claim.notes || "--"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-slate-500">No claims submitted yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </main>
>>>>>>> 7fdfd7e (committing the changes)
    </div>
  );
}
