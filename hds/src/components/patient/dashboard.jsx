"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, ShieldCheck, ShoppingCart, TestTube, Truck, User } from "lucide-react";

import { apiGet } from "@/services/api";

import { API_BASE_URL } from "@/lib/apiBaseUrl";

const vitals = {
  bloodPressure: "118/76 mmHg",
  heartRate: "78 bpm",
  temperature: "36.6 C",
  spo2: "98 %",
  respRate: "16 rpm",
  weight: "72 kg",
};

const cards = [
  { id: "appointments", title: "All Appointments", href: "/patient/appointments", desc: "Upcoming and past appointments", icon: Calendar, accent: "bg-sky-500", box: "bg-sky-100 text-sky-600" },
  { id: "lab", title: "Lab Reports", href: "/patient/lab", desc: "View test results", icon: TestTube, accent: "bg-violet-500", box: "bg-violet-100 text-violet-600" },
  { id: "pharmacy", title: "Pharmacy Orders", href: "/patient/pharmacy", desc: "Order medicines", icon: ShoppingCart, accent: "bg-amber-500", box: "bg-amber-100 text-amber-600" },
  { id: "insurance", title: "Insurance Claims", href: "/patient/insurance", desc: "Submit and track claims", icon: ShieldCheck, accent: "bg-rose-500", box: "bg-rose-100 text-rose-600" },
  { id: "ambulance", title: "Book Ambulance", href: "/patient/ambulance", desc: "24/7 emergency service", icon: Truck, accent: "bg-red-500", box: "bg-red-100 text-red-600" },
];

