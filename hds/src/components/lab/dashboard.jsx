"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";
import backendUrl from "@/lib/backendUrl";
import {
  FileText,
  FlaskConical,
  Microscope,
  Search,
} from "lucide-react";

const pageShell = "min-h-screen bg-white";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "pending").trim().toLowerCase();
  if (raw === "ordered") return "Pending";
  if (raw === "final") return "Completed";
  if (raw === "in-progress") return "In Progress";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "completed") return "bg-emerald-100 text-emerald-700";
  if (normalized === "in-progress") return "bg-sky-100 text-sky-700";
  return "bg-amber-100 text-amber-700";
};

const getRequestKey = (test, fallback = "") =>
  `${String(test?.source_table || "unknown").trim()}:${String(test?.id || fallback).trim()}`;

export default function LabPage() {
  const router = useRouter();
  const [username, setUsername] = useState("Lab Tech");
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTest, setSelectedTest] = useState(null);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const user = localStorage.getItem("username");

    if (!token || !(role === "lab" || role === "labtechnician")) {
      router.push("/login");
      return;
    }

    setUsername(user || "Lab Tech");
    fetchTests();
  }, [router]);

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await apiGet("/api/lab");
      const list = Array.isArray(data?.data) ? data.data : [];
      setTests(list);

      if (selectedTest) {
        const selectedKey = getRequestKey(selectedTest);
        const refreshed = list.find((item) => getRequestKey(item) === selectedKey);
        if (refreshed) {
          setSelectedTest(refreshed);
          setComment(refreshed.comments || refreshed.notes || "");
        }
      }
    } catch (error) {
      console.error("Fetch tests error:", error);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTests = useMemo(() => {
    const query = String(search || "").trim().toLowerCase();
    let rows = [...tests];

    if (query) {
      rows = rows.filter((test) => {
        return (
          String(test?.patientName || test?.patient_name || "").toLowerCase().includes(query) ||
          String(test?.patient_id || "").toLowerCase().includes(query) ||
          String(test?.doctorName || test?.doctor_name || "").toLowerCase().includes(query) ||
          String(test?.testName || test?.test_name || "").toLowerCase().includes(query) ||
          String(test?.status || "").toLowerCase().includes(query)
        );
      });
    }

    if (statusFilter !== "all") {
      rows = rows.filter((test) => String(test?.status || "").toLowerCase() === statusFilter);
    }

    return rows;
  }, [search, statusFilter, tests]);

  const summary = useMemo(() => {
    const pending = tests.filter((test) => ["pending", "ordered"].includes(String(test?.status || "").toLowerCase())).length;
    const completed = tests.filter((test) => String(test?.status || "").toLowerCase() === "completed").length;
    const urgent = tests.filter((test) => {
      const notes = String(test?.notes || test?.comments || "").toLowerCase();
      return notes.includes("urgent") || notes.includes("stat");
    }).length;

    return {
      total: tests.length,
      pending,
      completed,
      urgent,
    };
  }, [tests]);

  const highlightedTests = useMemo(() => filteredTests.slice(0, 6), [filteredTests]);
  const completedPreview = useMemo(() => {
    return tests
      .filter((test) => String(test?.status || "").toLowerCase() === "completed")
      .slice(0, 4);
  }, [tests]);

  const openFor = (test) => {
    setSelectedTest(test);
    setComment(test?.comments || test?.notes || "");
    setFiles([]);
    setFeedback({ type: "", text: "" });
  };

  const handleUpload = async () => {
    if (!selectedTest?.id) {
      setFeedback({ type: "error", text: "Select a test before uploading a result." });
      return;
    }

    if (!files.length && !comment.trim()) {
      setFeedback({ type: "error", text: "Attach a PDF file or enter lab comments first." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      files.forEach((file) => form.append("reports", file));
      if (comment.trim()) {
        form.append("comment", comment.trim());
      }

      const source = encodeURIComponent(String(selectedTest?.source_table || ""));
      const response = await apiPost(`/api/lab/update-result/${selectedTest.id}?source=${source}`, form, token, true);
      if (!response?.success) {
        setFeedback({ type: "error", text: response?.message || "Failed to upload the report." });
        return;
      }

      setFeedback({ type: "success", text: "Lab report uploaded and request marked complete." });
      setSelectedTest(null);
      setComment("");
      setFiles([]);
      await fetchTests();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: error?.message || "Server error while uploading the report." });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadReport = (url) => {
    let resolvedUrl = url;
    try {
      const parsed = JSON.parse(String(url || ""));
      if (Array.isArray(parsed) && parsed[0]) {
        resolvedUrl = parsed[0];
      } else if (typeof parsed === "string" && parsed) {
        resolvedUrl = parsed;
      }
    } catch {
      resolvedUrl = url;
    }
    const finalUrl = backendUrl(resolvedUrl);
    window.open(finalUrl, "_blank");
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Lab Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Diagnostic dashboard</h1>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Track pending samples, process incoming test requests, and complete reports from one technician workspace.
              </p>
              <p className="mt-3 text-sm text-sky-100">Working as {username}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/lab/requests" className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22">
                Test Requests
              </Link>
              <Link href="/lab/reports" className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22">
                Reports Archive
              </Link>
              <Link href="/lab/notifications" className="rounded-full bg-white/14 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/22">
                Notifications
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Total requests</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Pending queue</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Completed</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.completed}</p>
          </div>
          <div className="rounded-[28px] border border-rose-100 bg-rose-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(244,63,94,0.45)]">
            <p className="text-sm text-rose-700">Urgent signals</p>
            <p className="mt-3 text-3xl font-bold text-rose-900">{summary.urgent}</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Search and filter</h2>
            <p className="text-sm text-slate-500">Find a patient, test, doctor, or narrow the live request queue by status.</p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_0.8fr]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search patient, ID, doctor, test, or status"
                className="w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
            </select>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Active request queue</h2>
              <p className="text-sm text-slate-500">Select a request to view details and upload the result from this dashboard.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${filteredTests.length} request(s)`}
            </span>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {highlightedTests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
                  No lab requests found for the current filters.
                </div>
              ) : (
                highlightedTests.map((test, index) => {
                  const active = getRequestKey(selectedTest) === getRequestKey(test);
                  const notes = String(test?.notes || test?.comments || "").trim();

                  return (
                    <button
                      key={getRequestKey(test, index)}
                      type="button"
                      onClick={() => openFor(test)}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        active ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50/80 hover:border-sky-200 hover:bg-sky-50/60"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <FlaskConical className="h-4 w-4 text-sky-600" />
                            <p className="font-semibold text-slate-900">{test.testName || test.test_name || "Lab Test"}</p>
                          </div>
                          <p className="text-sm text-slate-500">
                            {test.patientName || "--"} | {test.patient_id || "--"}
                          </p>
                          <p className="text-xs text-slate-400">Requested by {test.doctorName || "--"}</p>
                          {notes ? <p className="text-xs text-slate-500">Notes: {notes}</p> : null}
                        </div>
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(test.status)}`}>
                          {normalizeStatus(test.status)}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">Technician action panel</h3>
                <Microscope className="h-5 w-5 text-sky-600" />
              </div>

              {!selectedTest ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
                  Choose a request from the queue to review the patient context and upload the report.
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Patient</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedTest.patientName || "--"}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedTest.patient_id || "--"}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Referring doctor</p>
                      <p className="mt-2 font-semibold text-slate-900">{selectedTest.doctorName || "--"}</p>
                      <p className="mt-1 text-xs text-slate-500">{normalizeStatus(selectedTest.status)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Requested test</p>
                    <p className="mt-2 font-semibold text-slate-900">{selectedTest.testName || selectedTest.test_name || "--"}</p>
                    {selectedTest.notes ? <p className="mt-2 text-sm text-slate-500">{selectedTest.notes}</p> : null}
                  </div>

                  {selectedTest.result ? (
                    <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-sky-700">Existing report file</p>
                          <p className="mt-1 text-sm text-sky-800">A report is already attached for this request.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadReport(selectedTest.result)}
                          className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                        >
                          Open file
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Upload PDF report</label>
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={(event) => setFiles(Array.from(event.target.files || []))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                    <p className="text-xs text-slate-500">
                      {files.length ? `${files.length} file(s) selected` : "Attach one or more PDF result files."}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">Lab comments</label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      placeholder="Enter result notes, process remarks, or final findings"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                    />
                  </div>

                  {feedback.text ? (
                    <div className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {feedback.text}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={submitting}
                    className="w-full rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                  >
                    {submitting ? "Uploading..." : "Upload and complete request"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Recent completions</h2>
                <p className="text-sm text-slate-500">Latest completed tests visible from the technician queue.</p>
              </div>
              <Link href="/lab/reports" className="text-sm font-semibold text-sky-700">
                Open reports
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {completedPreview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No completed lab requests yet.
                </div>
              ) : (
                completedPreview.map((test, index) => (
                  <div key={getRequestKey(test, index)} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{test.testName || test.test_name || "Lab Test"}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {test.patientName || "--"} | Requested by {test.doctorName || "--"}
                        </p>
                      </div>
                      <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Completed
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Technician workflow</h2>
                <p className="text-sm text-slate-500">A clear reminder of how the lab module fits into daily work.</p>
              </div>
              <FileText className="h-5 w-5 text-sky-600" />
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">1. Review test requests</p>
                <p className="mt-1 text-sm text-slate-500">Use the dashboard or the dedicated requests page to process newly ordered tests.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">2. Upload report files and findings</p>
                <p className="mt-1 text-sm text-slate-500">Attach PDFs, add comments, and complete the request once the lab result is ready.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-sm font-semibold text-slate-900">3. Confirm published reports</p>
                <p className="mt-1 text-sm text-slate-500">Use the reports archive and notifications feed to track what still needs attention.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
