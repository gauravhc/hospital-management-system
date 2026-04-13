"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

export default function DoctorAssignTaskPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

  const [assignees, setAssignees] = useState([]);
  const [patients, setPatients] = useState([]);

  const [form, setForm] = useState({
    patient_id: "",
    treatment: "",
    tests: [],
    priority: "medium",
  });

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || (role !== "doctor" && role !== "hospital_admin" && role !== "super_admin")) {
      router.push("/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [assigneeRes, patientRes] = await Promise.all([
          apiGet("/api/hospital/nurses"),
          apiGet("/api/hospital/patients"),
        ]);

        setAssignees(Array.isArray(assigneeRes?.data) ? assigneeRes.data : []);
        setPatients(Array.isArray(patientRes?.data) ? patientRes.data : []);
      } catch (e) {
        setError(e?.message || "Failed to load data.");
        setAssignees([]);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const defaultAssigneeId = useMemo(() => {
    const first = Array.isArray(assignees) ? assignees[0] : null;
    return first?.id || first?.nurse_id || first?.user_id || "";
  }, [assignees]);

  const patientOptions = useMemo(
    () =>
      (patients || []).map((p) => ({
        id: p.id,
        label: p.full_name || p.name || p.email || String(p.id),
      })),
    [patients]
  );

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onTestsChange = (e) => {
    const selected = Array.from(e.target.selectedOptions || []).map((opt) => opt.value);
    setForm((prev) => ({ ...prev, tests: selected }));
  };

  const TEST_OPTIONS = [
    "CBC",
    "CRP",
    "ESR",
    "Blood Sugar (FBS)",
    "Blood Sugar (PPBS)",
    "HbA1c",
    "LFT",
    "RFT",
    "Lipid Profile",
    "TSH",
    "Urine Routine",
    "ECG",
    "X-Ray",
    "Ultrasound",
  ];

  const submit = async (e) => {
    e.preventDefault();
    setToast(null);
    setError("");

    if (!form.patient_id || !form.treatment.trim()) {
      setToast({ type: "error", message: "Select patient and enter treatment." });
      return;
    }

    setSubmitting(true);
    try {
      if (!defaultAssigneeId) {
        setToast({ type: "error", message: "No staff available for this hospital." });
        return;
      }

      const selectedTests = Array.isArray(form.tests) ? form.tests : [];
      const descriptionLines = [
        `Treatment: ${form.treatment.trim()}`,
        selectedTests.length ? `Tests: ${selectedTests.join(", ")}` : null,
      ].filter(Boolean);

      await apiPost("/api/tasks/assign", {
        nurse_id: defaultAssigneeId,
        patient_id: form.patient_id,
        task_title: "Treatment & Tests",
        description: descriptionLines.join("\n"),
        treatment: form.treatment.trim(),
        tests: form.tests,
        priority: form.priority,
      });

      setToast({ type: "success", message: "Saved successfully" });
      setForm((prev) => ({ ...prev, treatment: "", tests: [], priority: "medium" }));
    } catch (e2) {
      setToast({ type: "error", message: e2?.message || "Failed to save" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white/90 border rounded-2xl p-8 shadow">
      {toast ? (
        <div className="fixed right-5 top-5 z-[9999]">
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <h1 className="text-2xl font-bold text-slate-900">Treatment & Tests</h1>
      <p className="mt-1 text-sm text-slate-600">
        Add treatment instructions and select recommended tests for the patient.
      </p>

      {loading ? <p className="mt-6 text-slate-600">Loading...</p> : null}
      {error ? <p className="mt-6 text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <form onSubmit={submit} className="mt-6 space-y-4 max-w-2xl">
          <div>
            <label className="text-sm font-semibold text-slate-700">Patient</label>
            <select
              name="patient_id"
              value={form.patient_id}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Select patient</option>
              {patientOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Treatment</label>
            <textarea
              name="treatment"
              value={form.treatment}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={4}
              placeholder="e.g. Start antibiotics, hydration, monitor vitals..."
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Tests</label>
            <select
              multiple
              value={form.tests}
              onChange={onTestsChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm min-h-[120px]"
            >
              {TEST_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Hold Ctrl/Cmd to select multiple.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
