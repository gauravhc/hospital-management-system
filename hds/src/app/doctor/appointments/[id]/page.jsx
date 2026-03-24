"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, AlertTriangle } from "lucide-react";

import { apiGet, apiPut } from "@/services/api";

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled", "no_show"];

const cardClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";
const labelClass = "text-xs font-semibold text-slate-500 uppercase";
const valueClass = "mt-1 text-sm font-semibold text-slate-900";

export default function DoctorAppointmentManagePage() {
  const router = useRouter();
  const params = useParams();
  const appointmentId = useMemo(() => String(params?.id || "").trim(), [params]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [appointment, setAppointment] = useState(null);
  const [status, setStatus] = useState("scheduled");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "doctor") {
      router.push("/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const res = await apiGet(`/api/appointments/${appointmentId}`);
        const appt = res?.appointment || res?.data || null;
        if (!appt) throw new Error("Appointment not found");
        setAppointment(appt);
        setStatus(String(appt.status || "scheduled").toLowerCase());
        setNotes(appt.notes || appt.remarks || appt.note || "");
      } catch (err) {
        setError(err?.message || "Failed to load appointment.");
        setAppointment(null);
      } finally {
        setLoading(false);
      }
    };

    if (appointmentId) load();
  }, [appointmentId, router]);

  const save = async () => {
    if (!appointmentId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = { status };
      if (notes !== undefined) payload.notes = notes;
      const res = await apiPut(`/api/appointments/${appointmentId}`, payload);
      if (!res?.success) throw new Error(res?.message || "Failed to update appointment.");
      setAppointment((current) => (current ? { ...current, status, notes } : current));
      setMessage("Appointment updated.");
    } catch (err) {
      setError(err?.message || "Failed to update appointment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manage Appointment</h1>
              <p className="text-sm text-slate-500">Appointment ID: {appointmentId}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !appointment}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            {saving ? "Saving..." : "Save"}
          </button>
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

        {loading ? (
          <div className={`${cardClass} flex items-center gap-3 text-slate-600`}>
            <Loader2 className="animate-spin" size={18} />
            Loading appointment...
          </div>
        ) : !appointment ? (
          <div className={`${cardClass} flex items-center gap-3 text-slate-700`}>
            <AlertTriangle size={18} className="text-amber-600" />
            Appointment not available.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${cardClass} lg:col-span-2`}>
              <h2 className="text-lg font-bold text-slate-900">Details</h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <p className={labelClass}>Patient</p>
                  <p className={valueClass}>{appointment.patientName || appointment.patient_name || appointment.patient_id || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Doctor</p>
                  <p className={valueClass}>{appointment.doctorName || appointment.doctor_name || appointment.doctor_id || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Date</p>
                  <p className={valueClass}>{appointment.date || appointment.appointment_date || "--"}</p>
                </div>
                <div>
                  <p className={labelClass}>Time</p>
                  <p className={valueClass}>{appointment.time || appointment.appointment_time || "--"}</p>
                </div>
                <div className="md:col-span-2">
                  <p className={labelClass}>Symptoms</p>
                  <p className="mt-1 text-sm text-slate-700">{appointment.symptoms || "--"}</p>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h2 className="text-lg font-bold text-slate-900">Actions</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label className={labelClass}>Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={5}
                    className="mt-1 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    placeholder="Add remarks for this appointment..."
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="mt-0.5 text-slate-500" />
                    <p>Changes here update the appointment record. If you don&apos;t use notes in your schema, they will be ignored.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

