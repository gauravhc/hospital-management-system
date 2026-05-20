"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/services/api";

const defaultSurgeryRow = () => ({
  surgery_name: "",
  surgery_cost: "",
  surgery_date: "",
  billing_type: "main",
  notes: "",
});

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
const formatStatusLabel = (value) => String(value || "unknown").replace(/_/g, " ");
const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.08),_transparent_32%),linear-gradient(180deg,#f7fcfb_0%,#edf7f5_100%)] p-4 md:p-6";
const pageContent = "mx-auto w-full max-w-7xl space-y-6";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function BillingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedMobile, setSelectedMobile] = useState("");
  const [billingMode, setBillingMode] = useState("full");
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });
  const [existingBills, setExistingBills] = useState([]);
  const [loadingExistingBills, setLoadingExistingBills] = useState(false);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState("");
  const [invoiceUpdateForm, setInvoiceUpdateForm] = useState({});
  const [showOnlyUnpaidBills, setShowOnlyUnpaidBills] = useState(false);

  const [patientInfo, setPatientInfo] = useState({
    patient_id: "",
    name: "",
    mobile: "",
  });

  const [billing, setBilling] = useState({
    admission_date: "",
    discharge_date: "",
    bed_type: "",
    bed_number: "",
    bed_price: "",
    total_days: 0,
    bed_total: 0,
    surgery_total: 0,
    grand_total: 0,
  });

  const [payment, setPayment] = useState({
    payment_status: "pending",
    payment_method: "cash",
    transaction_id: "",
  });

  const [surgeries, setSurgeries] = useState([]);

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const data = await apiGet("/api/patients/all");
        if (data && data.success && Array.isArray(data.patients)) {
          setPatients(data.patients);
        } else if (Array.isArray(data)) {
          setPatients(data);
        } else {
          setPatients([]);
        }
      } catch (err) {
        console.error("Patient load error:", err);
        setPatients([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, []);

  const clearFeedback = () => setFeedback({ type: "", text: "" });

  const getBedPrice = (type) => {
    if (!type) return 0;
    const normalized = String(type).toLowerCase();
    if (normalized.includes("icu")) return 5000;
    if (normalized.includes("private")) return 3000;
    if (normalized.includes("semi")) return 2000;
    return 1000;
  };

  const recalcTotals = (nextBilling = billing, nextSurgeries = surgeries, nextMode = billingMode) => {
    let totalDays = 0;
    if (nextBilling.admission_date && nextBilling.discharge_date) {
      const start = new Date(nextBilling.admission_date);
      const end = new Date(nextBilling.discharge_date);
      const diff = (end - start) / (1000 * 60 * 60 * 24);
      totalDays = diff <= 0 ? 1 : Math.round(diff);
    }

    const bedPrice = Number(nextBilling.bed_price || 0);
    let bedTotal = totalDays * bedPrice;
    const surgeryTotal = nextSurgeries.reduce(
      (sum, item) => sum + Number(item.surgery_cost || 0),
      0
    );

    if (nextMode === "surgery_only") {
      bedTotal = 0;
      totalDays = 0;
    }

    setBilling({
      ...nextBilling,
      total_days: totalDays,
      bed_total: bedTotal,
      surgery_total: surgeryTotal,
      grand_total: bedTotal + surgeryTotal,
    });
  };

  const resetPatient = () => {
    setPatientInfo({ patient_id: "", name: "", mobile: "" });
    setSelectedPatientId("");
    setSelectedMobile("");
    setExistingBills([]);
    setInvoiceUpdateForm({});
  };

  const loadExistingBills = async (patientId) => {
    if (!patientId) {
      setExistingBills([]);
      setInvoiceUpdateForm({});
      return;
    }

    setLoadingExistingBills(true);
    try {
      const data = await apiGet(`/api/billing/patient/${encodeURIComponent(patientId)}`);
      const invoices = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
        ? data
        : [];
      setExistingBills(invoices);
      setInvoiceUpdateForm(
        invoices.reduce((acc, invoice) => {
          acc[invoice.id] = {
            payment_status: invoice.payment_status || invoice.status || "unpaid",
            payment_method: invoice.payment_method || "cash",
            reference_no: invoice.reference_no || invoice.transaction_id || "",
            settlement_scope: invoice.settlement_scope || "full_bill",
            paid_amount: invoice.paid_amount || "",
          };
          return acc;
        }, {})
      );
    } catch (err) {
      console.error("Failed to load existing bills:", err);
      setExistingBills([]);
      setInvoiceUpdateForm({});
    } finally {
      setLoadingExistingBills(false);
    }
  };

  const applyPatientById = async (patientId) => {
    clearFeedback();

    if (!patientId) {
      resetPatient();
      return;
    }

    try {
      const data = await apiGet(`/api/patients/${encodeURIComponent(patientId)}`);
      if (data && data.success && data.patient) {
        const patient = data.patient;
        setPatientInfo({
          patient_id: patient.patient_id || "",
          name: patient.name || "",
          mobile: patient.mobile || patient.phone || "",
        });
        setSelectedPatientId(patient.patient_id || patientId);
        setSelectedMobile(patient.mobile || patient.phone || "");
        await loadExistingBills(patient.patient_id || patientId);
        return;
      }
    } catch (err) {
      console.error("Failed to fetch patient:", err);
    }

    const localPatient = patients.find((entry) => String(entry.patient_id) === String(patientId));
    if (localPatient) {
      setPatientInfo({
        patient_id: localPatient.patient_id,
        name: localPatient.name,
        mobile: localPatient.mobile || localPatient.phone || "",
      });
      setSelectedPatientId(localPatient.patient_id);
      setSelectedMobile(localPatient.mobile || localPatient.phone || "");
      await loadExistingBills(localPatient.patient_id);
    }
  };

  const applyPatientByMobile = async (mobile) => {
    clearFeedback();
    const patient = patients.find((entry) => (entry.mobile || entry.phone) === mobile);
    if (!patient) return;

    setPatientInfo({
      patient_id: patient.patient_id,
      name: patient.name,
      mobile: patient.mobile || patient.phone || "",
    });
    setSelectedPatientId(patient.patient_id);
    setSelectedMobile(patient.mobile || patient.phone || "");
    await loadExistingBills(patient.patient_id);
  };

  const handleModeChange = (mode) => {
    setBillingMode(mode);
    recalcTotals(billing, surgeries, mode);
  };

  const handleBillingChange = (e) => {
    const { name, value } = e.target;
    const nextBilling = { ...billing, [name]: value };

    if (name === "bed_type") {
      nextBilling.bed_price = getBedPrice(value);
    }

    recalcTotals(nextBilling, surgeries, billingMode);
  };

  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPayment((prev) => ({ ...prev, [name]: value }));
  };

  const addSurgeryRow = () => {
    const nextSurgeries = [...surgeries, defaultSurgeryRow()];
    setSurgeries(nextSurgeries);
    recalcTotals(billing, nextSurgeries, billingMode);
  };

  const updateSurgery = (index, field, value) => {
    const nextSurgeries = [...surgeries];
    nextSurgeries[index][field] = value;
    setSurgeries(nextSurgeries);
    recalcTotals(billing, nextSurgeries, billingMode);
  };

  const removeSurgery = (index) => {
    const nextSurgeries = surgeries.filter((_, current) => current !== index);
    setSurgeries(nextSurgeries);
    recalcTotals(billing, nextSurgeries, billingMode);
  };

  const surgeryCount = useMemo(() => surgeries.filter((item) => item.surgery_name || item.surgery_cost).length, [surgeries]);
  const filteredExistingBills = useMemo(() => {
    if (!showOnlyUnpaidBills) return existingBills;
    return existingBills.filter((invoice) => {
      const status = String(
        invoiceUpdateForm[invoice.id]?.payment_status ||
          invoice.payment_status ||
          invoice.status ||
          "unpaid"
      )
        .toLowerCase()
        .trim();
      return status === "unpaid" || status === "pending";
    });
  }, [existingBills, invoiceUpdateForm, showOnlyUnpaidBills]);

  const billHistorySummary = useMemo(() => {
    const entries = filteredExistingBills;
    return {
      count: entries.length,
      unpaidCount: entries.filter((invoice) => {
        const status = String(
          invoiceUpdateForm[invoice.id]?.payment_status ||
            invoice.payment_status ||
            invoice.status ||
            "unpaid"
        ).toLowerCase();
        return status === "unpaid" || status === "pending" || status === "partially_paid" || status === "surgery_paid" || status === "bed_paid";
      }).length,
      totalBilled: entries.reduce((sum, invoice) => sum + Number(invoice.total_amount || invoice.grand_total || 0), 0),
      totalDue: entries.reduce((sum, invoice) => sum + Number(invoice.due_amount ?? invoice.total_amount ?? 0), 0),
    };
  }, [filteredExistingBills, invoiceUpdateForm]);

  const handleExistingInvoiceFieldChange = (invoiceId, field, value) => {
    setInvoiceUpdateForm((prev) => ({
      ...prev,
      [invoiceId]: {
        ...(prev[invoiceId] || {}),
        [field]: value,
      },
    }));
  };

  const handleExistingInvoiceUpdate = async (invoice) => {
    const invoiceId = invoice?.id;
    if (!invoiceId) return;

    const formState = invoiceUpdateForm[invoiceId] || {};
    setUpdatingInvoiceId(String(invoiceId));
    clearFeedback();

    try {
      const nextStatus = formState.payment_status || "paid";
      const settlementScope = formState.settlement_scope || "full_bill";
      const payload = {
        status: nextStatus === "paid" ? "paid" : "unpaid",
        payment_status: nextStatus,
        payment_method: formState.payment_method || "cash",
        reference_no: formState.reference_no || null,
        settlement_scope: settlementScope,
        paid_amount: formState.paid_amount || null,
        payment_note:
          settlementScope === "surgery_only"
            ? "Surgery component settled"
            : settlementScope === "bed_only"
            ? "Bed component settled"
            : settlementScope === "custom"
            ? "Custom partial payment received"
            : null,
        amount: invoice.total_amount || invoice.grand_total || 0,
      };

      const data = await apiPut(`/api/billing/invoices/${invoiceId}/status`, payload);
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Failed to update bill status." });
        return;
      }

      setFeedback({ type: "success", text: "Existing bill updated successfully." });
      await loadExistingBills(patientInfo.patient_id);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: err?.message || "Failed to update bill status." });
    } finally {
      setUpdatingInvoiceId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!patientInfo.patient_id) {
      setFeedback({ type: "error", text: "Please select a patient first." });
      return;
    }

    if (billingMode === "full") {
      if (!billing.admission_date || !billing.discharge_date || !billing.bed_type) {
        setFeedback({ type: "error", text: "Admission, discharge, and bed details are required for a full bill." });
        return;
      }
    }

    if (billingMode === "surgery_only" && surgeries.length === 0) {
      setFeedback({ type: "error", text: "Add at least one surgery item for surgery-only billing." });
      return;
    }

    if (!payment.payment_method || !payment.payment_status) {
      setFeedback({ type: "error", text: "Payment method and status are required." });
      return;
    }

    const payload = {
      billing_mode: billingMode,
      patient_id: patientInfo.patient_id,
      admission_date: billingMode === "full" ? billing.admission_date : null,
      discharge_date: billingMode === "full" ? billing.discharge_date : null,
      bed_type: billingMode === "full" ? billing.bed_type : null,
      bed_number: billingMode === "full" ? billing.bed_number : null,
      bed_price: billingMode === "full" ? billing.bed_price : null,
      bed_total: billingMode === "full" ? billing.bed_total : 0,
      surgery_total: billing.surgery_total,
      subtotal: billing.grand_total,
      total_amount: billing.grand_total,
      grand_total: billing.grand_total,
      surgeries: surgeries
        .filter((item) => item.surgery_name || item.surgery_cost)
        .map((item) => ({
          surgery_name: item.surgery_name,
          surgery_cost: item.surgery_cost,
          surgery_date: item.surgery_date || null,
          billing_type: item.billing_type || "surgery",
          notes: item.notes || "",
        })),
      payment_status: payment.payment_status,
      payment_method: payment.payment_method,
      transaction_id: payment.transaction_id,
    };

    setSubmitting(true);
    try {
      const data = await apiPost("/api/billing/create", payload);
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Billing failed." });
        return;
      }

      setFeedback({
        type: "success",
        text: billingMode === "surgery_only" ? "Surgery bill saved successfully." : "Full bill saved successfully.",
      });
      router.push(`/register/report?patient_id=${patientInfo.patient_id}`);
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: err?.message || "Server error while saving billing." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={pageShell}>
      <div className={pageContent}>
      <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(16,185,129,0.5)] md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-100">
              Reception Desk
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">Billing and collections</h1>
            <p className="mt-3 max-w-2xl text-sm text-emerald-50 md:text-base">
              Select the patient, prepare the billing mode, and record collection details from the front desk.
            </p>
            {username ? <p className="mt-3 text-sm text-teal-100">Working as {username}</p> : null}
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="space-y-6">
          <div className={surfaceCard}>
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">1. Select patient</h2>
                <p className="text-sm text-slate-500">Choose by patient ID or mobile number.</p>
              </div>
              <div className="text-xs text-slate-400">
                {loadingPatients ? "Loading patients..." : `${patients.length} patients available`}
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Patient ID</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                  value={selectedPatientId}
                  onChange={(e) => applyPatientById(e.target.value)}
                >
                  <option value="">Select patient ID</option>
                  {patients.map((patient) => (
                    <option key={patient.patient_id} value={patient.patient_id}>
                      {patient.patient_id} - {patient.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Mobile</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                  value={selectedMobile}
                  onChange={(e) => applyPatientByMobile(e.target.value)}
                >
                  <option value="">Select mobile</option>
                  {patients.map((patient) => (
                    <option
                      key={`${patient.patient_id || "patient"}-${patient.phone || patient.mobile || "no-mobile"}`}
                      value={patient.phone || patient.mobile || ""}
                    >
                      {(patient.phone || patient.mobile || "--")} - {patient.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetPatient}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Clear patient
              </button>
              <Link
                href="/register/patient-create"
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                New patient registration
              </Link>
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Patient snapshot</h2>
                <p className="text-sm text-slate-500">Make sure the billing is being created for the right patient.</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  patientInfo.patient_id ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {patientInfo.patient_id ? "Patient ready" : "Patient required"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
                <p className="mt-2 font-semibold text-slate-900">{patientInfo.patient_id || "--"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                <p className="mt-2 font-semibold text-slate-900">{patientInfo.name || "--"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Mobile</p>
                <p className="mt-2 font-semibold text-slate-900">{patientInfo.mobile || "--"}</p>
              </div>
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">Billing follow-up</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">Previous billing records</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search a patient first, then review saved invoices here when the patient comes back to clear the bill later.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={showOnlyUnpaidBills}
                    onChange={(e) => setShowOnlyUnpaidBills(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Show only unpaid
                </label>
                <span className="rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                  {loadingExistingBills ? "Loading records..." : `${filteredExistingBills.length} visible`}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Visible bills</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{billHistorySummary.count}</p>
                <p className="mt-1 text-xs text-slate-500">Invoices matching the current patient and filter.</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-700">Needs follow-up</p>
                <p className="mt-2 text-2xl font-bold text-amber-900">{billHistorySummary.unpaidCount}</p>
                <p className="mt-1 text-xs text-amber-700">Unpaid and pending bills still open at the desk.</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Recorded value</p>
                <p className="mt-2 text-2xl font-bold text-emerald-900">{formatCurrency(billHistorySummary.totalBilled)}</p>
                <p className="mt-1 text-xs text-emerald-700">Total billed amount already stored for this patient.</p>
              </div>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs uppercase tracking-wide text-rose-700">Outstanding</p>
                <p className="mt-2 text-2xl font-bold text-rose-900">{formatCurrency(billHistorySummary.totalDue)}</p>
                <p className="mt-1 text-xs text-rose-700">Amount still due across the visible invoices.</p>
              </div>
            </div>

            {!patientInfo.patient_id ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white">
                  1
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">Select a patient first</h3>
                <p className="mt-2 text-sm text-slate-600">Saved invoices will appear here once a patient is selected from the search above.</p>
              </div>
            ) : filteredExistingBills.length === 0 ? (
              <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-700">
                  0
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {existingBills.length === 0 ? "No saved bills yet" : "No bills match this filter"}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {existingBills.length === 0
                    ? "Once billing is saved for this patient, the record will appear here for payment follow-up and status updates."
                    : "Turn off the unpaid-only filter to view all previously saved billing records."}
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {filteredExistingBills.map((invoice, index) => {
                  const formState = invoiceUpdateForm[invoice.id] || {};
                  const status = formState.payment_status || invoice.payment_status || invoice.status || "unpaid";
                  const isPaid = ["paid", "completed"].includes(String(status).toLowerCase());
                  const paidAmount = Number(invoice.paid_amount || 0);
                  const dueAmount = Number(invoice.due_amount ?? invoice.total_amount ?? 0);
                  const currentScope = String(formState.settlement_scope || invoice.settlement_scope || "full_bill");

                  return (
                    <div key={invoice.id || index} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Invoice record</p>
                            <h3 className="mt-1 text-lg font-semibold text-slate-900">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              Saved on{" "}
                              {invoice.created_at ? new Date(invoice.created_at).toLocaleString("en-IN") : "date unavailable"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {formatStatusLabel(status)}
                            </span>
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                              {(invoice.settlement_scope || "none").replace(/_/g, " ")}
                            </span>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                              {isPaid ? "Cleared" : "Needs follow-up"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Total bill</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">
                              {formatCurrency(invoice.total_amount || invoice.grand_total || 0)}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Surgery part</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(invoice.surgery_total || 0)}</p>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs uppercase tracking-wide text-slate-500">Bed part</p>
                            <p className="mt-2 text-base font-semibold text-slate-900">{formatCurrency(invoice.bed_total || 0)}</p>
                          </div>
                          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <p className="text-xs uppercase tracking-wide text-emerald-700">Paid so far</p>
                            <p className="mt-2 text-base font-semibold text-emerald-900">{formatCurrency(paidAmount)}</p>
                          </div>
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                            <p className="text-xs uppercase tracking-wide text-rose-700">Due amount</p>
                            <p className="mt-2 text-base font-semibold text-rose-900">{formatCurrency(dueAmount)}</p>
                          </div>
                        </div>

                        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h4 className="text-sm font-semibold text-slate-900">Update settlement</h4>
                              <p className="mt-1 text-xs text-slate-500">
                                Mark this invoice as paid, partially paid, or surgery-only cleared when the patient settles later.
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 text-xs text-slate-600 shadow-sm ring-1 ring-slate-200">
                              Current target:{" "}
                              <span className="font-semibold text-slate-900">
                                {currentScope === "surgery_only"
                                  ? `Surgery ${formatCurrency(invoice.surgery_total || 0)}`
                                  : currentScope === "bed_only"
                                  ? `Bed ${formatCurrency(invoice.bed_total || 0)}`
                                  : currentScope === "custom"
                                  ? "Custom amount"
                                  : `Full bill ${formatCurrency(invoice.total_amount || 0)}`}
                              </span>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <div className="space-y-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment status</label>
                              <select
                                value={formState.payment_status || invoice.payment_status || invoice.status || "unpaid"}
                                onChange={(e) => handleExistingInvoiceFieldChange(invoice.id, "payment_status", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                              >
                                <option value="unpaid">Unpaid</option>
                                <option value="pending">Pending</option>
                                <option value="surgery_paid">Surgery Paid</option>
                                <option value="bed_paid">Bed Paid</option>
                                <option value="partially_paid">Partially Paid</option>
                                <option value="paid">Paid</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Settlement type</label>
                              <select
                                value={currentScope}
                                onChange={(e) => handleExistingInvoiceFieldChange(invoice.id, "settlement_scope", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                              >
                                <option value="full_bill">Full Bill</option>
                                <option value="surgery_only">Surgery Only</option>
                                <option value="bed_only">Bed Only</option>
                                <option value="custom">Custom Amount</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Payment method</label>
                              <select
                                value={formState.payment_method || invoice.payment_method || "cash"}
                                onChange={(e) => handleExistingInvoiceFieldChange(invoice.id, "payment_method", e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                              >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="upi">UPI</option>
                                <option value="insurance">Insurance</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                {currentScope === "custom" ? "Paid amount" : "Selected amount"}
                              </label>
                              {currentScope === "custom" ? (
                                <input
                                  type="number"
                                  placeholder="Enter paid amount"
                                  value={formState.paid_amount || ""}
                                  onChange={(e) => handleExistingInvoiceFieldChange(invoice.id, "paid_amount", e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                                />
                              ) : (
                                <input
                                  type="text"
                                  value={
                                    currentScope === "surgery_only"
                                      ? `Surgery: ${formatCurrency(invoice.surgery_total || 0)}`
                                      : currentScope === "bed_only"
                                      ? `Bed: ${formatCurrency(invoice.bed_total || 0)}`
                                      : `Total: ${formatCurrency(invoice.total_amount || 0)}`
                                  }
                                  readOnly
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none"
                                />
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Reference / receipt</label>
                              <div className="flex flex-col gap-3">
                                <input
                                  type="text"
                                  placeholder="Reference number"
                                  value={formState.reference_no || ""}
                                  onChange={(e) => handleExistingInvoiceFieldChange(invoice.id, "reference_no", e.target.value)}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleExistingInvoiceUpdate(invoice)}
                                  disabled={updatingInvoiceId === String(invoice.id)}
                                  className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                                >
                                  {updatingInvoiceId === String(invoice.id) ? "Updating..." : "Update settlement"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className={surfaceCard}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">2. Billing mode</h2>
                <p className="text-sm text-slate-500">Choose the billing workflow before entering charges.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="billing_mode"
                    checked={billingMode === "full"}
                    onChange={() => handleModeChange("full")}
                  />
                  Full Bill
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="billing_mode"
                    checked={billingMode === "surgery_only"}
                    onChange={() => handleModeChange("surgery_only")}
                  />
                  Surgery Only
                </label>
              </div>
            </div>
          </div>

          <div className={surfaceCard}>
            <h2 className="text-xl font-semibold text-slate-900">3. Admission and bed details</h2>
            <p className="mt-1 text-sm text-slate-500">Used for full billing mode with bed occupancy charges.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Admission date</label>
                <input
                  type="date"
                  name="admission_date"
                  disabled={billingMode === "surgery_only"}
                  value={billing.admission_date}
                  onChange={handleBillingChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Discharge date</label>
                <input
                  type="date"
                  name="discharge_date"
                  disabled={billingMode === "surgery_only"}
                  value={billing.discharge_date}
                  onChange={handleBillingChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bed type</label>
                <select
                  name="bed_type"
                  disabled={billingMode === "surgery_only"}
                  value={billing.bed_type}
                  onChange={handleBillingChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 disabled:bg-slate-100"
                >
                  <option value="">Select bed type</option>
                  <option value="General">General</option>
                  <option value="Semi-Private">Semi-Private</option>
                  <option value="Private">Private</option>
                  <option value="ICU">ICU</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bed number</label>
                <input
                  type="text"
                  name="bed_number"
                  placeholder="Bed number"
                  disabled={billingMode === "surgery_only"}
                  value={billing.bed_number}
                  onChange={handleBillingChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Bed price per day</label>
                <input
                  type="number"
                  name="bed_price"
                  placeholder="Daily bed price"
                  disabled={billingMode === "surgery_only"}
                  value={billing.bed_price}
                  onChange={handleBillingChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500 disabled:bg-slate-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Calculated stay</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{billing.total_days} days</p>
                <p className="mt-1 text-sm text-slate-500">{formatCurrency(billing.bed_total)} bed charges</p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">4. Surgery items</h2>
                <p className="text-sm text-slate-500">Add one or more surgery charges when needed.</p>
              </div>
              <button
                type="button"
                onClick={addSurgeryRow}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Add item
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {surgeries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                  No surgery items added yet.
                </div>
              ) : (
                surgeries.map((item, index) => (
                  <div key={index} className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <input
                        type="text"
                        placeholder="Surgery name"
                        value={item.surgery_name}
                        onChange={(e) => updateSurgery(index, "surgery_name", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                      />
                      <input
                        type="number"
                        placeholder="Surgery cost"
                        value={item.surgery_cost}
                        onChange={(e) => updateSurgery(index, "surgery_cost", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                      />
                      <input
                        type="date"
                        value={item.surgery_date}
                        onChange={(e) => updateSurgery(index, "surgery_date", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        value={item.notes}
                        onChange={(e) => updateSurgery(index, "notes", e.target.value)}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
                      />
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeSurgery(index)}
                        className="text-sm font-semibold text-rose-600 transition hover:text-rose-700"
                      >
                        Remove item
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={surfaceCard}>
            <h2 className="text-xl font-semibold text-slate-900">5. Payment and totals</h2>
            <p className="mt-1 text-sm text-slate-500">Capture collection status and final billing amount.</p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
                <select
                  name="payment_method"
                  value={payment.payment_method}
                  onChange={handlePaymentChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="insurance">Insurance</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Payment status</label>
                <select
                  name="payment_status"
                  value={payment.payment_status}
                  onChange={handlePaymentChange}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">Transaction reference</label>
                <input
                  type="text"
                  name="transaction_id"
                  value={payment.transaction_id}
                  onChange={handlePaymentChange}
                  placeholder="Optional transaction or receipt reference"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Bed total</span>
                <span className="font-semibold text-slate-900">{formatCurrency(billing.bed_total)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Surgery total</span>
                <span className="font-semibold text-slate-900">{formatCurrency(billing.surgery_total)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-4">
                <span className="text-sm font-semibold text-emerald-700">Grand total</span>
                <span className="text-2xl font-bold text-emerald-900">{formatCurrency(billing.grand_total)}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-500">Surgery entries</span>
                <span className="font-semibold text-slate-900">{surgeryCount}</span>
              </div>
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

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
              >
                {submitting ? "Saving..." : "Save Bill"}
              </button>
              <Link
                href="/register/report"
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Open Reports
              </Link>
            </div>
          </div>
        </section>
      </form>
      </div>
    </div>
  );
}
