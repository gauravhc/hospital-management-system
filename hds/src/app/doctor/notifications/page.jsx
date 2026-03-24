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

function normalizeTime(timeValue) {
  if (!timeValue) return "";
  const raw = String(timeValue).trim();
  if (!raw) return "";
  // Supports "HH:mm", "HH:mm:ss"
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function buildLocalDateTime(dateValue, timeValue) {
  const date = normalizeDate(dateValue);
  const time = normalizeTime(timeValue) || "00:00";
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

export default function DoctorNotificationsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [tick, setTick] = useState(Date.now());

  const doctorUserId = useMemo(() => {
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
      const res = await apiGet("/api/appointments", { role: "doctor", userId: doctorUserId });
      const list = Array.isArray(res?.appointments) ? res.appointments : Array.isArray(res?.data) ? res.data : [];
      setAppointments(list);
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "doctor") {
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
    const windowMinutes = 24 * 60;
    const items = (appointments || [])
      .map((appt) => {
        const dt = buildLocalDateTime(appt.date || appt.appointment_date, appt.time || appt.appointment_time);
        return { appt, dt };
      })
      .filter(({ appt, dt }) => {
        if (!dt) return false;
        const status = String(appt.status || "").toLowerCase();
        if (status && status !== "scheduled") return false;
        const diffMinutes = (dt.getTime() - now.getTime()) / 60000;
        // Show: recently started (last 30 min) or upcoming (next 24h)
        return diffMinutes >= -30 && diffMinutes <= windowMinutes;
      })
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())
      .map(({ appt, dt }) => {
        const diffMinutes = (dt.getTime() - now.getTime()) / 60000;
        const dateStr = normalizeDate(appt.date || appt.appointment_date) || "--";
        const timeStr = normalizeTime(appt.time || appt.appointment_time) || "--";
        const patientName = appt.patientName || appt.patient_name || appt.patient || "Patient";
        return {
          id: String(appt.id || appt.appointment_id || ""),
          diffMinutes,
          title: diffMinutes <= 5 && diffMinutes >= -5 ? "You have an appointment now" : "Upcoming appointment",
          message: `You have an appointment with ${patientName} at ${timeStr} on ${dateStr}.`,
          when: formatRelativeMinutes(diffMinutes),
          href: appt.id ? `/doctor/appointments/${appt.id}` : "/doctor/appointments",
        };
      });

    return items;
  }, [appointments, tick]);

  return (
    <div className="space-y-6">
      <div className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Doctor Notifications</h1>
            <p className="mt-1 text-sm text-slate-600">
              Alerts are generated from your scheduled appointments (next 24 hours).
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
            <h2 className="text-lg font-bold text-slate-900">Alerts</h2>
          </div>
          <Link href="/doctor/appointments" className="text-sm font-semibold text-sky-700 hover:underline">
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
              <div
                key={n.id || n.href}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
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
                    Manage
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
