"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPut } from "@/services/api";
import {
  Calendar,
  User,
  LogOut,
  Search,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
  Camera,
  Stethoscope,
  Activity,
  Users,
  ClipboardList
} from "lucide-react";

import { API_BASE_URL } from "@/lib/apiBaseUrl";

function buildAvatarUrl(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
  if (value.startsWith("uploads/")) return `${API_BASE_URL}/${value}`;
  if (value.startsWith("profile_images/")) return `${API_BASE_URL}/uploads/${value}`;
  return `${API_BASE_URL}/uploads/profile_images/${value}`;
}

export default function DoctorPage() {
  const router = useRouter();
  // User State
  const [username, setUsername] = useState("Doctor");
  const [doctorId, setDoctorId] = useState("");
  const [hospitalLabel, setHospitalLabel] = useState("");
  const [greeting, setGreeting] = useState("Welcome");
  const [isDark, setIsDark] = useState(false);
  const [avatar, setAvatar] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  // Data State
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nurseTasks, setNurseTasks] = useState([]);
  const [nurseTasksLoading, setNurseTasksLoading] = useState(false);
  const [nurseTasksError, setNurseTasksError] = useState("");

  // Search & Filter
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  // Patient Search (Legacy feature support)
  const [patient, setPatient] = useState(null);

  // Availability State
  const [availableDate, setAvailableDate] = useState("");
  const [availableTime, setAvailableTime] = useState("");
  const [availabilityMessage, setAvailabilityMessage] = useState("");

  // Helper: Truncate Name
  function formatName(name) {
    if (!name) return "Doctor";
    return name.length > 20 ? name.substring(0, 20) + "..." : name;
  }

  // 2. Fetch Appointments
  const fetchAppointments = useCallback(async (userId) => {
    setLoading(true);
    try {
      const data = await apiGet("/api/appointments", {
        role: "doctor",
        userId,
      });

      const list = data.appointments || [];
      setAppointments(list);
      setFiltered(list);
    } catch (err) {
      console.error("Error fetching appointments:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchNurseTasks = useCallback(async () => {
    setNurseTasksLoading(true);
    setNurseTasksError("");
    try {
      const res = await apiGet("/api/tasks/doctor");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setNurseTasks(list);
    } catch (err) {
      // keep doctor dashboard resilient even if tasks endpoint isn't available yet
      console.error("Error fetching nurse tasks:", err);
      setNurseTasksError(err?.message || "Failed to load nurse tasks");
      setNurseTasks([]);
    } finally {
      setNurseTasksLoading(false);
    }
  }, []);

  // 1. Init (Auth + Theme + Greeting)
  useEffect(() => {
    // Auth Check
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
    const role = localStorage.getItem("role") || parsedUser?.role;
    const user = parsedUser?.name || localStorage.getItem("username") || parsedUser?.username || parsedUser?.email;
    const userId = localStorage.getItem("id") || parsedUser?.id;
    const initialHospitalId =
      parsedUser?.hospital_id ||
      parsedUser?.hospitalId ||
      parsedUser?.hospital?.id ||
      localStorage.getItem("hospital_id") ||
      "";

    if (!token || role !== "doctor") {
      router.push("/login");
      return;
    }

    setUsername(user || "");
    setDoctorId(String(userId || "").trim());
    setAvatar(buildAvatarUrl(parsedUser?.profile_image_url || parsedUser?.profile_image || ""));

    // Greeting
    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening");

    // Theme (from localstorage or media query)
    const stored = localStorage.getItem("theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored === "dark" || (!stored && prefersDark));

    // Fetch Data
    fetchAppointments(userId);
    fetchNurseTasks();

    const taskInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchNurseTasks();
      }
    }, 10_000);

    const loadHospital = async (hospitalId) => {
      const hid = String(hospitalId || "").trim();
      if (!hid) return;
      try {
        const res = await apiGet("/api/hospitals/list");
        const list = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.hospitals)
          ? res.hospitals
          : [];
        const match = list.find((h) => String(h?.id) === hid);
        if (!match) return;
        const label = `${match.name || ""}${match.address ? ` - ${match.address}` : ""}`.trim();
        if (label) setHospitalLabel(label);
      } catch {
        // ignore
      }
    };

    loadHospital(initialHospitalId);

    // Best-effort: refresh profile details for name/avatar if available.
    (async () => {
      try {
        const profileRes = await apiGet("/api/auth/profile");
        const profile = profileRes?.data || profileRes?.user || profileRes;
        const displayName = profile?.name || profile?.full_name || profile?.fullName;
        if (displayName) setUsername(displayName);
        const nextAvatar = buildAvatarUrl(profile?.profile_image_url || profile?.profile_image || "");
        if (nextAvatar) setAvatar(nextAvatar);

        const profileHospitalId = profile?.hospital_id || profile?.hospitalId || profile?.hospital?.id || "";
        if (profileHospitalId) loadHospital(profileHospitalId);
      } catch (err) {
        // ignore
      }
    })();

    return () => clearInterval(taskInterval);
  }, [fetchAppointments, fetchNurseTasks, router]);

  const goToProfile = () => {
    setProfileMessage("");
    setProfileError("");
    router.push("/doctor/profile");
  };

  // 3. Search & Filter Logic
  useEffect(() => {
    let result = [...appointments];

    // Global Search
    const searchVal = search.trim();
    if (searchVal) {
      const lower = searchVal.toLowerCase();
      // If searching PAT ID specifically
      if (lower.startsWith("pat")) {
        result = result.filter(a => a.patient_id?.toLowerCase().includes(lower) || a.patientId?.toLowerCase().includes(lower));
        // Also fetch specific patient info if needed (legacy feature)
        if (searchVal.length > 5) fetchPatientInfo(searchVal);
        else setPatient(null);
      } else {
        setPatient(null);
        result = result.filter(
          (a) =>
            a.patientName?.toLowerCase().includes(lower) ||
            a.symptoms?.toLowerCase().includes(lower) ||
            a.date?.toLowerCase().includes(lower)
        );
      }
    } else {
      setPatient(null);
    }

    // Status Filter
    if (statusFilter !== "all") {
      const s = statusFilter.toLowerCase();
      result = result.filter((a) => (a.status || "").toLowerCase() === s);
    }

    // Date Filter
    if (dateFilter) {
      result = result.filter((a) => a.date === dateFilter);
    }

    setFiltered(result);
  }, [appointments, search, statusFilter, dateFilter]);

  // Legacy: Fetch single patient info for search card
  const fetchPatientInfo = async (pid) => {
    try {
      const data = await apiGet(`/api/patients/${pid}`);

      let pData = null;
      if (data && data.patient) pData = data.patient;
      else if (data && data.data) pData = data.data;
      else if (data && data.name) pData = data; // fallback if direct object

      setPatient(pData);
    } catch (err) {
      // console.error(err);
      setPatient(null);
    }
  };

  // 4. Availability
  const handleSaveAvailability = async () => {
    setAvailabilityMessage("");
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await apiPut("/api/doctors/availability",
        { available_date: availableDate || null, available_time: availableTime || null }
      );

      if (res && (res.success || res.message)) {
        setAvailabilityMessage("Availability updated successfully");
        // clear after 3s
        setTimeout(() => setAvailabilityMessage(""), 3000);
      }
    } catch (err) {
      setAvailabilityMessage("Failed to update availability");
    }
  };

  // 5. Logout


  // Stats Calculations
  const totalAppointments = appointments.length;
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayCount = appointments.filter((a) => a.date === todayISO).length;
  const pendingCount = appointments.filter(
    (a) => (a.status || "").toLowerCase() === "pending"
  ).length;

  // Status Badge
  const renderStatusBadge = (status) => {
    const s = (status || "pending").toLowerCase();
    let colorClass, icon;

    if (s === "completed") {
      colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      icon = <CheckCircle size={12} className="mr-1" />;
    } else if (s === "in-progress") {
      colorClass = "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
      icon = <Activity size={12} className="mr-1" />;
    } else {
      colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      icon = <Clock size={12} className="mr-1" />;
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {s.charAt(0).toUpperCase() + s.slice(1)}
      </span>
    );
  };

  const renderTaskStatusBadge = (status) => {
    const raw = String(status || "pending").toLowerCase().replace(/_/g, "-");
    let colorClass, icon;

    if (raw === "completed") {
      colorClass = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
      icon = <CheckCircle size={12} className="mr-1" />;
    } else if (raw === "in-progress") {
      colorClass = "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400";
      icon = <Activity size={12} className="mr-1" />;
    } else if (raw === "accepted") {
      colorClass = "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
      icon = <CheckCircle size={12} className="mr-1" />;
    } else {
      colorClass = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      icon = <Clock size={12} className="mr-1" />;
    }

    const label = raw
      .split("-")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {icon}
        {label}
      </span>
    );
  };

  return (
    <div className={`${isDark ? "bg-slate-900 text-slate-100" : "bg-slate-50 text-slate-900"} min-h-screen flex flex-col`}>

      {/* MAIN CONTENT AREA */}
      <main
        className={`flex-1 px-4 sm:px-6 py-6 sm:py-8 max-w-full ${isDark ? "bg-slate-900" : "bg-white"}`}
      >

        {/* HEADER */}
        <div className="bg-white dark:bg-slate-800 shadow-xl rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center justify-between mb-6 border border-white/20 gap-4 md:gap-0 max-w-full min-w-0">

          {/* Left: Avatar & Greeting */}
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-5 w-full md:w-auto text-center sm:text-left min-w-0">
            <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-xl bg-slate-200 dark:bg-slate-700 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-inner border border-slate-100">
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="Doctor profile" className="h-full w-full object-cover" />
              ) : (
                <Stethoscope className="w-8 h-8 md:w-10 md:h-10 text-slate-400" />
              )}
              <button
                type="button"
                onClick={goToProfile}
                className="absolute bottom-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/70 text-white hover:bg-slate-900/80"
                aria-label="Open profile"
                title="Open profile"
              >
                <Camera size={16} />
              </button>
            </div>

            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Doctor Dashboard
              </p>
              <h2 className="text-lg sm:text-xl md:text-3xl font-extrabold text-slate-800 dark:text-white break-words">
                {greeting}, <span className="text-sky-600 dark:text-sky-400">Dr. {formatName(username)}</span>
              </h2>
              {doctorId ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  Doctor ID: <span className="font-mono">{doctorId}</span>
                </p>
              ) : null}
              {hospitalLabel ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                  Hospital: <span className="font-semibold">{hospitalLabel}</span>
                </p>
              ) : null}
              <p className="text-sm text-slate-500 dark:text-slate-300">
                Manage your schedule and patients
              </p>
              {profileMessage ? (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">{profileMessage}</p>
              ) : null}
              {profileError ? (
                <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 font-medium">{profileError}</p>
              ) : null}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2 w-full md:w-auto md:justify-end">
            <button
              type="button"
              onClick={goToProfile}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-200 hover:bg-slate-50 transition shadow-sm"
            >
              <User size={18} /> Profile
            </button>

          </div>
        </div>

        {/* TOP ROW: Availability & Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

          {/* 1. Availability Card (Left) */}
          <div className="col-span-1 bg-white/90 dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-lg text-sky-600">
                <Clock size={20} />
              </div>
              <h3 className="font-semibold text-lg text-slate-800 dark:text-white">Set Availability</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Next Available Date</label>
                <input
                  type="date"
                  value={availableDate}
                  onChange={(e) => setAvailableDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Time</label>
                <input
                  type="time"
                  value={availableTime}
                  onChange={(e) => setAvailableTime(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-sky-500 outline-none transition"
                />
              </div>

              <button
                onClick={handleSaveAvailability}
                className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition shadow-lg shadow-sky-200 dark:shadow-none"
              >
                Update Schedule
              </button>

              {availabilityMessage && (
                <p className="text-xs text-center text-emerald-600 font-medium animate-pulse">
                  {availabilityMessage}
                </p>
              )}
            </div>
          </div>

          {/* 2. Stats (Right - Spanning 2 cols) */}
          <div className="col-span-1 lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat 1 */}
            <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-900/40 dark:to-violet-800/20 p-5 rounded-2xl border border-violet-100 dark:border-violet-800 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-violet-600 dark:text-violet-300 font-medium text-sm">Today&apos;s Appointments</p>
                <h3 className="text-3xl font-bold text-violet-900 dark:text-white mt-1">{todayCount}</h3>
              </div>
              <div className="self-end p-2 bg-white dark:bg-violet-900/50 rounded-full text-violet-500">
                <Calendar size={20} />
              </div>
            </div>

            {/* Stat 2 */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/40 dark:to-emerald-800/20 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-emerald-600 dark:text-emerald-300 font-medium text-sm">Completed All Time</p>
                <h3 className="text-3xl font-bold text-emerald-900 dark:text-white mt-1">{totalAppointments - pendingCount}</h3>
              </div>
              <div className="self-end p-2 bg-white dark:bg-emerald-900/50 rounded-full text-emerald-500">
                <CheckCircle size={20} />
              </div>
            </div>

            {/* Stat 3 */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/40 dark:to-amber-800/20 p-5 rounded-2xl border border-amber-100 dark:border-amber-800 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-amber-600 dark:text-amber-300 font-medium text-sm">Pending Requests</p>
                <h3 className="text-3xl font-bold text-amber-900 dark:text-white mt-1">{pendingCount}</h3>
              </div>
              <div className="self-end p-2 bg-white dark:bg-amber-900/50 rounded-full text-amber-500">
                <AlertCircle size={20} />
              </div>
            </div>
          </div>
        </div>

        {/* Nurse Task Progress (from nurses) */}
        <div className="mt-6 bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <ClipboardList className="text-indigo-500" size={20} /> Nurse Task Progress
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Shows when a nurse accepts/starts/completes tasks you created.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchNurseTasks}
              disabled={nurseTasksLoading}
              className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {nurseTasksLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="p-5">
            {nurseTasksError ? (
              <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                {nurseTasksError} (Make sure the `backend/` server is running on `NEXT_PUBLIC_API_URL` and not `hds/app.js`.)
              </div>
            ) : null}

            {nurseTasksLoading ? (
              <p className="text-sm text-slate-500">Loading tasks...</p>
            ) : nurseTasks.length === 0 ? (
              <p className="text-sm text-slate-500">No nurse tasks yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 text-xs uppercase tracking-wider">
                      <th className="p-3">Patient</th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Nurse</th>
                      <th className="p-3">Nurse Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {nurseTasks.slice(0, 8).map((t) => (
                      <tr key={String(t.id || `${t.patient_id}-${t.created_at || ""}`)}>
                        <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                          {t.patient_name || t.patient_id || "--"}
                          {t.patient_phone ? (
                            <div className="text-xs font-normal text-slate-500">{t.patient_phone}</div>
                          ) : null}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {t.title || t.task_title || "Treatment & Tests"}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">{t.priority || "medium"}</td>
                        <td className="p-3">{renderTaskStatusBadge(t.status)}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300">
                          {t.nurse_name || t.nurse_email || t.nurse_id || "--"}
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-w-[360px]">
                          {String(t.nurse_notes || "").trim() || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* MAIN SECTION: Appointments List & Filters */}
        <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">

          {/* Toolbar */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Users className="text-sky-500" size={20} /> Patient Appointments
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Open an appointment to update status, notes, and request lab tests.</p>
              </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search patient, symptoms..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <Filter size={14} className="text-slate-500" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="in-progress">In-Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none text-slate-600 dark:text-slate-300 cursor-pointer"
              />
            </div>
          </div>

          {/* If patient found via search (Legacy Feature Display) */}
          {patient && (
            <div className="mx-5 mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold text-blue-700 dark:text-blue-400">Found Patient:</span>
              <span>ID: <strong>{patient.patient_id}</strong></span>
              <span>Name: <strong>{patient.name}</strong></span>
              <span>Phone: {patient.phone}</span>
              <span>Age: {patient.age}</span>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Patient</th>
                  <th className="p-4 font-semibold">Date & Time</th>
                  <th className="p-4 font-semibold">Symptoms</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">Loading appointments...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-500">No appointments found matching your filters.</td>
                  </tr>
                ) : (
                  filtered.map((appt, i) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                            {appt.patientName ? appt.patientName.charAt(0) : "P"}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{appt.patientName || "Unknown"}</p>
                            <p className="text-xs text-slate-500">{appt.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                        <div className="flex flex-col">
                          <span>{appt.date}</span>
                          <span className="text-xs text-slate-400">{appt.time}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate">
                        {appt.symptoms || "--"}
                      </td>
                      <td className="p-4">
                        {renderStatusBadge(appt.status)}
                      </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => router.push(`/doctor/appointments/${appt.id}`)}
                            className="px-3 py-1.5 text-xs font-semibold text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-400 dark:hover:bg-sky-900/50 rounded-lg transition"
                          >
                            Manage / Lab
                          </button>
                        </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
