"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

const todayDate = () => new Date().toISOString().split("T")[0];

const formatDoctorDepartment = (doctor) =>
  doctor?.department || doctor?.specialization || "General";

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-4 md:p-6";
const pageContent = "mx-auto w-full max-w-7xl space-y-6";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";
const insetCard = "rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4";

export default function PatientRegistration() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientIdFromQuery = searchParams.get("patient_id") || "";

  const [username, setUsername] = useState("");
  const [patientsList, setPatientsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const [patient, setPatient] = useState({
    patient_id: "",
    name: "",
    age: "",
    mobile: "",
    user_id: null,
    address: "",
  });

  const [appointment, setAppointment] = useState({
    doctor_id: "",
    doctor_name: "",
    department: "",
    date: todayDate(),
    time: "",
    payment_status: "pending",
    payment_method: "cash",
    symptoms: "",
    notes: "",
  });

  useEffect(() => {
    const user = localStorage.getItem("username");
    setUsername(user || "");
  }, []);

  const loadPatientById = async (resolvedPatientId) => {
    if (!resolvedPatientId) return;

    try {
      const data = await apiGet(`/api/patients/${resolvedPatientId}`);
      const details = data?.patient || data;
      if (!details) return;

      setPatient({
        patient_id: details.patient_id || details.id || resolvedPatientId,
        user_id: details.user_id || null,
        name: details.name || details.full_name || "",
        age: details.age || "",
        mobile: details.phone || details.mobile || "",
        address: details.address_line1 || details.address || "",
      });
      setSearchQuery(
        `${details.patient_id || details.id || resolvedPatientId} - ${details.name || details.full_name || ""}`.trim()
      );
    } catch (err) {
      console.log("Patient Load Error:", err);
    }
  };

  useEffect(() => {
    if (!patientIdFromQuery) return;
    loadPatientById(patientIdFromQuery);
  }, [patientIdFromQuery]);

  useEffect(() => {
    const loadPatients = async () => {
      setLoadingPatients(true);
      try {
        const data = await apiGet("/api/patients/all");
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.patients)
            ? data.patients
            : [];
        setPatientsList(list);
      } catch (err) {
        console.log("Patient list load error:", err);
        setPatientsList([]);
      } finally {
        setLoadingPatients(false);
      }
    };

    loadPatients();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      setLoadingDoctors(true);
      try {
        const data = await apiGet("/api/doctors");
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.doctors)
            ? data.doctors
            : [];
        setDoctors(list);
      } catch (err) {
        console.log("Doctor Fetch Error:", err);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const results = patientsList.filter((entry) => {
      return (
        String(entry?.patient_id || "").toLowerCase().includes(q) ||
        String(entry?.name || entry?.full_name || "").toLowerCase().includes(q) ||
        String(entry?.phone || entry?.mobile || "").toLowerCase().includes(q)
      );
    });

    setSearchResults(results.slice(0, 25));
    setShowDropdown(results.length > 0);
  }, [searchQuery, patientsList]);

  const selectedDoctor = useMemo(() => {
    return doctors.find((doctor) => String(doctor.id) === String(appointment.doctor_id)) || null;
  }, [doctors, appointment.doctor_id]);

  const patientReady = Boolean(patient.patient_id);

  const clearFeedback = () => setFeedback({ type: "", text: "" });

  const selectPatient = async (entry) => {
    clearFeedback();
    setShowDropdown(false);
    await loadPatientById(entry?.patient_id || entry?.id || "");
  };

  const clearPatient = () => {
    setPatient({
      patient_id: "",
      name: "",
      age: "",
      mobile: "",
      user_id: null,
      address: "",
    });
    setSearchQuery("");
    setSearchResults([]);
    setShowDropdown(false);
    clearFeedback();
  };

  const handleAppointmentChange = (e) => {
    const { name, value } = e.target;
    setAppointment((prev) => ({ ...prev, [name]: value }));
  };

  const handleDoctorSelect = (e) => {
    const id = e.target.value;
    const doctor = doctors.find((entry) => String(entry.id) === String(id));

    setAppointment((prev) => ({
      ...prev,
      doctor_id: id,
      doctor_name: doctor?.name || "",
      department: formatDoctorDepartment(doctor),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearFeedback();

    if (!patient.patient_id) {
      setFeedback({ type: "error", text: "Select a patient before booking the appointment." });
      return;
    }

    if (!appointment.doctor_id || !appointment.date || !appointment.time) {
      setFeedback({ type: "error", text: "Doctor, appointment date, and time are required." });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patient_id: patient.patient_id,
        patient_name: patient.name,
        doctor_id: appointment.doctor_id,
        appointment_date: appointment.date || null,
        appointment_time: appointment.time || null,
        date: appointment.date || null,
        time: appointment.time || null,
        doctor_name: appointment.doctor_name,
        symptoms: appointment.symptoms || null,
        notes: appointment.notes || null,
        payment_status: appointment.payment_status || "pending",
        payment_method: appointment.payment_method || "cash",
        status: "awaiting_registration",
      };

      const data = await apiPost("/api/register/create-appointment", payload);
      if (!data?.success) {
        setFeedback({ type: "error", text: data?.message || "Failed to register appointment." });
        return;
      }

      setFeedback({ type: "success", text: "Appointment registered successfully." });
      router.push("/register");
    } catch (err) {
      console.error(err);
      setFeedback({ type: "error", text: err?.message || "Server error while creating appointment." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={pageShell}>
      <div className={pageContent}>
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.55)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">
                Reception Desk
              </p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Appointment intake</h1>
              <p className="mt-3 max-w-2xl text-sm text-sky-50 md:text-base">
                Search for a patient, select the doctor and slot, then complete the front-desk
                registration in one flow.
              </p>
              {username ? (
                <p className="mt-3 text-sm text-cyan-100">Working as {username}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/register/patient-create"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Create Patient
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
                  <p className="text-sm text-slate-500">
                    Search by patient ID, name, or mobile number.
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {loadingPatients ? "Loading patients..." : `${patientsList.length} patients available`}
                </div>
              </div>

              <div className="relative mt-5">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Patient search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowDropdown(searchResults.length > 0)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  placeholder="Search patient by ID, name, or mobile"
                />

                {showDropdown && searchResults.length > 0 ? (
                  <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                    {searchResults.map((entry) => (
                      <li key={entry.patient_id || entry.id}>
                        <button
                          type="button"
                          onMouseDown={() => selectPatient(entry)}
                          className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">
                              {entry.name || entry.full_name || "--"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {entry.patient_id || entry.id || "--"} - {entry.phone || entry.mobile || "No mobile"}
                            </p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={clearPatient}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Clear selection
                </button>
                <Link
                  href="/register/patient-create"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  New patient registration
                </Link>
              </div>
            </div>

            <div className={surfaceCard}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Patient snapshot</h2>
                  <p className="text-sm text-slate-500">
                    Confirm the selected patient before booking.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    patientReady ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {patientReady ? "Ready to book" : "Patient required"}
                </span>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className={insetCard}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
                  <p className="mt-2 font-semibold text-slate-900">{patient.patient_id || "--"}</p>
                </div>
                <div className={insetCard}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Patient Name</p>
                  <p className="mt-2 font-semibold text-slate-900">{patient.name || "--"}</p>
                </div>
                <div className={insetCard}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Mobile</p>
                  <p className="mt-2 font-semibold text-slate-900">{patient.mobile || "--"}</p>
                </div>
                <div className={insetCard}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Age</p>
                  <p className="mt-2 font-semibold text-slate-900">{patient.age || "--"}</p>
                </div>
              </div>

              <div className={`mt-4 ${insetCard}`}>
                <p className="text-xs uppercase tracking-wide text-slate-500">Address</p>
                <p className="mt-2 text-sm text-slate-700">{patient.address || "No address available"}</p>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className={surfaceCard}>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">2. Appointment details</h2>
                  <p className="text-sm text-slate-500">
                    Choose the doctor, slot, and front-desk intake notes.
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {loadingDoctors ? "Loading doctors..." : `${doctors.length} doctors available`}
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Doctor</label>
                  <select
                    name="doctor_id"
                    value={appointment.doctor_id}
                    onChange={handleDoctorSelect}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  >
                    <option value="">Select doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {formatDoctorDepartment(doctor)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Appointment date</label>
                  <input
                    type="date"
                    name="date"
                    min={todayDate()}
                    value={appointment.date}
                    onChange={handleAppointmentChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Appointment time</label>
                  <input
                    type="time"
                    name="time"
                    value={appointment.time}
                    onChange={handleAppointmentChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Payment status</label>
                  <select
                    name="payment_status"
                    value={appointment.payment_status}
                    onChange={handleAppointmentChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Payment method</label>
                  <select
                    name="payment_method"
                    value={appointment.payment_method}
                    onChange={handleAppointmentChange}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="insurance">Insurance</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Symptoms / visit reason</label>
                  <textarea
                    name="symptoms"
                    value={appointment.symptoms}
                    onChange={handleAppointmentChange}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                    placeholder="Briefly note symptoms or the reason for the visit"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Front-desk notes</label>
                  <textarea
                    name="notes"
                    value={appointment.notes}
                    onChange={handleAppointmentChange}
                    rows={3}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-sky-500"
                    placeholder="Optional notes for registration, payment, or intake"
                  />
                </div>
              </div>
            </div>

            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Booking summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                  <span className="text-slate-500">Patient</span>
                  <span className="font-semibold text-slate-900">{patient.name || "--"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                  <span className="text-slate-500">Doctor</span>
                  <span className="font-semibold text-slate-900">{appointment.doctor_name || "--"}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                  <span className="text-slate-500">Department</span>
                  <span className="font-semibold text-slate-900">
                    {appointment.department || formatDoctorDepartment(selectedDoctor)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                  <span className="text-slate-500">Schedule</span>
                  <span className="font-semibold text-slate-900">
                    {appointment.date || "--"} {appointment.time || ""}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/90 px-4 py-3">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-semibold capitalize text-slate-900">
                    {appointment.payment_status} / {appointment.payment_method}
                  </span>
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
                  className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                >
                  {submitting ? "Registering..." : "Register Appointment"}
                </button>
                <Link
                  href="/register/billing"
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Go to Billing
                </Link>
              </div>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