export default function PatientDashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [patientId, setPatientId] = useState("");
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [upcomingAppointment, setUpcomingAppointment] = useState(null);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [ambulanceRequest, setAmbulanceRequest] = useState(null);
  const [ambulanceLoading, setAmbulanceLoading] = useState(false);
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    return hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [profileRes, medicalRes, emergencyRes, documentsRes, appointmentsRes] = await Promise.all([
          apiGet("/api/patients/profile"),
          apiGet("/api/patients/medical-history"),
          apiGet("/api/patient/emergency"),
          apiGet("/api/patients/documents"),
          apiGet("/api/patients/appointments"),
        ]);

        const profilePayload = profileRes?.data || profileRes?.user || profileRes;
        setProfile(profileRes?.success ? profilePayload : null);
        const storedId = typeof window !== "undefined" ? localStorage.getItem("id") : "";
        const resolvedId = profilePayload?.patient_id || profilePayload?.id || storedId || "";
        setPatientId(String(resolvedId || ""));
        setMedicalHistory(medicalRes?.success ? medicalRes : null);
        setEmergencyContact(emergencyRes?.success ? emergencyRes : null);
        const docs = Array.isArray(documentsRes?.documents)
          ? documentsRes.documents
          : Array.isArray(documentsRes?.data)
          ? documentsRes.data
          : [];
        setDocuments(docs);

        const list = Array.isArray(appointmentsRes?.appointments) ? appointmentsRes.appointments : [];
        const today = new Date().toISOString().split("T")[0];
        const upcoming = list
          .filter((item) => {
            const date = String(item?.date || item?.appointment_date || "").split("T")[0];
            const status = String(item?.status || "").toLowerCase();
            return date && date >= today && status !== "cancelled";
          })
          .sort((a, b) => new Date(a.date || a.appointment_date) - new Date(b.date || b.appointment_date));

        setUpcomingCount(upcoming.length);
        setUpcomingAppointment(upcoming[0] || null);
      } catch (error) {
        console.error("PATIENT DASHBOARD LOAD ERROR:", error);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const loadAmbulance = async () => {
      try {
        setAmbulanceLoading(true);
        const res = await apiGet("/api/ambulance/my-requests");
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.requests)
          ? res.requests
          : [];
        setAmbulanceRequest(list[0] || null);
      } catch (err) {
        // ignore
      } finally {
        setAmbulanceLoading(false);
      }
    };

    loadAmbulance();
    const id = setInterval(loadAmbulance, 5000);
    return () => clearInterval(id);
  }, []);

  const avatarUrl = useMemo(() => {
    const raw = profile?.profile_image_url || profile?.profile_image || "";
    if (!raw) return "";
    const value = String(raw).trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
    if (value.startsWith("uploads/")) return `${API_BASE_URL}/${value}`;
    if (value.startsWith("profile_images/")) return `${API_BASE_URL}/uploads/${value}`;
    return `${API_BASE_URL}/uploads/profile_images/${value}`;
  }, [profile]);
  const initials = useMemo(() => {
    const name = String(profile?.name || "").trim();
    return name ? name.charAt(0).toUpperCase() : "P";
  }, [profile]);

  const displayName = useMemo(() => {
    const name = String(profile?.name || "").trim();
    return name || "Patient";
  }, [profile]);

  return (
    <div className="w-full max-w-full min-w-0 bg-transparent p-4 sm:p-6">
      <div className="min-h-screen">
        <div className="mb-6 rounded-[30px] border border-white/30 bg-white/95 p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex w-full items-center gap-4 min-w-0">
              <div className="flex h-16 w-16 sm:h-24 sm:w-24 items-center justify-center overflow-hidden rounded-[20px] bg-slate-200 text-2xl sm:text-3xl font-bold text-slate-500 shadow-inner shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>

              <div className="min-w-0">
                <p className="text-xs text-slate-500">
                  Patient ID: <span className="font-semibold text-sky-500">#{patientId || "--"}</span>
                </p>
                <h2 className="text-xl sm:text-3xl font-extrabold text-slate-800 break-words">
                  {greeting}, <span className="text-sky-500 break-words">{displayName}</span>
                </h2>
                <p className="text-sm text-slate-500">Welcome back — your dashboard</p>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-end gap-3 md:w-auto">
              <Link
                href="/patient/profile"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 sm:px-6 sm:py-4 text-sm font-medium text-slate-800 transition hover:bg-slate-50 w-full sm:w-auto"
              >
                <User size={18} />
                Profile
              </Link>
              <button
                type="button"
                onClick={() => router.push("/appointment")}
                className="rounded-2xl bg-sky-600 px-5 py-3 sm:px-7 sm:py-4 text-sm font-semibold text-white shadow-lg shadow-sky-200 transition hover:bg-sky-700 w-full sm:w-auto"
              >
                Book Appointment
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-[28px] border border-red-100 bg-red-50/80 p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Ambulance</p>
              <p className="mt-1 text-lg font-extrabold text-slate-900">
                {ambulanceLoading ? "Updating..." : (ambulanceRequest?.status || "No active request")}
              </p>
              {(ambulanceRequest?.driver_name || ambulanceRequest?.driver_phone) && (
                <p className="mt-1 text-sm text-slate-700">
                  Driver: {ambulanceRequest?.driver_name || "--"} {ambulanceRequest?.driver_phone ? `(${ambulanceRequest.driver_phone})` : ""}
                </p>
              )}
              {ambulanceRequest?.eta_minutes ? (
                <p className="text-sm text-slate-700">ETA: {ambulanceRequest.eta_minutes} min</p>
              ) : null}
            </div>

            <Link
              href="/patient/ambulance"
              className="inline-flex items-center justify-center px-6 py-3 text-white font-extrabold rounded-full transition-all duration-200 shadow-lg shadow-red-200/70 hover:shadow-xl hover:shadow-orange-200/60 hover:-translate-y-0.5 active:translate-y-0 bg-[linear-gradient(90deg,#ff3b3b,#ff7a18)]"
            >
              Request Ambulance
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-white/20 bg-white/95 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold text-slate-900">About</h3>
              <Link href="/patient/profile" className="text-sm text-sky-500 hover:underline">
                Edit
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">DOB</p>
                <p className="mt-1 font-medium text-slate-800">
                  {profile?.dob ? new Date(profile.dob).toLocaleDateString() : "--"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Gender</p>
                <p className="mt-1 font-medium capitalize text-slate-800">{profile?.gender || "--"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Blood Group</p>
                <p className="mt-1 font-medium text-rose-600">{profile?.blood_group || "--"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Status</p>
                <p className="mt-1 font-medium text-slate-800">
                  {medicalHistory?.condition || medicalHistory?.diagnosis || medicalHistory?.chronic_diseases ? "Profile Updated" : "--"}
                </p>
              </div>
              <div className="col-span-2 mt-1 border-t border-slate-200 pt-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Emergency</p>
                <p className="mt-1 font-medium text-slate-800">
                  {emergencyContact?.contact_name || profile?.emergency_contact?.contact_name || "--"}
                </p>
                <p className="text-xs text-slate-500">
                  {emergencyContact?.phone || profile?.emergency_contact?.phone || ""}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-white/95 p-4 sm:p-6 shadow-xl lg:col-span-2">
            <h3 className="mb-4 text-xl sm:text-2xl font-semibold text-slate-900">Vital Signs</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {Object.entries(vitals).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-sky-50 p-4 sm:p-5">
                  <p className="text-xs sm:text-sm capitalize text-slate-600">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="mt-2 text-lg sm:text-2xl font-bold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-[24px] bg-sky-50 p-4 sm:p-6 shadow-xl">
            <p className="text-xs sm:text-sm text-slate-600">Upcoming Appointments ({upcomingCount})</p>
            {upcomingAppointment ? (
              <div className="mt-3">
                <p className="text-3xl sm:text-4xl font-bold text-slate-900">
                  {new Date(upcomingAppointment.date || upcomingAppointment.appointment_date).getDate()}
                </p>
                <p className="text-base sm:text-lg font-semibold text-slate-900">
                  {new Date(upcomingAppointment.date || upcomingAppointment.appointment_date).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 break-words">
                  Doctor: {upcomingAppointment.doctorName || upcomingAppointment.doctor_name || "--"}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-xs sm:text-sm text-slate-600">No upcoming appointments</p>
            )}
          </div>

          <div className="rounded-[24px] bg-amber-50 p-4 sm:p-6 shadow-xl">
            <p className="text-xs sm:text-sm text-slate-600">Pending Lab Reports</p>
            <p className="mt-4 text-3xl sm:text-4xl font-bold text-slate-900">0</p>
            <p className="mt-2 text-xs sm:text-sm text-slate-600">pending</p>
          </div>

          <div className="rounded-[24px] bg-emerald-50 p-4 sm:p-6 shadow-xl">
            <p className="text-xs sm:text-sm text-slate-600">Active Claims</p>
            <p className="mt-4 text-lg sm:text-2xl font-bold text-slate-900 break-words">No active claims</p>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <Link key={card.id} href={card.href} className="block">
              <div className="overflow-hidden rounded-[24px] border border-white/20 shadow-xl transition hover:-translate-y-1">
                <div className={`h-full w-2 ${card.accent} float-left`} />
                <div className="bg-white/95 p-4 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`rounded-2xl p-3 ${card.box}`}>
                      <card.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                      <p className="text-sm text-slate-600">{card.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}

          <Link href="/patient/documents" className="block">
            <div className="rounded-[24px] border border-white/20 bg-white/95 p-6 shadow-xl transition hover:-translate-y-1">
              <h3 className="text-lg font-semibold text-slate-900">Documents Vault</h3>
              <p className="mt-2 text-sm text-slate-600">Medical and scanned docs</p>
              <p className="mt-4 text-3xl font-bold text-slate-900">{documents.length}</p>
              <p className="text-sm text-slate-500">uploaded files</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
