"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/services/api";
import { Activity, CheckCircle, ClipboardList, Clock, FileText } from "lucide-react";

const statusOf = (value) => String(value || "").trim().toLowerCase();
const priorityOf = (value) => String(value || "medium").trim().toLowerCase();
const assignedNurseOf = (task) =>
  String(task?.assigned_nurse_id || task?.assignedNurseId || task?.nurse_id || task?.nurseId || "").trim();

const backendBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

function resolveImageUrl(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${backendBase}${raw}`;
  if (raw.startsWith("uploads/")) return `${backendBase}/${raw}`;
  return `${backendBase}/uploads/profile_images/${raw}`;
}

const statusPill = (status) => {
  const s = statusOf(status);
  if (s === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle size={12} className="mr-1" /> Completed
      </span>
    );
  }
  if (s === "accepted") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
        <CheckCircle size={12} className="mr-1" /> Accepted
      </span>
    );
  }
  if (s === "in_progress") {
    return (
      <span className="inline-flex items-center rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
        <Activity size={12} className="mr-1" /> In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <Clock size={12} className="mr-1" /> Pending
    </span>
  );
};

const priorityBadgeClass = (priority) => {
  const p = priorityOf(priority);
  if (p === "high") return "bg-rose-100 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300";
  if (p === "low") return "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300";
  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
};

export default function NurseDashboard() {
  const router = useRouter();

  const [isDark, setIsDark] = useState(false);
  const [greeting, setGreeting] = useState("Welcome");
  const [profileLoading, setProfileLoading] = useState(true);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [error, setError] = useState("");

  const [username, setUsername] = useState("Nurse");
  const [nurseId, setNurseId] = useState("");
  const [hospitalLabel, setHospitalLabel] = useState("");
  const [avatar, setAvatar] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);

  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [search, setSearch] = useState("");

  const [vitalsLoading, setVitalsLoading] = useState(false);
  const [vitalsHistory, setVitalsHistory] = useState([]);

  const [bp, setBp] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [temperature, setTemperature] = useState("");
  const [spo2, setSpo2] = useState("");
  const [weight, setWeight] = useState("");
  const [savingVitals, setSavingVitals] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const userId = localStorage.getItem("id");
    if (userId) setNurseId(String(userId));
    if (!token || role !== "nurse") {
      router.push("/login");
      return;
    }

    const hr = new Date().getHours();
    setGreeting(hr < 12 ? "Good Morning" : hr < 17 ? "Good Afternoon" : "Good Evening");

    const stored = localStorage.getItem("theme_mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(stored === "dark" || (!stored && prefersDark));

    loadProfile();
    loadTasks();

    const onFocus = () => loadTasks();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(loadTasks, 15_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(id);
  }, [toast]);

  const showToast = (type, message) => setToast({ type, message });

  const loadProfile = async () => {
    setProfileLoading(true);
    try {
      const res = await apiGet("/api/nurse/profile");
      const profile = res?.data || null;
      const resolvedId = profile?.id || profile?.user_id || profile?.userId || localStorage.getItem("id") || "";
      if (resolvedId) setNurseId(String(resolvedId));

      const hospitalId = profile?.hospital_id || profile?.hospitalId || profile?.hospital?.id || localStorage.getItem("hospital_id") || "";
      if (hospitalId) {
        try {
          const hospitalRes = await apiGet("/api/hospitals/list");
          const list = Array.isArray(hospitalRes?.data)
            ? hospitalRes.data
            : Array.isArray(hospitalRes?.hospitals)
            ? hospitalRes.hospitals
            : [];
          const match = list.find((h) => String(h?.id) === String(hospitalId));
          if (match?.name) {
            const label = `${match.name}${match.address ? ` - ${match.address}` : ""}`.trim();
            if (label) setHospitalLabel(label);
          }
        } catch {
          // ignore
        }
      }

      const name = profile?.full_name || profile?.name || profile?.email || "";
      setUsername(name || "Nurse");
      setAvatar(profile?.profile_image || profile?.profile_image_url || "");
      setAvatarFailed(false);
    } catch {
      const fallback = localStorage.getItem("username");
      setUsername(fallback || "Nurse");
      setAvatar("");
      setAvatarFailed(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadTasks = async () => {
    setTasksLoading(true);
    setError("");
    try {
      const res = await apiGet("/api/nurse/tasks");
      const list = Array.isArray(res?.data) ? res.data : [];
      setTasks(list);
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return tasks;
    return (tasks || []).filter((t) => {
      const testsLabel = Array.isArray(t?.tests) ? t.tests.join(" ") : String(t?.tests || "");
      const hay = [
        t.task_title,
        t.title,
        t.treatment,
        testsLabel,
        t.description,
        t.patient_name,
        t.patient_id,
        t.priority,
        t.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [search, tasks]);

  const avatarUrl = useMemo(() => resolveImageUrl(avatar), [avatar]);

  const totalTasks = tasks.length;
  const pendingCount = tasks.filter((t) => statusOf(t.status) === "pending").length;
  const acceptedCount = tasks.filter((t) => statusOf(t.status) === "accepted").length;
  const inProgressCount = tasks.filter((t) => statusOf(t.status) === "in_progress").length;
  const completedCount = tasks.filter((t) => statusOf(t.status) === "completed").length;

  const loadVitals = async (patientId) => {
    if (!patientId) {
      setVitalsHistory([]);
      return;
    }
    setVitalsLoading(true);
    try {
      const res = await apiGet(`/api/nurse/vitals/${patientId}`);
      setVitalsHistory(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setVitalsHistory([]);
    } finally {
      setVitalsLoading(false);
    }
  };

  const openTask = (task) => {
    setSelectedTask(task);
    setBp("");
    setHeartRate("");
    setTemperature("");
    setSpo2("");
    setWeight("");
    loadVitals(task?.patient_id);
  };

  const updateTaskStatus = async (task, action) => {
    const id = task?.id;
    if (!id) return;

    try {
      if (action === "accept") {
        await apiPut(`/api/tasks/${id}/accept`);
        showToast("success", "Task accepted");
      } else if (action === "start") {
        await apiPut(`/api/tasks/${id}/start`);
        showToast("success", "Task started");
      } else if (action === "complete") {
        await apiPut(`/api/tasks/${id}/complete`);
        showToast("success", "Task completed");
      }
      await loadTasks();
    } catch (e) {
      showToast("error", e?.message || "Failed to update task");
    }
  };

  const submitVitals = async () => {
    if (!selectedTask?.patient_id) {
      showToast("error", "Task has no patient linked");
      return;
    }

    if (!bp.trim() && !heartRate.trim() && !temperature.trim() && !spo2.trim() && !weight.trim()) {
      showToast("error", "Enter at least one vitals value");
      return;
    }

    const payload = {
      patient_id: selectedTask.patient_id,
      blood_pressure: bp.trim() || null,
      heart_rate: heartRate ? Number(heartRate) : null,
      temperature: temperature ? Number(temperature) : null,
      spo2: spo2 ? Number(spo2) : null,
      weight: weight ? Number(weight) : null,
    };

    setSavingVitals(true);
    try {
      await apiPost("/api/nurse/vitals", payload);
      showToast("success", "Vitals recorded");
      setBp("");
      setHeartRate("");
      setTemperature("");
      setSpo2("");
      setWeight("");
      await loadVitals(selectedTask.patient_id);
    } catch (e) {
      showToast("error", e?.message || "Failed to record vitals");
    } finally {
      setSavingVitals(false);
    }
  };

  return (
    <div className={`${isDark ? "dark" : ""}`}>
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 sm:p-8">
        {toast ? (
          <div className="fixed right-5 top-5 z-[9999]">
            <div
              className={`rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl border ${
                toast.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : "bg-rose-50 text-rose-800 border-rose-200"
              }`}
            >
              {toast.message}
            </div>
          </div>
        ) : null}

        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-sky-600 flex items-center justify-center text-white text-xl font-bold shadow-md overflow-hidden">
                {avatarUrl && !avatarFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                ) : (
                  <span>{String(username || "N").charAt(0)}</span>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Nurse Dashboard</p>
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {greeting}, {profileLoading ? "..." : username}
                </h2>
                {nurseId ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Nurse ID: <span className="font-mono">{nurseId}</span>
                  </p>
                ) : null}
                {hospitalLabel ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
                    Hospital: <span className="font-semibold">{hospitalLabel}</span>
                  </p>
                ) : null}
              </div>
            </div>

            <div className="w-full sm:w-[420px] flex gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks..."
                className="flex-1 px-4 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <Link
                href="/nurse/profile"
                className="shrink-0 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-sky-700"
              >
                Profile
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5 mb-8">
            <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                <ClipboardList className="text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Total Tasks</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{totalTasks}</p>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Pending</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{pendingCount}</p>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                <Activity className="text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">In Progress</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{inProgressCount}</p>
              </div>
            </div>
            <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <CheckCircle className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Completed</p>
                <p className="text-xl font-extrabold text-slate-800 dark:text-white">{completedCount}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="col-span-1 lg:col-span-7">
              <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <ClipboardList className="text-sky-500" size={20} />
                    Tasks
                  </h3>
                  <button
                    type="button"
                    onClick={loadTasks}
                    disabled={tasksLoading}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-60"
                  >
                    Refresh
                  </button>
                </div>

                {tasksLoading ? (
                  <div className="text-sm text-slate-500 dark:text-slate-400">Loading tasks...</div>
                ) : error ? (
                  <div className="text-sm text-rose-600">{error}</div>
                ) : (
                  <div className="space-y-3 max-h-[560px] overflow-y-auto pr-2">
                    {filtered.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => openTask(task)}
                        className={`p-4 rounded-2xl border cursor-pointer transition shadow-sm hover:shadow-lg hover:-translate-y-0.5 ${
                          selectedTask?.id === task.id
                            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                              {task.task_title || task.title || "Task"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
                              {task.patient_name || "Patient"} {task.patient_id ? `• ${task.patient_id}` : ""}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${priorityBadgeClass(
                                  task.priority
                                )}`}
                              >
                                {priorityOf(task.priority)}
                              </span>
                              {statusPill(task.status)}
                            </div>
                          </div>

	                          <div className="flex flex-col gap-2">
	                            {(() => {
	                              const assignedTo = assignedNurseOf(task);
	                              const myId = String(nurseId || "").trim();
	                              const isMine = assignedTo && myId && assignedTo === myId;
	                              const isTaken = assignedTo && myId && assignedTo !== myId;
	                              const s = statusOf(task.status);

	                              if (s === "pending") {
	                                if (isTaken) {
	                                  return (
	                                    <button
	                                      type="button"
	                                      disabled
	                                      className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-200 cursor-not-allowed"
	                                    >
	                                      Taken
	                                    </button>
	                                  );
	                                }
	                                return (
	                                  <button
	                                    type="button"
	                                    onClick={(e) => {
	                                      e.stopPropagation();
	                                      updateTaskStatus(task, "accept");
	                                    }}
	                                    className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-sky-700"
	                                  >
	                                    Accept
	                                  </button>
	                                );
	                              }

	                              if (s === "accepted") {
	                                if (!isMine) {
	                                  return (
	                                    <button
	                                      type="button"
	                                      disabled
	                                      className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-200 cursor-not-allowed"
	                                    >
	                                      Taken
	                                    </button>
	                                  );
	                                }
	                                return (
	                                  <button
	                                    type="button"
	                                    onClick={(e) => {
	                                      e.stopPropagation();
	                                      updateTaskStatus(task, "start");
	                                    }}
	                                    className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-sky-700"
	                                  >
	                                    Start
	                                  </button>
	                                );
	                              }

	                              if (s === "in_progress") {
	                                if (isTaken && !isMine) {
	                                  return (
	                                    <button
	                                      type="button"
	                                      disabled
	                                      className="rounded-xl bg-slate-200 px-3 py-1.5 text-xs font-extrabold text-slate-600 dark:bg-slate-700 dark:text-slate-200 cursor-not-allowed"
	                                    >
	                                      Taken
	                                    </button>
	                                  );
	                                }
	                                if (!isMine) return null;
	                                return (
	                                  <button
	                                    type="button"
	                                    onClick={(e) => {
	                                      e.stopPropagation();
	                                      updateTaskStatus(task, "complete");
	                                    }}
	                                    className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-emerald-700"
	                                  >
	                                    Complete
	                                  </button>
	                                );
	                              }

	                              return null;
	                            })()}
	                          </div>
	                        </div>
	                      </div>
	                    ))}
                    {filtered.length === 0 ? (
                      <div className="text-center text-slate-400 text-sm py-10">No tasks found.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 lg:col-span-5">
              <div className="bg-white/95 dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-5 h-full flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                  <FileText className="text-sky-500" size={20} />
                  {selectedTask ? "Task Details" : "Select a Task"}
                </h3>

                {!selectedTask ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm opacity-60">
                    <Activity size={60} strokeWidth={1} className="mb-4" />
                    <p>Select a task from the list</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="space-y-3 mb-6">
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                          <p className="text-slate-500 uppercase">Patient</p>
                          <p className="font-mono text-slate-700 dark:text-slate-300 text-sm">
                            {selectedTask.patient_name || "Patient"}{" "}
                            {selectedTask.patient_id ? `(${selectedTask.patient_id})` : ""}
                          </p>
                          {selectedTask.patient_phone ? (
                            <p className="mt-1 text-[11px] text-slate-500">{selectedTask.patient_phone}</p>
                          ) : null}
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                          <p className="text-slate-500 uppercase">Status</p>
                          <div className="mt-1">{statusPill(selectedTask.status)}</div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Treatment
                        </p>
                        <p className="text-sm text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                          {selectedTask.treatment || "--"}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-700/50">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                          Tests
                        </p>
                        {Array.isArray(selectedTask.tests) && selectedTask.tests.length ? (
                          <ul className="mt-1 list-disc list-inside text-sm text-slate-800 dark:text-slate-100 space-y-1">
                            {selectedTask.tests.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-slate-700 dark:text-slate-100">--</p>
                        )}
                      </div>

                      <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
                        <p className="text-xs font-semibold text-rose-800 dark:text-rose-300 uppercase mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-rose-900 dark:text-rose-100 leading-relaxed whitespace-pre-wrap">
                          {selectedTask.description || "--"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                        Record Patient Vitals
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          placeholder="BP (e.g. 120/80)"
                          value={bp}
                          onChange={(e) => setBp(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                        />
                        <input
                          type="number"
                          placeholder="Heart rate"
                          value={heartRate}
                          onChange={(e) => setHeartRate(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Temperature (°C)"
                          value={temperature}
                          onChange={(e) => setTemperature(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                        />
                        <input
                          type="number"
                          placeholder="SpO2 (%)"
                          value={spo2}
                          onChange={(e) => setSpo2(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                        />
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Weight (kg)"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 transition sm:col-span-2"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={submitVitals}
                        disabled={savingVitals}
                        className="mt-4 w-full py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-lg shadow-sky-200 dark:shadow-sky-900/20 font-extrabold transition disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {savingVitals ? "Saving..." : "Submit Vitals"}
                      </button>

                      <div className="mt-6">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                            Recent vitals
                          </p>
                          {vitalsLoading ? <p className="text-xs text-slate-400">Loading...</p> : null}
                        </div>

                        {vitalsHistory.length ? (
                          <div className="mt-3 space-y-2 max-h-40 overflow-auto pr-1">
                            {vitalsHistory.slice(0, 5).map((v) => (
                              <div
                                key={v.id}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/40 px-3 py-2 text-xs text-slate-700 dark:text-slate-200"
                              >
                                <div className="flex flex-wrap gap-x-3 gap-y-1">
                                  {v.blood_pressure ? <span>BP: {v.blood_pressure}</span> : null}
                                  {v.heart_rate ? <span>HR: {v.heart_rate}</span> : null}
                                  {v.temperature ? <span>Temp: {v.temperature}</span> : null}
                                  {v.spo2 ? <span>SpO2: {v.spo2}</span> : null}
                                  {v.weight ? <span>Wt: {v.weight}</span> : null}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-400">{v.recorded_at || "--"}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3 text-xs text-slate-400">No vitals recorded yet.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
