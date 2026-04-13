"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/services/api";
import { AlertCircle, BellRing, CheckCircle2, Clock3, FileText } from "lucide-react";

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const isUrgent = (row) => {
  const text = `${row?.notes || ""} ${row?.comments || ""}`.toLowerCase();
  return text.includes("urgent") || text.includes("stat");
};

export default function LabNotificationsPage() {
  const [username, setUsername] = useState("Lab Tech");
  const [tests, setTests] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "Lab Tech");
  }, []);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        const [testsResponse, reportsResponse] = await Promise.all([
          apiGet("/api/lab"),
          apiGet("/api/lab/reports"),
        ]);

        setTests(Array.isArray(testsResponse?.data) ? testsResponse.data : []);
        setReports(Array.isArray(reportsResponse?.data) ? reportsResponse.data : []);
      } catch (error) {
        console.error("Lab notifications load error:", error);
        setTests([]);
        setReports([]);
      }
    };

    loadFeed();
  }, []);

  const alerts = useMemo(() => {
    const pending = tests
      .filter((row) => String(row?.status || "").toLowerCase() === "pending")
      .slice(0, 6)
      .map((row) => ({
        id: `pending-${row.id}`,
        tone: isUrgent(row) ? "urgent" : "pending",
        title: isUrgent(row) ? "Urgent lab request waiting" : "Pending lab request",
        detail: `${row.testName || row.test_name || "Lab Test"} for ${row.patientName || "patient"}`,
        meta: `Requested by ${row.doctorName || "doctor"}`,
      }));

    const completed = reports.slice(0, 4).map((row) => ({
      id: `report-${row.id}`,
      tone: "completed",
      title: "Report available in archive",
      detail: row.title || "Lab Report",
      meta: row.patient_id ? `Patient ${row.patient_id}` : "Published report",
    }));

    return [...pending, ...completed];
  }, [reports, tests]);

  const summary = useMemo(() => {
    const urgent = tests.filter((row) => isUrgent(row) && String(row?.status || "").toLowerCase() !== "completed").length;
    const pending = tests.filter((row) => String(row?.status || "").toLowerCase() === "pending").length;
    const completed = reports.length;

    return { urgent, pending, completed };
  }, [reports, tests]);

  const toneClass = (tone) => {
    if (tone === "urgent") return "border-rose-200 bg-rose-50 text-rose-700";
    if (tone === "completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-amber-200 bg-amber-50 text-amber-700";
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-blue-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(59,130,246,0.45)] md:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Lab Desk</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Notifications</h1>
            <p className="mt-3 text-sm text-sky-50 md:text-base">
              A technician-focused alert feed for pending tests, urgent requests, and newly available reports.
            </p>
            <p className="mt-3 text-sm text-sky-100">Working as {username}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Visible alerts</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{alerts.length}</p>
          </div>
          <div className="rounded-[28px] border border-rose-100 bg-rose-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(244,63,94,0.45)]">
            <p className="text-sm text-rose-700">Urgent follow-up</p>
            <p className="mt-3 text-3xl font-bold text-rose-900">{summary.urgent}</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Pending requests</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Available reports</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.completed}</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Technician alert feed</h2>
              <p className="text-sm text-slate-500">Use this page to spot urgent tests first and keep the report workflow moving.</p>
            </div>
            <BellRing className="h-5 w-5 text-sky-600" />
          </div>

          <div className="mt-5 space-y-3">
            {alerts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No lab notifications right now.
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className={`rounded-2xl border px-4 py-4 ${toneClass(alert.tone)}`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.tone === "urgent" ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : alert.tone === "completed" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Clock3 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{alert.title}</p>
                      <p className="mt-1 text-sm">{alert.detail}</p>
                      <p className="mt-1 text-xs opacity-80">{alert.meta}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Urgent request notes</h2>
                <p className="text-sm text-slate-500">Requests flagged by comments like urgent or stat.</p>
              </div>
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>

            <div className="mt-5 space-y-3">
              {tests.filter((row) => isUrgent(row)).slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4">
                  <p className="font-semibold text-rose-800">{row.testName || row.test_name || "Lab Test"}</p>
                  <p className="mt-1 text-sm text-rose-700">{row.patientName || "--"} | {row.doctorName || "--"}</p>
                  <p className="mt-1 text-xs text-rose-600">{row.notes || row.comments || "Urgent note available"}</p>
                </div>
              ))}
              {!tests.some((row) => isUrgent(row)) ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No urgent requests are flagged right now.
                </div>
              ) : null}
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Recent report activity</h2>
                <p className="text-sm text-slate-500">Most recent archived reports visible to the lab desk.</p>
              </div>
              <FileText className="h-5 w-5 text-sky-600" />
            </div>

            <div className="mt-5 space-y-3">
              {reports.slice(0, 5).map((row) => (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                  <p className="font-semibold text-slate-900">{row.title || "Lab Report"}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {row.patient_id ? `Patient ${row.patient_id}` : "Patient report"} | {row.status || "final"}
                  </p>
                </div>
              ))}
              {!reports.length ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No completed reports in the archive yet.
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
