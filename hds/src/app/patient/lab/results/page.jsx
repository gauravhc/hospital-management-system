"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiGet } from "@/services/api";

const resolveReportUrl = (report) =>
  report?.file_url || report?.file_path || report?.report_url || report?.result || "";

export default function PatientLabResultsPage() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await apiGet("/api/patients/lab-reports");
        const list = Array.isArray(response?.lab_reports)
          ? response.lab_reports
          : Array.isArray(response?.data)
            ? response.data
            : [];
        setReports(list);
      } catch (error) {
        console.error("Patient lab results load error:", error);
        setReports([]);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen">
      <main
        className="px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-5xl mx-auto bg-white/90 border rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-extrabold text-slate-900">Lab Results</h1>
          <p className="text-slate-600 mt-2">
            Your uploaded and processed reports will appear here.
          </p>

          <div className="mt-6 space-y-4">
            {reports.length ? (
              reports.map((report) => (
                <div key={report.id || report.report_id} className="rounded-xl border p-5 bg-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-700 font-semibold">
                        {report.title || report.test_name || report.testName || "Lab Report"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {report.created_at || report.date || "Recorded"}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {String(report.status || "").trim().toLowerCase() === "final" ? "Completed" : report.status || "Completed"}
                    </span>
                  </div>

                  {report.result_summary || report.findings || report.notes ? (
                    <p className="mt-3 text-sm text-slate-600">
                      {report.result_summary || report.findings || report.notes}
                    </p>
                  ) : null}

                  {resolveReportUrl(report) ? (
                    <a
                      href={resolveReportUrl(report)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-block text-sky-700 font-medium hover:underline"
                    >
                      View report
                    </a>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">Report file is not available yet.</p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border p-5 bg-white">
                <p className="text-slate-700 font-medium">No reports available yet.</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <Link href="/patient/lab" className="text-sky-700 font-medium hover:underline">
              Back to Lab
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
