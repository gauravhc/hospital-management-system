"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

const todayDate = () => new Date().toISOString().split("T")[0];

const formatTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "--";
  if (raw.includes("AM") || raw.includes("PM")) return raw;
  const [hourText = "00", minuteText = "00"] = raw.split(":");
  const hour = Number(hourText);
  const minute = String(minuteText).slice(0, 2);
  if (Number.isNaN(hour)) return raw;
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}:${minute} ${suffix}`;
};

const startOfToday = () => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
};

const createLocalDateTime = (dateValue, timeValue) => {
  const datePart = String(dateValue || "").split("T")[0];
  const timePart = String(timeValue || "00:00").slice(0, 5);
  if (!datePart) return null;
  const candidate = new Date(`${datePart}T${timePart}:00`);
  return Number.isNaN(candidate.getTime()) ? null : candidate;
};

const paymentTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "urgent") return "bg-rose-100 text-rose-700";
  if (normalized === "warning") return "bg-amber-100 text-amber-700";
  return "bg-sky-100 text-sky-700";
};

export default function RegisterNotificationsPage() {
  const [username, setUsername] = useState("");
  const [selectedDate, setSelectedDate] = useState(todayDate());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet("/api/register/dashboard", { date: selectedDate });
        if (!data?.success) {
          throw new Error(data?.message || "Failed to load reception notifications.");
        }
        setAppointments(Array.isArray(data.list) ? data.list : []);
      } catch (err) {
        console.error(err);
        setAppointments([]);
        setError(err?.message || "Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, [selectedDate]);

  const notificationItems = useMemo(() => {
    const now = new Date();
    const today = startOfToday();

    return appointments
      .map((entry, index) => {
        const status = String(entry?.status || "").toLowerCase();
        const paymentStatus = String(entry?.paymentStatus || entry?.payment_status || "pending").toLowerCase();
        const patientName = entry?.patientName || entry?.patient_name || "Patient";
        const doctorName = entry?.doctorName || entry?.doctor_name || "Doctor";
        const when = createLocalDateTime(entry?.date || entry?.appointment_date, entry?.time || entry?.appointment_time);
        const minutesUntil = when ? Math.round((when.getTime() - now.getTime()) / 60000) : null;
        const isToday = when ? when >= today : false;

        let tone = "info";
        let title = "Scheduled appointment";
        let message = `${patientName} is booked with ${doctorName} at ${formatTime(entry?.time || entry?.appointment_time)}.`;

        if (minutesUntil !== null && minutesUntil >= 0 && minutesUntil <= 30 && isToday) {
          tone = "urgent";
          title = "Upcoming soon";
          message = `${patientName} is due in the next ${minutesUntil} minute${minutesUntil === 1 ? "" : "s"} with ${doctorName}.`;
        } else if (minutesUntil !== null && minutesUntil < 0 && status !== "completed" && isToday) {
          tone = "warning";
          title = "Follow-up needed";
          message = `${patientName}'s appointment time has passed. Confirm check-in or reschedule if needed.`;
        } else if (status === "cancelled") {
          tone = "warning";
          title = "Cancelled appointment";
          message = `${patientName}'s appointment with ${doctorName} has been cancelled.`;
        }

        if (paymentStatus === "pending" || paymentStatus === "unpaid") {
          tone = tone === "urgent" ? "urgent" : "warning";
          message += ` Payment status is ${paymentStatus}.`;
        }

        return {
          id: `${entry?.id || index}`,
          tone,
          title,
          message,
          patientName,
          doctorName,
          time: formatTime(entry?.time || entry?.appointment_time),
          patientId: entry?.patient_id || "",
          paymentStatus,
        };
      })
      .sort((a, b) => {
        const order = { urgent: 0, warning: 1, info: 2 };
        return (order[a.tone] ?? 9) - (order[b.tone] ?? 9);
      });
  }, [appointments]);

  const summary = useMemo(() => {
    return notificationItems.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.tone === "urgent") acc.urgent += 1;
        if (item.paymentStatus === "pending" || item.paymentStatus === "unpaid") acc.payment += 1;
        return acc;
      },
      { total: 0, urgent: 0, payment: 0 }
    );
  }, [notificationItems]);

  return (
    <div className="min-h-screen space-y-6 bg-slate-50 p-4 md:p-8">
      <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-800 to-sky-700 px-6 py-7 text-white shadow-xl md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">
              Reception Desk
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Notifications and alerts</h1>
            <p className="mt-3 max-w-2xl text-sm text-sky-50 md:text-base">
              Stay ahead of today&apos;s front-desk work with appointment reminders, payment follow-ups, and queue alerts.
            </p>
            {username ? <p className="mt-3 text-sm text-sky-100">Working as {username}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register/registration"
              className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Appointment Intake
            </Link>
            <Link
              href="/register"
              className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total alerts</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl bg-rose-50 p-5 shadow-sm ring-1 ring-rose-100">
          <p className="text-sm text-rose-700">Urgent now</p>
          <p className="mt-2 text-3xl font-bold text-rose-900">{summary.urgent}</p>
        </div>
        <div className="rounded-2xl bg-amber-50 p-5 shadow-sm ring-1 ring-amber-100">
          <p className="text-sm text-amber-700">Payment follow-up</p>
          <p className="mt-2 text-3xl font-bold text-amber-900">{summary.payment}</p>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Today&apos;s alert feed</h2>
            <p className="text-sm text-slate-500">
              Alerts are derived from the receptionist appointment queue for the selected date.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-500">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">
            Loading notification feed...
          </div>
        ) : notificationItems.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
            <p className="text-base font-medium text-slate-700">No alerts for this date</p>
            <p className="mt-2 text-sm text-slate-500">
              When appointments exist, front-desk reminders and payment follow-ups will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {notificationItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentTone(
                          item.tone
                        )}`}
                      >
                        {item.title}
                      </span>
                      <span className="text-xs text-slate-500">{item.time}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-700">{item.message}</p>
                    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>Patient: {item.patientName}</span>
                      <span>Doctor: {item.doctorName}</span>
                      <span className="capitalize">Payment: {item.paymentStatus}</span>
                    </div>
                  </div>

                  {item.patientId ? (
                    <Link
                      href={`/register/registration?patient_id=${item.patientId}`}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                    >
                      Open patient
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
