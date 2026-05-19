"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, ClipboardList, Loader2, User } from "lucide-react";

import { apiGet } from "@/services/api";

function normalizeDate(dateValue) {
  if (!dateValue) return "";
  const raw = String(dateValue).trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function normalizeTime(timeValue) {
  if (!timeValue) return "";
  const raw = String(timeValue).trim();
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function getApptKey(appt) {
  const d = normalizeDate(appt?.appointment_date || appt?.date);
  const t = normalizeTime(appt?.appointment_time || appt?.time);
  return `${d}T${t || "00:00"}`;
}

function sortApptsDesc(a, b) {
  const aKey = getApptKey(a);
  const bKey = getApptKey(b);
  if (aKey === bKey) return 0;
  return aKey > bKey ? -1 : 1;
}

const toLower = (v) => String(v || "").trim().toLowerCase();

export default function DoctorPatientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const patientId = String(params?.id || "").trim();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "doctor") {
      router.push("/login");
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError("");

        const rawUser = localStorage.getItem("user");
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;
        const doctorUserId = String(parsedUser?.id || localStorage.getItem("id") || "").trim();

        const [patientRes, apptRes, plansRes] = await Promise.all([
          apiGet(`/api/patients/${patientId}`),
          apiGet("/api/appointments", { role: "doctor", userId: doctorUserId }),
          apiGet(`/api/tasks/patient/${patientId}`),
        ]);

        const patientRow = patientRes?.data || patientRes?.patient || patientRes || null;
        setPatient(patientRow);

        const appts = Array.isArray(apptRes?.appointments)
          ? apptRes.appointments
          : Array.isArray(apptRes?.data)
          ? apptRes.data
          : [];

        const filtered = appts
          .filter((a) => String(a?.patient_id || a?.patientId || a?.patient || "") === String(patientId))
          .sort(sortApptsDesc);

        setAppointments(filtered);

        const planRows = Array.isArray(plansRes?.data)
          ? plansRes.data
          : Array.isArray(plansRes?.plans)
          ? plansRes.plans
          : Array.isArray(plansRes)
          ? plansRes
          : [];
        setPlans(planRows);
      } catch (e) {
        console.error("DOCTOR PATIENT DETAILS LOAD ERROR:", e);
        setError(e?.message || "Failed to load patient details");
      } finally {
        setLoading(false);
      }
    };

    if (patientId) load();
  }, [patientId, router]);

  const followUpSummary = useMemo(() => {
    const followUps = appointments.filter((a) => {
      const type = toLower(a?.type || a?.appointment_type || a?.appointmentType);
      return type === "follow_up" || type === "follow-up" || type === "followup";
    });

    const next = followUps.find((a) => toLower(a?.status) !== "cancelled") || null;
    const attended = followUps.some((a) => toLower(a?.status) === "completed");

    return {
      nextDate: next ? normalizeDate(next?.appointment_date || next?.date) : "",
      nextTime: next ? normalizeTime(next?.appointment_time || next?.time) : "",
      attended,
      hasAny: followUps.length > 0,
    };
  }, [appointments]);

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push("/doctor/patients")}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          <ArrowLeft size={16} />
          Back
        </button>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <User />
          {patient?.full_name || patient?.name || "Patient"}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100">
          Patient ID: <span className="font-semibold text-white">{patientId}</span>
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <span className="inline-flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="animate-spin" size={16} />
            Loading...
          </span>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 text-slate-900">
                <CalendarClock size={18} />
                <h2 className="text-lg font-extrabold">Consultation History</h2>
              </div>

              {appointments.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No consultations found.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[760px] w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="py-2">Date</th>
                        <th className="py-2">Time</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((a) => (
                        <tr key={String(a.id || getApptKey(a))} className="border-t border-slate-100">
                          <td className="py-3 font-semibold text-slate-900">
                            {normalizeDate(a?.appointment_date || a?.date) || "--"}
                          </td>
                          <td className="py-3 text-slate-700">
                            {normalizeTime(a?.appointment_time || a?.time) || "--"}
                          </td>
                          <td className="py-3 text-slate-700">
                            {(a?.type || a?.appointment_type || a?.appointmentType || "consultation").toString()}
                          </td>
                          <td className="py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {a?.status || "--"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2 text-slate-900">
                <ClipboardList size={18} />
                <h2 className="text-lg font-extrabold">Next Follow-up</h2>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Status:</span>{" "}
                  {followUpSummary.attended ? "Attended" : followUpSummary.hasAny ? "Scheduled" : "Not scheduled"}
                </p>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Date:</span>{" "}
                  {followUpSummary.nextDate ? `${followUpSummary.nextDate} ${followUpSummary.nextTime || ""}`.trim() : "--"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <ClipboardList size={18} />
              <h2 className="text-lg font-extrabold">Prescription / Plan History</h2>
            </div>

            {plans.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">No plans found.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500">
                      <th className="py-2">Date</th>
                      <th className="py-2">Treatment</th>
                      <th className="py-2">Tests</th>
                      <th className="py-2">Priority</th>
                      <th className="py-2">Nurse</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Nurse Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => {
                      const tests = Array.isArray(p?.tests) ? p.tests : p?.tests ? [String(p.tests)] : [];
                      const when = p?.created_at ? String(p.created_at).split("T")[0] : "--";
                      const nurseLabel = p?.nurse_name || p?.nurse_email || p?.nurse_id || "--";
                      const nurseNotes = String(p?.nurse_notes || "").trim();
                      return (
                        <tr key={String(p.id || `${when}-${p.title || ""}`)} className="border-t border-slate-100">
                          <td className="py-3 font-semibold text-slate-900">{when}</td>
                          <td className="py-3 text-slate-700 whitespace-pre-wrap">{p?.treatment || "--"}</td>
                          <td className="py-3 text-slate-700">{tests.length ? tests.join(", ") : "--"}</td>
                          <td className="py-3 text-slate-700">{p?.priority || "--"}</td>
                          <td className="py-3 text-slate-700">{nurseLabel}</td>
                          <td className="py-3">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                              {p?.status || "--"}
                            </span>
                          </td>
                          <td className="py-3 text-slate-700 whitespace-pre-wrap max-w-[340px]">
                            {nurseNotes || "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
