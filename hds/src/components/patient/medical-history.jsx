"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2, Save } from "lucide-react";

import { apiGet, apiPost } from "@/services/api";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function PatientMedicalHistoryPage() {
  const [form, setForm] = useState({
    medications: "",
    condition: "",
    allergies: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiGet("/api/patients/medical-history");
        if (response?.success) {
          setForm({
            medications: response.medications || "",
            condition: response.condition || response.diagnosis || "",
            allergies: response.allergies || "",
            notes: response.notes || "",
          });
        }
      } catch (loadError) {
        console.error("PATIENT MEDICAL HISTORY LOAD ERROR:", loadError);
        setError(loadError?.message || "Failed to load medical history");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await apiPost("/api/patients/medical-history", form);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to save medical history");
      }
      setMessage("Medical history saved successfully.");
    } catch (saveError) {
      setError(saveError?.message || "Failed to save medical history");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-500 p-8 text-white shadow-lg">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <HeartPulse />
          Medical History
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-orange-50">
          Maintain your allergies, chronic conditions, surgeries, medications, and care notes.
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

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="animate-spin" size={16} />
            Loading medical history...
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Condition</label>
                <textarea
                  name="condition"
                  value={form.condition}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Allergies</label>
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Medications</label>
                <textarea
                  name="medications"
                  value={form.medications}
                  onChange={handleChange}
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={5}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Medical History"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
