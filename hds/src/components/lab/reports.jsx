"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/services/api";
import backendUrl from "@/lib/backendUrl";

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function LabReportsPage() {
  const [username, setUsername] = useState("Lab Tech");
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "Lab Tech");
  }, []);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      try {
        const data = await apiGet("/api/lab/reports");
        const list = Array.isArray(data?.data) ? data.data : [];
        setReports(list);
      } catch (error) {
        console.error("Lab reports load error:", error);
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((report) => {
      return (
        String(report?.title || "").toLowerCase().includes(q) ||
        String(report?.patient_id || "").toLowerCase().includes(q) ||
        String(report?.doctor_id || "").toLowerCase().includes(q) ||
        String(report?.status || "").toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  const summary = useMemo(() => {
    return {
      total: reports.length,
      final: reports.filter((report) => String(report?.status || "").toLowerCase() === "final").length,
      completed: reports.filter((report) => String(report?.status || "").toLowerCase() === "completed").length,
    };
  }, [reports]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-blue-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(59,130,246,0.45)] md:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Lab Desk</p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Completed reports</h1>
            <p className="mt-3 text-sm text-sky-50 md:text-base">
              Review finalized lab reports and track what has already been published from the lab team.
            </p>
            <p className="mt-3 text-sm text-sky-100">Working as {username}</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Total reports</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
            <p className="text-sm text-sky-700">Final status</p>
            <p className="mt-3 text-3xl font-bold text-sky-900">{summary.final}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Completed status</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.completed}</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report title, patient, doctor, or status"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
          />
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Report archive</h2>
              <p className="text-sm text-slate-500">All current lab reports visible to the technician desk.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${filteredReports.length} report(s)`}
            </span>
          </div>

          <div className="mt-5 overflow-x-auto">
            {filteredReports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No reports found for the current search.
              </div>
            ) : (
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <th className="px-4 py-3 font-semibold">Title</th>
                    <th className="px-4 py-3 font-semibold">Patient</th>
                    <th className="px-4 py-3 font-semibold">Doctor</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Summary</th>
                    <th className="px-4 py-3 font-semibold">File</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report, index) => (
                    <tr key={report.id || index} className="border-b border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-900">{report.title || "Lab Report"}</td>
                      <td className="px-4 py-3 text-slate-700">{report.patient_id || "--"}</td>
                      <td className="px-4 py-3 text-slate-700">{report.doctor_id || "--"}</td>
                      <td className="px-4 py-3 text-slate-700">{normalizeStatus(report.status)}</td>
                      <td className="px-4 py-3 text-slate-700">{report.result_summary || report.findings || "--"}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {report.file_url ? (
                          <a
                            href={backendUrl(report.file_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-700 underline underline-offset-2"
                          >
                            Open file
                          </a>
                        ) : (
                          "--"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
