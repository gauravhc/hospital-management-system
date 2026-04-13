"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Calendar, Clock, Loader2, RefreshCw } from "lucide-react";

import { apiGet } from "@/services/api";

const cardClass = "rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm";

function normalizeDate(dateValue) {
  if (!dateValue) return "";
  const raw = String(dateValue).trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function to24HourTime(timeValue) {
  if (!timeValue) return "";
  const raw = String(timeValue).trim();
  if (!raw) return "";

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])?$/);
  if (!match) return "";

  const hourRaw = Number(match[1]);
  const minuteRaw = Number(match[2]);
  if (Number.isNaN(hourRaw) || Number.isNaN(minuteRaw)) return "";

  const ampm = match[4] ? match[4].toLowerCase() : "";
  let hour = hourRaw;
  if (ampm) {
    hour = hour % 12;
    if (ampm === "pm") hour += 12;
  }

  const hh = String(Math.max(0, Math.min(23, hour))).padStart(2, "0");
  const mm = String(Math.max(0, Math.min(59, minuteRaw))).padStart(2, "0");
  return `${hh}:${mm}`;
}

function displayTime(timeValue) {
  if (!timeValue) return "";
  const raw = String(timeValue).trim();
  if (!raw) return "";

  // Keep existing "10:00 AM" formats if present, otherwise show "HH:mm".
  if (/\b(am|pm)\b/i.test(raw)) return raw;
  return to24HourTime(raw) || raw;
}

function buildLocalDateTime(dateValue, timeValue) {
  const date = normalizeDate(dateValue);
  const time = to24HourTime(timeValue) || "00:00";
  if (date) {
    const dt = new Date(`${date}T${time}:00`);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const fallback = new Date(String(dateValue || ""));
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatRelativeMinutes(diffMinutes) {
  const mins = Math.round(diffMinutes);
  if (mins === 0) return "Now";
  if (mins > 0) return `In ${mins} min`;
  return `${Math.abs(mins)} min ago`;
}

function formatDateTime(value) {
  if (!value) return "";
  const dt = new Date(String(value));
  if (Number.isNaN(dt.getTime())) return String(value);
  return dt.toLocaleString();
}

function isActiveAppointmentStatus(statusValue) {
  const status = String(statusValue || "").trim().toLowerCase();
  if (!status) return true;
  return !["completed", "complete", "cancelled", "canceled", "rejected"].includes(status);
}

export default function PatientNotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [updates, setUpdates] = useState([]);
  const [tick, setTick] = useState(Date.now());

  const patientUserId = useMemo(() => {
    if (typeof window === "undefined") return "";
    const rawUser = localStorage.getItem("user");
    try {
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      return String(parsed?.id || localStorage.getItem("id") || "").trim();
    } catch {
      return String(localStorage.getItem("id") || "").trim();
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      if (!patientUserId) {
        throw new Error("Missing patient ID. Please log in again.");
      }

      const [appointmentsRes, updatesRes] = await Promise.allSettled([
        apiGet(`/api/appointments/patient/${patientUserId}`),
        apiGet("/api/notifications/me", { limit: 50 }),
      ]);

      if (appointmentsRes.status === "fulfilled") {
        const res = appointmentsRes.value;
        const list = Array.isArray(res?.appointments) ? res.appointments : Array.isArray(res?.data) ? res.data : [];
        setAppointments(list);
      } else {
        setAppointments([]);
      }

      if (updatesRes.status === "fulfilled") {
        const res = updatesRes.value;
        const list = Array.isArray(res?.notifications) ? res.notifications : Array.isArray(res?.data) ? res.data : [];
        setUpdates(list);
      } else {
        setUpdates([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
      setAppointments([]);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "patient") {
      router.push("/login");
      return;
    }

    load();
    const interval = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const notifications = useMemo(() => {
    const now = new Date(tick);
    const windowMinutes = 7 * 24 * 60;

    return (appointments || [])
      .map((appt) => {
        const dateValue = appt.date || appt.appointment_date;
        const timeValue = appt.time || appt.appointment_time;
        const dt = buildLocalDateTime(dateValue, timeValue);
        return { appt, dt, dateValue, timeValue };
      })
      .filter(({ appt, dt }) => {
        if (!dt) return false;
        if (!isActiveAppointmentStatus(appt.status)) return false;
        const diffMinutes = (dt.getTime() - now.getTime()) / 60000;
        // Show: recently started (last 30 min) or upcoming (next 7 days)
        return diffMinutes >= -30 && diffMinutes <= windowMinutes;
      })
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
      .map(({ appt, dt, dateValue, timeValue }) => {
        const diffMinutes = (dt.getTime() - now.getTime()) / 60000;
        const dateStr = normalizeDate(dateValue) || "--";
        const timeStr = displayTime(timeValue) || "--";
        const doctorName = appt.doctorName || appt.doctor_name || appt.doctor || "Doctor";

        return {
          id: String(appt.id || appt.appointment_id || ""),
          diffMinutes,
          title: diffMinutes <= 5 && diffMinutes >= -5 ? "You have an appointment now" : "Upcoming appointment",
          message: `You have an appointment with ${doctorName} at ${timeStr} on ${dateStr}.`,
          when: formatRelativeMinutes(diffMinutes),
          href: "/patient/appointments",
        };
      });
  }, [appointments, tick]);

  const updateItems = useMemo(() => {
    const list = Array.isArray(updates) ? updates : [];
    return list.map((n) => ({
      id: String(n.id || ""),
      message: String(n.message || "").trim(),
      status: String(n.status || "unread").toLowerCase(),
      createdAt: n.created_at || n.createdAt,
    }));
  }, [updates]);

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Patient Notifications</h1>
            <p className="mt-1 text-sm text-slate-600">
              Updates are generated when appointments are booked or their status changes.
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Updates</h2>
          </div>
          <Link href="/patient/appointments" className="text-sm font-semibold text-sky-700 hover:underline">
            View appointments
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            Loading updates...
          </div>
        ) : updateItems.length === 0 ? (
          <p className="mt-5 text-slate-600">No appointment updates yet.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {updateItems.map((n) => (
              <div key={n.id || n.createdAt} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">Appointment update</p>
                    <p className="mt-1 text-sm text-slate-600">{n.message || "Update"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} />
                        {formatDateTime(n.createdAt) || "—"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={14} />
                        {n.status === "read" ? "Read" : "New"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={cardClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">Alerts</h2>
          </div>
          <Link href="/patient/appointments" className="text-sm font-semibold text-sky-700 hover:underline">
            View appointments
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 flex items-center gap-3 text-slate-600">
            <Loader2 className="animate-spin" size={18} />
            Loading alerts...
          </div>
        ) : notifications.length === 0 ? (
          <p className="mt-5 text-slate-600">No new notifications right now.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {notifications.map((n) => (
              <div key={n.id || n.href} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{n.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{n.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock size={14} />
                        {n.when}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={14} />
                        Scheduled
                      </span>
                    </div>
                  </div>

                  <Link
                    href={n.href}
                    className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
