"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/services/api";

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "Unknown";
  if (raw === "ordered") return "Pending";
  if (raw === "final") return "Completed";
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

export default function LabRequestsPage() {
  const [username, setUsername] = useState("Lab Tech");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tests, setTests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTest, setSelectedTest] = useState(null);
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState([]);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "Lab Tech");
  }, []);

  const loadRequests = async () => {
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
      console.error("Lab requests load error:", error);
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredTests = useMemo(() => {
    let rows = [...tests];
    const q = String(search || "").trim().toLowerCase();

    if (q) {
      rows = rows.filter((test) => {
        return (
          String(test?.patientName || "").toLowerCase().includes(q) ||
          String(test?.patient_id || "").toLowerCase().includes(q) ||
          String(test?.doctorName || "").toLowerCase().includes(q) ||
          String(test?.testName || test?.test_name || "").toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== "all") {
      rows = rows.filter((test) => String(test?.status || "").toLowerCase() === statusFilter);
    }

    return rows;
  }, [search, statusFilter, tests]);

  const summary = useMemo(() => {
    return {
      total: tests.length,
      pending: tests.filter((test) => ["pending", "ordered"].includes(String(test?.status || "").toLowerCase())).length,
      completed: tests.filter((test) => String(test?.status || "").toLowerCase() === "completed").length,
    };
  }, [tests]);

  const openRequest = (test) => {
    setSelectedTest(test);
    setComment(test?.comments || test?.notes || "");
    setFiles([]);
    setFeedback({ type: "", text: "" });
  };

  const submitResult = async () => {
    if (!selectedTest?.id) return;
    if (!files.length && !comment.trim()) {
      setFeedback({ type: "error", text: "Add a PDF report or a result comment first." });
      return;
    }

    setSubmitting(true);
    setFeedback({ type: "", text: "" });

    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      files.forEach((file) => form.append("reports", file));
      if (comment.trim()) form.append("comment", comment.trim());

      const source = encodeURIComponent(String(selectedTest?.source_table || ""));
      const response = await apiPost(`/api/lab/update-result/${selectedTest.id}?source=${source}`, form, token, true);
      if (!response?.success) {
        setFeedback({ type: "error", text: response?.message || "Failed to update lab result." });
        return;
      }

      setFeedback({ type: "success", text: "Lab result uploaded successfully." });
      await loadRequests();
      setSelectedTest(null);
      setComment("");
      setFiles([]);
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: error?.message || "Server error while uploading the result." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-blue-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(59,130,246,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Lab Desk</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Test requests</h1>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Review incoming test orders, find a patient quickly, and upload reports when processing is complete.
              </p>
              <p className="mt-3 text-sm text-sky-100">Working as {username}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Total requests</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Pending</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Completed</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.completed}</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search patient, ID, doctor, or test"
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Lab request queue</h2>
                <p className="text-sm text-slate-500">Select a request to review and upload results.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {loading ? "Loading..." : `${filteredTests.length} request(s)`}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {filteredTests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                  No lab requests found.
                </div>
              ) : (
                filteredTests.map((test, index) => (
                  <button
                    key={getRequestKey(test, index)}
                    type="button"
                    onClick={() => openRequest(test)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      getRequestKey(selectedTest) === getRequestKey(test)
                        ? "border-sky-400 bg-sky-50"
                        : "border-slate-200 bg-slate-50/80 hover:border-sky-200 hover:bg-sky-50/60"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{test.testName || test.test_name || "Lab Test"}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {test.patientName || "--"} | {test.patient_id || "--"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Requested by {test.doctorName || "--"}</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusTone(test.status)}`}>
                        {normalizeStatus(test.status)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className={surfaceCard}>
            <h2 className="text-xl font-semibold text-slate-900">Request details</h2>
            {!selectedTest ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
                Select a test request from the queue to review details and upload a result.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Patient</p>
                    <p className="mt-2 font-semibold text-slate-900">{selectedTest.patientName || "--"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Doctor</p>
                    <p className="mt-2 font-semibold text-slate-900">{selectedTest.doctorName || "--"}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Test</p>
                  <p className="mt-2 font-semibold text-slate-900">{selectedTest.testName || selectedTest.test_name || "--"}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Upload PDF reports</label>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={(e) => setFiles(Array.from(e.target.files || []))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                  />
                  <p className="text-xs text-slate-500">
                    {files.length ? `${files.length} file(s) selected` : "Upload one or more PDF lab reports."}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Lab comments</label>
                  <textarea
                    rows={4}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter result notes, findings, or process remarks"
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
                  onClick={submitResult}
                  disabled={submitting}
                  className="w-full rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {submitting ? "Uploading..." : "Upload and complete request"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
