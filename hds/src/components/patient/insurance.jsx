"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, UploadCloud } from "lucide-react";

import { apiGet, apiPost } from "@/services/api";

import { API_BASE_URL } from "@/lib/apiBaseUrl";

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
      } catch {
        setExisting(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [patientId]);

  const updateField = (name, value) => {
    setForm((prev) => {
      const isFile = ["aadhaar_photo", "pan_photo", "insurance_card_photo"].includes(name);
      return { ...prev, [name]: isFile ? value || null : value ?? "" };
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

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-6">
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
                  {existing.aadhaar_photo ? (
                    <a
                      className="text-sky-700 hover:underline"
                      href={toAbsoluteUrl(existing.aadhaar_photo)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Aadhaar photo
                    </a>
                  ) : null}
                  {existing.pan_photo ? (
                    <a
                      className="text-sky-700 hover:underline"
                      href={toAbsoluteUrl(existing.pan_photo)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      PAN photo
                    </a>
                  ) : null}
                  {existing.insurance_card_photo ? (
                    <a
                      className="text-sky-700 hover:underline"
                      href={toAbsoluteUrl(existing.insurance_card_photo)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Insurance card
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-extrabold text-slate-900">Step {step} of 2</div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-yellow-100 text-yellow-800" : "bg-slate-100"}`}>
                  Identity
                </span>
                <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-yellow-100 text-yellow-800" : "bg-slate-100"}`}>
                  Insurance
                </span>
              </div>
            </div>

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
    </div>
  );
}
