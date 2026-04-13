"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const paymentTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700";
  if (normalized === "surgery_paid") return "bg-blue-100 text-blue-700";
  if (normalized === "bed_paid") return "bg-cyan-100 text-cyan-700";
  if (normalized === "partially_paid") return "bg-orange-100 text-orange-700";
  if (normalized === "pending" || normalized === "unpaid") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.08),_transparent_30%),linear-gradient(180deg,#fafaff_0%,#eef3ff_100%)] p-4 md:p-6 print:bg-white";
const pageContent = "mx-auto w-full max-w-7xl space-y-6";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur print:shadow-none";
const insetCard = "rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4";

export default function ReportPage() {
  const searchParams = useSearchParams();
  const queryPatientId = searchParams.get("patient_id") || "";
  const [username, setUsername] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [report, setReport] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
    if (queryPatientId) {
      setSelectedPatientId(queryPatientId);
    }

    const loadInitialData = async () => {
      setLoadingPatients(true);
      try {
        const [patientsData, reportsData] = await Promise.all([
          apiGet("/api/patients/all"),
          apiGet("/api/reports"),
        ]);

        if (patientsData?.success) {
          setPatients(Array.isArray(patientsData.patients) ? patientsData.patients : []);
        } else if (Array.isArray(patientsData)) {
          setPatients(patientsData);
        } else {
          setPatients([]);
        }

        if (reportsData?.success) {
          setSavedReports(Array.isArray(reportsData.reports) ? reportsData.reports : []);
        } else {
          setSavedReports([]);
        }
      } catch (err) {
        console.error(err);
        setPatients([]);
        setSavedReports([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadInitialData();
  }, [queryPatientId]);

  const clearFeedback = () => setFeedback({ type: "", text: "" });

  const selectedPatient = useMemo(() => {
    return patients.find((patient) => String(patient.patient_id) === String(selectedPatientId)) || null;
  }, [patients, selectedPatientId]);

  const reportSummary = useMemo(() => {
    const appointments = Array.isArray(report?.appointments) ? report.appointments : [];
    const billings = Array.isArray(report?.billings) ? report.billings : [];

    const totalBilled = billings.reduce((sum, entry) => {
      return sum + Number(entry?.grand_total || entry?.total_amount || 0);
    }, 0);

    const pendingBills = billings.filter((entry) => {
      const status = String(entry?.payment_status || entry?.status || "").toLowerCase();
      return status === "pending" || status === "unpaid" || status === "partially_paid" || status === "surgery_paid" || status === "bed_paid";
    }).length;

    return {
      appointments: appointments.length,
      bills: billings.length,
      totalBilled,
      pendingBills,
    };
  }, [report]);

  const recentBillingSummary = useMemo(() => {
    const entries = Array.isArray(savedReports) ? savedReports : [];
    const totalAmount = entries.reduce((sum, entry) => sum + Number(entry?.total_amount || 0), 0);
    const unpaidCount = entries.filter((entry) => {
      const status = String(entry?.status || entry?.payment_status || "").toLowerCase();
      return status === "pending" || status === "unpaid";
    }).length;

    return {
      count: entries.length,
      totalAmount,
      unpaidCount,
    };
  }, [savedReports]);

  const loadReport = async () => {
    clearFeedback();
    if (!selectedPatientId) {
      setFeedback({ type: "error", text: "Select a patient to load the report." });
      return;
    }

    setLoading(true);
    try {
      const data = await apiGet(`/api/reports/patient/${selectedPatientId}`);
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Failed to load patient report." });
        return;
      }

      setReport({
        patient: data?.data?.patient || null,
        appointments: Array.isArray(data?.data?.appointments) ? data.data.appointments : [],
        billings: Array.isArray(data?.data?.bills) ? data.data.bills : [],
      });
      setFeedback({ type: "success", text: "Patient report loaded." });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: err?.message || "Failed to load report." });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    clearFeedback();
    if (!selectedPatientId) {
      setFeedback({ type: "error", text: "Select a patient before generating the summary." });
      return;
    }

    setLoading(true);
    try {
      const data = await apiPost("/api/reports/generate", { patient_id: selectedPatientId });
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Failed to generate patient summary." });
        return;
      }

      const patientReportData = await apiGet(`/api/reports/patient/${selectedPatientId}`);
      if (patientReportData?.success) {
        setReport({
          patient: patientReportData?.data?.patient || null,
          appointments: Array.isArray(patientReportData?.data?.appointments)
            ? patientReportData.data.appointments
            : [],
          billings: Array.isArray(patientReportData?.data?.bills)
            ? patientReportData.data.bills
            : [],
        });
      }

      const refreshed = await apiGet("/api/reports");
      if (refreshed?.success) {
        setSavedReports(Array.isArray(refreshed.reports) ? refreshed.reports : []);
      }

      setFeedback({ type: "success", text: "Patient summary generated and loaded successfully." });
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: err?.message || "Failed to generate patient summary." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedPatientId || loadingPatients) return;
    if (queryPatientId && String(queryPatientId) === String(selectedPatientId) && !report) {
      loadReport();
    }
  }, [selectedPatientId, loadingPatients, queryPatientId, report]);

  return (
    <div className={pageShell}>
      <div className={pageContent}>
      <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-violet-800 to-sky-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(99,102,241,0.45)] md:px-8 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">
              Reception Desk
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Patient reports</h1>
            <p className="mt-3 max-w-2xl text-sm text-sky-50 md:text-base">
              Load a patient summary, review appointments and billing, and generate report PDFs for front-desk follow-up.
            </p>
            {username ? <p className="mt-3 text-sm text-sky-100">Working as {username}</p> : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/register/billing"
              className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Billing
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

      <section className="space-y-6 print:grid-cols-1">
        <div className="space-y-6">
          <div className={surfaceCard}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">1. Select patient</h2>
                <p className="text-sm text-slate-500">Choose the patient whose report you want to review.</p>
              </div>
              <div className="text-xs text-slate-400">
                {loadingPatients ? "Loading patients..." : `${patients.length} patients available`}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_auto]">
              <select
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
              >
                <option value="">Select patient</option>
                {patients.map((patient) => (
                  <option key={patient.patient_id} value={patient.patient_id}>
                    {patient.name} - {patient.patient_id}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadReport}
                disabled={loading}
                className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                {loading ? "Loading..." : "Load Report"}
              </button>

              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={loading}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {loading ? "Generating..." : "Generate Summary"}
              </button>
            </div>

            {feedback.text ? (
              <div
                className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                  feedback.type === "error"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {feedback.text}
              </div>
            ) : null}

            <div className={`mt-5 ${insetCard}`}>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Selected patient</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedPatient ? selectedPatient.name : "No patient selected"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedPatient?.patient_id || "--"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Contact</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    {selectedPatient?.mobile || selectedPatient?.phone || "--"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">2. Saved reports</h2>
                <p className="text-sm text-slate-500">Recent billing activity saved for patients.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {recentBillingSummary.count} bills
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div className={insetCard}>
                <p className="text-sm text-slate-500">Recent bills</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{recentBillingSummary.count}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Recorded value</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{formatCurrency(recentBillingSummary.totalAmount)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Unpaid bills</p>
                <p className="mt-2 text-2xl font-bold text-amber-900">{recentBillingSummary.unpaidCount}</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {savedReports.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                  No billing records found yet.
                </div>
              ) : (
                savedReports.slice(0, 8).map((entry, index) => (
                  <div key={entry.id || index} className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="font-semibold text-slate-900">
                      {entry.patient_name || entry.name || `Patient #${entry.patient_id}`}
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {formatCurrency(entry.total_amount || 0)} | {normalizeStatus(entry.status || entry.payment_status)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {entry.created_at || entry.date || "Recently saved"}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={surfaceCard}>
            <h2 className="text-xl font-semibold text-slate-900">Report summary</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-sky-50 p-4">
                <p className="text-sm text-sky-700">Appointments</p>
                <p className="mt-2 text-3xl font-bold text-sky-900">{reportSummary.appointments}</p>
              </div>
              <div className="rounded-2xl bg-violet-50 p-4">
                <p className="text-sm text-violet-700">Bills</p>
                <p className="mt-2 text-3xl font-bold text-violet-900">{reportSummary.bills}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Total billed</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{formatCurrency(reportSummary.totalBilled)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Pending bills</p>
                <p className="mt-2 text-3xl font-bold text-amber-900">{reportSummary.pendingBills}</p>
              </div>
            </div>
          </div>

          {report ? (
            <div className={surfaceCard}>
              <div className="border-b border-slate-200 pb-4">
                <h2 className="text-2xl font-bold text-slate-900">
                  Patient Report: {report.patient?.name || report.patient?.full_name || "--"}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Patient ID</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {report.patient?.patient_id || report.patient?.id || "--"}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                    <p className="text-slate-500">Contact</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {report.patient?.mobile || report.patient?.phone || "--"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold text-slate-900">
                  Appointments ({report.appointments.length})
                </h3>
                {report.appointments.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No appointments found for this patient.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-[620px] w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Doctor</th>
                          <th className="px-4 py-3 font-semibold">Time</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.appointments.map((entry, index) => (
                          <tr key={entry.id || index} className="border-b border-slate-100">
                            <td className="px-4 py-3 text-slate-700">
                              {entry.date || entry.appointment_date || "--"}
                            </td>
                            <td className="px-4 py-3 text-slate-900">
                              {entry.doctor_name || entry.doctorName || "--"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {entry.time || entry.appointment_time || "--"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {normalizeStatus(entry.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold text-slate-900">Billing ({report.billings.length})</h3>
                {report.billings.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No billing records found for this patient.</p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {report.billings.map((entry, index) => {
                      const paymentStatus = entry.payment_status || entry.status || "unknown";
                      const items = Array.isArray(entry.items) ? entry.items : [];

                      return (
                        <div key={entry.id || index} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                          <div className="grid gap-3 md:grid-cols-5">
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Invoice</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {entry.invoice_number || `INV-${entry.id || index + 1}`}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Amount</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {formatCurrency(entry.grand_total || entry.total_amount || 0)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                              <span
                                className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentTone(
                                  paymentStatus
                                )}`}
                              >
                                {normalizeStatus(paymentStatus)}
                              </span>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Method</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {normalizeStatus(entry.payment_method)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Created</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {formatDateTime(entry.created_at)}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-5">
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Reference</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {entry.transaction_id || entry.reference_no || "--"}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Billing Mode</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {normalizeStatus(entry.billing_mode)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Settlement</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {normalizeStatus(entry.settlement_scope)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Paid amount</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {formatCurrency(entry.paid_amount || 0)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Due amount</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {formatCurrency(entry.due_amount ?? entry.total_amount ?? 0)}
                              </p>
                            </div>
                            <div className="rounded-xl bg-white px-4 py-3">
                              <p className="text-xs uppercase tracking-wide text-slate-500">Stay / Bed</p>
                              <p className="mt-1 font-semibold text-slate-900">
                                {[entry.bed_type, entry.bed_number].filter(Boolean).join(" / ") || "--"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-xl bg-white p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-slate-900">Invoice Items</h4>
                              <span className="text-xs text-slate-500">{items.length} item(s)</span>
                            </div>

                            {items.length === 0 ? (
                              <p className="mt-3 text-sm text-slate-500">No line items recorded for this invoice.</p>
                            ) : (
                              <div className="mt-3 overflow-x-auto">
                                <table className="min-w-[560px] w-full text-left text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500">
                                      <th className="px-3 py-2 font-semibold">Item</th>
                                      <th className="px-3 py-2 font-semibold">Type</th>
                                      <th className="px-3 py-2 font-semibold">Date</th>
                                      <th className="px-3 py-2 font-semibold">Qty</th>
                                      <th className="px-3 py-2 font-semibold">Price</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, itemIndex) => (
                                      <tr key={item.id || itemIndex} className="border-b border-slate-100">
                                        <td className="px-3 py-2 text-slate-900">
                                          <p className="font-medium">{item.item_name || "--"}</p>
                                          {item.notes ? <p className="mt-1 text-xs text-slate-500">{item.notes}</p> : null}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                          {normalizeStatus(item.billing_type)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                          {item.service_date || "--"}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700">
                                          {item.quantity || 1}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-slate-900">
                                          {formatCurrency(item.price || 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm ring-1 ring-slate-200 print:hidden">
              <h2 className="text-xl font-semibold text-slate-900">No report loaded</h2>
              <p className="mt-2 text-sm text-slate-500">
                Select a patient and load the report to review appointments and billing history.
              </p>
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
