"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Users } from "lucide-react";

import { apiGet } from "@/services/api";

function normalizeDate(dateValue) {
  if (!dateValue) return "";
  const raw = String(dateValue).trim();
  if (!raw) return "";
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

function normalizeTime(timeValue) {
  if (!timeValue) return "";
  const raw = String(timeValue).trim();
  if (!raw) return "";
  return raw.length >= 5 ? raw.slice(0, 5) : raw;
}

function compareAppt(a, b) {
  const ad = normalizeDate(a?.appointment_date || a?.date);
  const at = normalizeTime(a?.appointment_time || a?.time);
  const bd = normalizeDate(b?.appointment_date || b?.date);
  const bt = normalizeTime(b?.appointment_time || b?.time);
  const aKey = `${ad}T${at || "00:00"}`;
  const bKey = `${bd}T${bt || "00:00"}`;
  if (aKey === bKey) return 0;
  return aKey > bKey ? 1 : -1;
}

export default function DoctorPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadPatients = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");
        const role = localStorage.getItem("role");
        const rawUser = localStorage.getItem("user");
        const parsedUser = rawUser ? JSON.parse(rawUser) : null;
        const doctorUserId = String(parsedUser?.id || localStorage.getItem("id") || "").trim();

        if (!token || role !== "doctor") {
          router.push("/login");
          return;
        }

        const apptRes = await apiGet("/api/appointments", { role: "doctor", userId: doctorUserId });
        const appts = Array.isArray(apptRes?.appointments)
          ? apptRes.appointments
          : Array.isArray(apptRes?.data)
          ? apptRes.data
          : [];

        const grouped = new Map();
        for (const appt of appts) {
          const patientId = appt?.patient_id || appt?.patientId || appt?.patient || null;
          if (!patientId) continue;
          const key = String(patientId);
          const current = grouped.get(key) || [];
          current.push(appt);
          grouped.set(key, current);
        }

        const patientIds = Array.from(grouped.keys());
        if (patientIds.length === 0) {
          setPatients([]);
          setFiltered([]);
          return;
        }

        const patientRows = patientIds.map((pid) => {
          const list = grouped.get(String(pid)) || [];
          const sorted = [...list].sort(compareAppt);
          const last = sorted[sorted.length - 1] || null;

          const name = last?.patientName || last?.patient_name || "Unknown";

          return {
            id: String(pid),
            full_name: name,
            email: last?.patient_email || last?.email || "--",
            phone: last?.patient_phone || last?.phone || "--",
            gender: last?.patient_gender || last?.gender || "--",
            blood_group: last?.patient_blood_group || last?.blood_group || "--",
            last_appointment_date: normalizeDate(last?.appointment_date || last?.date) || "",
            last_appointment_time: normalizeTime(last?.appointment_time || last?.time) || "",
            total_appointments: list.length,
          };
        });

        const list = patientRows
          .filter(Boolean)
          .sort((a, b) => {
            const aKey = `${a.last_appointment_date || ""}T${a.last_appointment_time || "00:00"}`;
            const bKey = `${b.last_appointment_date || ""}T${b.last_appointment_time || "00:00"}`;
            if (aKey === bKey) return 0;
            return aKey > bKey ? -1 : 1;
          });

        setPatients(list);
        setFiltered(list);
      } catch (loadError) {
        console.error("DOCTOR PATIENTS PAGE LOAD ERROR:", loadError);
        setError(loadError?.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [router]);

  const handleSearch = (value) => {
    setSearch(value);
    const query = value.trim().toLowerCase();
    if (!query) {
      setFiltered(patients);
      return;
    }

    setFiltered(
      patients.filter((patient) =>
        [patient.full_name, patient.name, patient.email, patient.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(query))
      )
    );
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Users />
          My Patients
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          View patients who have booked appointments with you.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            value={search}
            onChange={(event) => handleSearch(event.target.value)}
            placeholder="Search by patient name, email, or phone"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-semibold text-slate-700">
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Blood Group</th>
                <th className="px-6 py-4">Last Appointment</th>
                <th className="px-6 py-4">Total Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading patients...
                    </span>
                  </td>
                </tr>
              ) : null}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    No patients found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? filtered.map((patient) => (
                    <tr key={patient.id} className="text-sm text-slate-700">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-slate-900">{patient.full_name || "--"}</p>
                        <p className="mt-1 text-xs text-slate-500">{patient.email || "--"}</p>
                      </td>
                      <td className="px-6 py-4">{patient.phone || "--"}</td>
                      <td className="px-6 py-4 capitalize">{patient.gender || "--"}</td>
                      <td className="px-6 py-4">{patient.blood_group || "--"}</td>
                      <td className="px-6 py-4">
                        {patient.last_appointment_date
                          ? `${String(patient.last_appointment_date).split("T")[0]} ${patient.last_appointment_time || ""}`.trim()
                          : "--"}
                      </td>
                      <td className="px-6 py-4">{patient.total_appointments || 0}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
