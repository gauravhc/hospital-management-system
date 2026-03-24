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

  const [nurses, setNurses] = useState([]);
  const [patients, setPatients] = useState([]);

  const [form, setForm] = useState({
    nurse_id: "",
    patient_id: "",
    task_title: "",
    description: "",
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
        const [nurseRes, patientRes] = await Promise.all([
          apiGet("/api/hospital/nurses"),
          apiGet("/api/hospital/patients"),
        ]);
        setNurses(Array.isArray(nurseRes?.data) ? nurseRes.data : []);
        setPatients(Array.isArray(patientRes?.data) ? patientRes.data : []);
      } catch (e) {
        setError(e?.message || "Failed to load nurses/patients.");
        setNurses([]);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const nurseOptions = useMemo(
    () =>
      (nurses || []).map((n) => ({
        id: n.id,
        label: n.full_name || n.name || n.email || String(n.id),
      })),
    [nurses]
  );

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

  const submit = async (e) => {
    e.preventDefault();
    setToast(null);
    setError("");

    if (!form.nurse_id || !form.patient_id || !form.task_title.trim()) {
      setToast({ type: "error", message: "Select nurse, patient, and enter task title." });
      return;
    }

    setSubmitting(true);
    try {
      await apiPost("/api/tasks/assign", {
        nurse_id: form.nurse_id,
        patient_id: form.patient_id,
        task_title: form.task_title.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });

      setToast({ type: "success", message: "Task assigned successfully" });
      setForm((prev) => ({ ...prev, task_title: "", description: "", priority: "medium" }));
    } catch (e2) {
      setToast({ type: "error", message: e2?.message || "Failed to assign task" });
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

      <h1 className="text-2xl font-bold text-slate-900">Assign Task to Nurse</h1>
      <p className="mt-1 text-sm text-slate-600">
        Assign a task to a nurse in your hospital. The nurse will see it instantly in their dashboard.
      </p>

      {loading ? <p className="mt-6 text-slate-600">Loading...</p> : null}
      {error ? <p className="mt-6 text-rose-600">{error}</p> : null}

      {!loading && !error ? (
        <form onSubmit={submit} className="mt-6 space-y-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="text-sm font-semibold text-slate-700">Nurse</label>
              <select
                name="nurse_id"
                value={form.nurse_id}
                onChange={onChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Select nurse</option>
                {nurseOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Task Title</label>
            <input
              name="task_title"
              value={form.task_title}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="e.g. Check Blood Pressure"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={onChange}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              rows={4}
              placeholder="e.g. Monitor BP every 2 hours"
            />
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
            {submitting ? "Assigning..." : "Assign Task"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

