"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useLiveCount from "./useLiveCount";
import { apiGet } from "@/services/api";
import { LAB_TEST_CATEGORIES } from "@/data/labTests";

const Hero = ({ pending, claims }) => (
  <div className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white p-4 sm:p-8 shadow-lg mb-6">
    <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
          Lab Tests & Reports
        </h2>
        <p className="mt-2 text-sky-100/90">
          Book tests, view pending reports, and track results.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/patient/lab/order"
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-md font-medium"
          >
            Book a Test
          </Link>
          <Link
            href="/patient/lab/results"
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-md font-medium"
          >
            View Results
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 w-full md:w-auto">
        <div className="bg-white/10 rounded-lg p-4 w-full sm:w-40">
          <div className="text-xs text-white/80">Pending Reports</div>
          <div className="text-2xl font-bold">{pending}</div>
        </div>
        <div className="bg-white/10 rounded-lg p-4 w-full sm:w-40">
          <div className="text-xs text-white/80">Active Claims</div>
          <div className="text-2xl font-bold">{claims}</div>
        </div>
      </div>
    </div>
  </div>
);

const testCategories = LAB_TEST_CATEGORIES;

const resolveReportUrl = (report) =>
  report?.file_url || report?.file_path || report?.report_url || report?.result || "";

const normalizeReportStatus = (report) => {
  const raw = String(report?.status || "").trim().toLowerCase();
  if (raw === "final") return "Completed";
  if (raw === "completed") return "Completed";
  if (raw === "draft") return "Pending";
  return resolveReportUrl(report) ? "Completed" : "Pending";
};

const PatientLabPage = () => {
  const pending = useLiveCount("/api/lab/reports/pending/count", 15000);
  const claims = useLiveCount("/api/claims/active/count", 30000);
  const [labReports, setLabReports] = useState([]);

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await apiGet("/api/patients/lab-reports");
        const list = Array.isArray(response?.lab_reports) ? response.lab_reports : Array.isArray(response?.data) ? response.data : [];
        setLabReports(list);
      } catch (error) {
        console.error("LAB REPORT LOAD ERROR:", error);
        setLabReports([]);
      }
    };

    loadReports();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">

      {/* RIGHT MAIN CONTENT */}
      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <Hero pending={pending} claims={claims} />

          {/* TESTS + PENDING */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2 bg-white rounded-2xl shadow-xl p-6 border">
              <h3 className="text-xl font-semibold mb-4">
                Available Tests
              </h3>

              <div className="space-y-6">
                {testCategories.map((cat) => (
                  <div key={cat.id}>
                    <h4 className="text-base font-extrabold text-slate-900">{cat.title}</h4>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(cat.tests || []).map((t) => (
                        <div
                          key={t.id}
                          className="p-4 border rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <div className="font-semibold">{t.name}</div>
                            <div className="text-sm text-slate-500">
                              Turnaround: {t.turnaround || "24–48 hrs"}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-medium">₹{t.price}</div>
                            <Link
                              href={`/patient/lab/order?testId=${t.id}`}
                              className="mt-2 inline-block text-sm text-sky-600"
                            >
                              Book
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PENDING REPORTS */}
            <aside className="bg-white rounded-2xl shadow-xl p-6 border">
              <h4 className="text-lg font-semibold">
                Pending Reports
              </h4>
              <p className="text-sm text-slate-500 mt-2">
                Live updates of tests awaiting review.
              </p>

              <div className="mt-4 text-center">
                <div className="text-4xl font-bold">{pending}</div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="p-3 bg-sky-50 rounded-lg">
                  CBC — awaiting analysis
                </div>
                <div className="p-3 bg-sky-50 rounded-lg">
                  Lipid Profile — collected
                </div>
              </div>

              <Link
                href="/patient/lab/results"
                className="block mt-5 text-sky-700 font-medium"
              >
                View all reports →
              </Link>
            </aside>
          </section>

          <section className="mt-8 bg-white rounded-2xl shadow-xl p-6 border">
            <h3 className="text-xl font-semibold mb-4">Your Lab Reports</h3>
            {labReports.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {labReports.map((report) => (
                  <div key={report.id || report.report_id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm text-slate-500">Test</div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          normalizeReportStatus(report) === "Completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {normalizeReportStatus(report)}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900">
                      {report.title || report.test_name || report.testName || "Lab Report"}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {report.created_at || report.date || "Recorded"}
                    </div>
                    {report.result_summary || report.findings || report.notes ? (
                      <div className="mt-3 text-sm text-slate-600">
                        {report.result_summary || report.findings || report.notes}
                      </div>
                    ) : null}
                    {resolveReportUrl(report) ? (
                      <a
                        href={resolveReportUrl(report)}
                        className="mt-3 inline-block text-sm text-sky-600"
                        target="_blank"
                        rel="noreferrer"
                      >
                        View report
                      </a>
                    ) : (
                      <div className="mt-3 text-sm text-slate-500">Report pending</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">No lab reports available.</div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default PatientLabPage;
