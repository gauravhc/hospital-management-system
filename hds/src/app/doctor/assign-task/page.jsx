"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";
import { LAB_TESTS_FLAT } from "@/data/labTests";

export default function DoctorAssignTaskPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState("");

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
        const patientRes = await apiGet("/api/hospital/patients");
        setPatients(Array.isArray(patientRes?.data) ? patientRes.data : []);
      } catch (e) {
        setError(e?.message || "Failed to load data.");
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

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

  const TEST_OPTIONS = useMemo(() => LAB_TESTS_FLAT.map((t) => t.name), []);

  const toggleTest = (testName) => {
    const name = String(testName || "").trim();
    if (!name) return;

    setForm((prev) => {
      const alreadySelected = prev.tests.includes(name);
      if (alreadySelected) {
        return { ...prev, tests: prev.tests.filter((t) => t !== name) };
      }

      if (prev.tests.length >= 2) {
        setToast({ type: "error", message: "You can select up to 2 tests." });
        return prev;
      }

      return { ...prev, tests: [...prev.tests, name] };
    });
  };

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
      await apiPost("/api/tasks", {
        patient_id: form.patient_id,
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
            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-auto pr-1">
                {TEST_OPTIONS.map((t) => {
                  const checked = form.tests.includes(t);
                  const disabled = !checked && form.tests.length >= 2;
                  return (
                    <label
                      key={t}
                      className={`flex items-start gap-2 text-sm ${disabled ? "opacity-60" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleTest(t)}
                        className="mt-1"
                      />
                      <span>{t}</span>
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Select up to 2 tests ({form.tests.length}/2).
              </p>
            </div>
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
