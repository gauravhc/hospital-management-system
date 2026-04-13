"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { apiGet, apiPost } from "@/services/api";
import { useRouter } from "next/navigation";

const SERVICE_BY_DEPARTMENT = {
  Cardiology: ["ECG", "Heart Checkup", "Consultation"],
  Neurology: ["Brain Checkup", "Consultation"],
  Orthopedics: ["Joint Care", "Bone Consultation"],
  "General Medicine": ["General Checkup", "Consultation"],
  Pediatrics: ["Child Checkup", "Vaccination"],
};

const normalizePatientSearchResponse = (payload) => {
  const data = payload?.patients ?? payload?.data ?? payload?.results ?? payload;
  return Array.isArray(data) ? data : [];
};

export default function BookAppointment() {
  const router = useRouter();
  const [mode, setMode] = useState("existing"); // existing | new

  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

  const [hospitals, setHospitals] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientResults, setPatientResults] = useState([]);
  const [patientOpen, setPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [newPatient, setNewPatient] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    gender: "",
    date_of_birth: "",
  });

  const [form, setForm] = useState({
    hospitalId: "",
    department: "",
    service: "",
    doctorId: "",
    date: "",
    time: "",
    comments: "",
  });

  const departmentOptions = [
    "Cardiology",
    "Neurology",
    "Orthopedics",
    "General Medicine",
    "Pediatrics",
  ];

  const services = useMemo(
    () => SERVICE_BY_DEPARTMENT[form.department] || ["Consultation"],
    [form.department]
  );

  const filteredDoctors = useMemo(() => {
    const base = form.hospitalId
      ? doctors.filter((d) => String(d.hospital_id) === String(form.hospitalId))
      : doctors;
    if (!form.department) return base;
    const selected = String(form.department).toLowerCase();
    const matched = base.filter((d) => {
      const dept = String(d.department || "").toLowerCase();
      if (!dept) return false;
      return dept.includes(selected) || selected.includes(dept);
    });
    return matched.length ? matched : base;
  }, [doctors, form.department, form.hospitalId]);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        setLoadingHospitals(true);
        const data = await apiGet("/api/hospitals");
        const list = Array.isArray(data?.hospitals) ? data.hospitals : [];
        setHospitals(list);

        const storedHospitalId =
          typeof window !== "undefined" ? localStorage.getItem("hospital_id") : "";
        const initialHospitalId =
          storedHospitalId && list.some((h) => String(h.id) === String(storedHospitalId))
            ? storedHospitalId
            : "";
        if (initialHospitalId) {
          setForm((prev) => ({ ...prev, hospitalId: String(initialHospitalId) }));
        }
      } catch (err) {
        console.error("Failed to load hospitals:", err);
        setHospitals([]);
      } finally {
        setLoadingHospitals(false);
      }
    };

    loadHospitals();
  }, []);

  useEffect(() => {
    const loadDoctors = async () => {
      if (!form.hospitalId) {
        setDoctors([]);
        return;
      }
      try {
        setLoadingDoctors(true);
        const data = await apiGet(`/api/doctors/hospital/${form.hospitalId}`);
        setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
      } catch (err) {
        console.error("Failed to load doctors:", err);
        setDoctors([]);
      } finally {
        setLoadingDoctors(false);
      }
    };

    loadDoctors();
  }, [form.hospitalId]);

  useEffect(() => {
    if (mode !== "existing") return;
    const q = String(patientQuery || "").trim();
    const isNumeric = /^\d+$/.test(q);
    if (q.length < 2 && !isNumeric) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPatientLoading(true);
        const data = await apiGet("/api/patients/search", { q, hospital_id: form.hospitalId, limit: 20 });
        setPatientResults(normalizePatientSearchResponse(data));
      } catch (err) {
        console.error("Patient search failed:", err);
        setPatientResults([]);
      } finally {
        setPatientLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientQuery, mode, form.hospitalId]);

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "hospitalId") {
        next.department = "";
        next.service = "";
        next.doctorId = "";
      }
      if (name === "department") {
        next.service = "";
        next.doctorId = "";
      }
      return next;
    });
  };

  const onNewPatientChange = (e) => {
    const { name, value } = e.target;
    setNewPatient((prev) => ({ ...prev, [name]: value }));
  };

  const ensureAuth = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setShowAuthPrompt(true);
      return false;
    }
    return true;
  };

  const validateBooking = () => {
    if (!form.hospitalId || !form.department || !form.service || !form.doctorId || !form.date || !form.time) {
      setMessage("Please fill all required appointment fields.");
      return false;
    }
    if (!String(form.comments || "").trim()) {
      setMessage("Please add a short reason/notes.");
      return false;
    }

    if (mode === "existing") {
      if (!selectedPatient?.id) {
        setMessage("Please select a patient.");
        return false;
      }
    } else {
      const np = newPatient || {};
      if (!String(np.first_name || "").trim() || !String(np.last_name || "").trim()) {
        setMessage("Please enter patient first name and last name.");
        return false;
      }
      if (!String(np.phone || "").trim()) {
        setMessage("Please enter patient phone.");
        return false;
      }
      if (!String(np.gender || "").trim()) {
        setMessage("Please select patient gender.");
        return false;
      }
      if (!String(np.date_of_birth || "").trim()) {
        setMessage("Please select patient date of birth.");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!ensureAuth()) return;
    if (!validateBooking()) return;

    try {
      setSubmitting(true);

      let patientId = selectedPatient?.id ?? null;

      if (mode === "new") {
        const created = await apiPost("/api/register/create", {
          ...newPatient,
          hospital_id: form.hospitalId,
        });
        patientId = created?.id || created?.patient?.id || created?.patient_id || null;
        if (!patientId) {
          throw new Error("Patient created, but the server did not return a patient id.");
        }
      }

      const selectedDoctor = doctors.find((d) => String(d.doctor_id || d.id) === String(form.doctorId));
      const doctorId = selectedDoctor?.doctor_id || selectedDoctor?.id || form.doctorId;

      const booking = await apiPost("/api/appointments/book", {
        hospital_id: form.hospitalId,
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_date: form.date,
        appointment_time: form.time,
        type: "consultation",
        reason: form.comments.trim(),
        department: form.department,
        service: form.service,
      });

      if (booking?.success) {
        setMessage("Appointment booked successfully.");
        setForm((prev) => ({
          ...prev,
          department: "",
          service: "",
          doctorId: "",
          date: "",
          time: "",
          comments: "",
        }));
        setPatientQuery("");
        setPatientResults([]);
        setSelectedPatient(null);
        setPatientOpen(false);
        if (mode === "new") {
          setNewPatient({
            first_name: "",
            last_name: "",
            email: "",
            phone: "",
            gender: "",
            date_of_birth: "",
          });
        }
      } else {
        setMessage(booking?.message || "Failed to book appointment.");
      }
    } catch (err) {
      setMessage(err?.message || "Failed to book appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#1B2559]">Book Appointment (On Behalf)</h1>
            <p className="mt-2 text-sm text-gray-500">
              Use this when a patient cannot log in (elderly, no phone, etc.). Search an existing patient or quickly create one.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setMode("existing");
                setMessage("");
              }}
              className={mode === "existing"
                ? "px-4 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                : "px-4 py-2.5 bg-white text-gray-800 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"}
            >
              Existing Patient
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setMessage("");
                setSelectedPatient(null);
              }}
              className={mode === "new"
                ? "px-4 py-2.5 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
                : "px-4 py-2.5 bg-white text-gray-800 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"}
            >
              New Patient
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#1B2559]">Patient</h2>

          {mode === "existing" ? (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1B2559]">Search patient (name/email/phone/id)</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setPatientOpen(true);
                    setSelectedPatient(null);
                  }}
                  onFocus={() => setPatientOpen(true)}
                  placeholder="Type at least 2 characters..."
                  className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]"
                />
              </div>

              {selectedPatient ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{selectedPatient.name || "Patient"}</p>
                      <p className="text-xs text-slate-600 truncate">
                        {selectedPatient.email || "—"} · {selectedPatient.phone || "—"} · ID: {selectedPatient.id}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPatient(null)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : null}

              {patientOpen && !selectedPatient ? (
                <div className="rounded-2xl border border-gray-200 bg-white shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-auto">
                    {patientLoading ? (
                      <div className="p-4 text-sm text-gray-600">Searching...</div>
                    ) : patientResults.length === 0 ? (
                      <div className="p-4 text-sm text-gray-600">
                        No results. Try a different name/email or switch to “New Patient”.
                      </div>
                    ) : (
                      patientResults.slice(0, 20).map((p) => (
                        <button
                          key={`${p.role || "patient"}-${p.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setPatientOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                        >
                          <p className="font-bold text-gray-900">{p.name || "Patient"}</p>
                          <p className="text-xs text-gray-600">
                            {p.email || "—"} · {p.phone || "—"} · ID: {p.id}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="flex justify-end p-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setPatientOpen(false)}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1B2559]">First name *</label>
                <input name="first_name" value={newPatient.first_name} onChange={onNewPatientChange} className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1B2559]">Last name *</label>
                <input name="last_name" value={newPatient.last_name} onChange={onNewPatientChange} className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-[#1B2559]">Email (optional)</label>
                <input name="email" value={newPatient.email} onChange={onNewPatientChange} className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1B2559]">Phone *</label>
                <input name="phone" value={newPatient.phone} onChange={onNewPatientChange} className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#1B2559]">Gender *</label>
                <select name="gender" value={newPatient.gender} onChange={onNewPatientChange} className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#0E82FD]">
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-semibold text-[#1B2559]">Date of birth *</label>
                <input
                  name="date_of_birth"
                  type="date"
                  value={newPatient.date_of_birth}
                  onChange={onNewPatientChange}
                  className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-5">
          <h2 className="text-lg font-bold text-[#1B2559]">Appointment</h2>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
              Hospital <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="hospitalId"
                value={form.hospitalId}
                onChange={onFormChange}
                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#0E82FD]"
                required
                disabled={loadingHospitals}
              >
                <option value="">{loadingHospitals ? "Loading hospitals..." : "Select hospital"}</option>
                {hospitals.map((hospital) => (
                  <option key={hospital.id} value={hospital.id}>
                    {hospital.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                Department <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="department"
                  value={form.department}
                  onChange={onFormChange}
                  className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#0E82FD]"
                  required
                  disabled={!form.hospitalId}
                >
                  <option value="">Select</option>
                  {departmentOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                Service <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="service"
                  value={form.service}
                  onChange={onFormChange}
                  className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#0E82FD]"
                  required
                  disabled={!form.department}
                >
                  <option value="">Select</option>
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
              Doctor <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                name="doctorId"
                value={form.doctorId}
                onChange={onFormChange}
                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 appearance-none focus:outline-none focus:border-[#0E82FD]"
                required
                disabled={!form.hospitalId || !form.department || loadingDoctors}
              >
                <option value="">
                  {!form.hospitalId
                    ? "Select hospital first"
                    : !form.department
                      ? "Select department first"
                      : loadingDoctors
                        ? "Loading doctors..."
                        : "Select doctor"}
                </option>
                {filteredDoctors.map((d) => (
                  <option key={d.doctor_id || d.id} value={d.doctor_id || d.id}>
                    {d.name}
                    {d.department ? ` - ${d.department}` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                name="date"
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={form.date}
                onChange={onFormChange}
                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
                Time <span className="text-red-500">*</span>
              </label>
              <input
                name="time"
                type="time"
                step="60"
                value={form.time}
                onChange={onFormChange}
                className="w-full h-10 px-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD]"
                required
              />
              <p className="text-[11px] text-slate-500">24-hour format (HH:MM)</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#1B2559] flex items-center gap-1">
              Notes / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              name="comments"
              rows={4}
              value={form.comments}
              onChange={onFormChange}
              placeholder="Brief reason, symptoms, or notes for the doctor..."
              className="w-full p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:border-[#0E82FD] resize-none"
              required
            />
          </div>

          {message ? (
            <p className={`text-sm font-semibold ${message.toLowerCase().includes("success") ? "text-emerald-700" : "text-rose-700"}`}>
              {message}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => router.push("/admin")}
              className="px-5 py-3 bg-white text-gray-800 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? "Booking..." : "Book Appointment"}
            </button>
          </div>
        </div>
      </form>

      {showAuthPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-slate-900">Sign In Required</h4>
            <p className="mt-2 text-sm text-slate-600">
              Please sign in as a hospital admin to book appointments for patients.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAuthPrompt(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
