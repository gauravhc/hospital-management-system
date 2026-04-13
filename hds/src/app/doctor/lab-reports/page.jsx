"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FlaskConical, Loader2 } from "lucide-react";
import { apiGet } from "@/services/api";
import backendUrl from "@/lib/backendUrl";

const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function DoctorLabReportsPage() {
  const [doctorId, setDoctorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    try {
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      setDoctorId(String(parsed?.id || localStorage.getItem("id") || "").trim());
    } catch {
      setDoctorId(String(localStorage.getItem("id") || "").trim());
    }
  }, []);

  useEffect(() => {
    if (!doctorId) return;

    const loadReports = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet("/api/lab/reports", { doctor_id: doctorId });
        const list = Array.isArray(data?.data) ? data.data : [];
        setReports(list);
      } catch (err) {
        setError(err?.message || "Failed to load lab reports.");
        setReports([]);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, [doctorId]);

  const filteredReports = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((report) => {
      return (
        String(report?.title || "").toLowerCase().includes(q) ||
        String(report?.patient_name || report?.patient_id || "").toLowerCase().includes(q) ||
        String(report?.result_summary || report?.findings || "").toLowerCase().includes(q) ||
        String(report?.status || "").toLowerCase().includes(q)
      );
    });
  }, [reports, search]);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Doctor Desk</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Lab reports</h1>
          <p className="mt-3 text-sm text-sky-50 md:text-base">
            Review newly uploaded lab reports from the technician desk and open files directly from the doctor portal.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={surfaceCard}>
          <p className="text-sm text-slate-500">Total reports</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{reports.length}</p>
        </div>
        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
          <p className="text-sm text-emerald-700">Published</p>
          <p className="mt-3 text-3xl font-bold text-emerald-900">
            {reports.filter((report) => ["final", "completed"].includes(String(report?.status || "").toLowerCase())).length}
          </p>
        </div>
        <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.45)]">
          <p className="text-sm text-sky-700">With file</p>
          <p className="mt-3 text-3xl font-bold text-sky-900">{reports.filter((report) => report?.file_url).length}</p>
        </div>
      </section>

      <section className={surfaceCard}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient, report title, summary, or status"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
        />
      </section>

      <section className={surfaceCard}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Assigned reports</h2>
            <p className="text-sm text-slate-500">Reports uploaded by lab technicians and linked to your patients.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {loading ? "Loading..." : `${filteredReports.length} report(s)`}
          </span>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        <div className="mt-5 overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="animate-spin" size={18} />
              Loading lab reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
              No lab reports available for this doctor yet.
            </div>
          ) : (
            <table className="min-w-[860px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Report</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Summary</th>
                  <th className="px-4 py-3 font-semibold">File</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report, index) => (
                  <tr key={report.id || index} className="border-b border-slate-100">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-semibold text-slate-900">{report.patient_name || `Patient #${report.patient_id}`}</p>
                        <p className="mt-1 text-xs text-slate-500">Patient ID: {report.patient_id || "--"}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-900">
                        <FlaskConical size={16} className="text-sky-600" />
                        <span className="font-medium">{report.title || "Lab Report"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {normalizeStatus(report.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{report.result_summary || report.findings || "--"}</td>
                    <td className="px-4 py-3">
                      {report.file_url ? (
                        <a
                          href={backendUrl(report.file_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sky-700 hover:underline"
                        >
                          <FileText size={16} />
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
  );
}
