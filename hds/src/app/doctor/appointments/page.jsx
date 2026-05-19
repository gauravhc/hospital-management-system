"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/apiClient";
import backendUrl from "@/lib/backendUrl";

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled"];

export default function DoctorAppointmentsPage() {
  const [doctorId, setDoctorId] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.id) setDoctorId(String(parsed.id));
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAppointments = async () => {
    if (!doctorId) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get(backendUrl(`/api/appointments/doctor/${doctorId}`));
      setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
    } catch (err) {
      setError(err?.message || "Failed to fetch appointments.");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      const { data } = await apiClient.put(backendUrl(`/api/appointments/status/${appointmentId}`), { status });
      if (data?.success) {
        setAppointments((prev) =>
          prev.map((a) => (String(a.id) === String(appointmentId) ? { ...a, status } : a))
        );
      }
    } catch (err) {
      setError(err?.message || "Failed to update status.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Doctor Appointments</h1>
      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-3 py-2"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          placeholder="Enter Doctor ID"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={fetchAppointments}>
          Load
        </button>
      </div>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Patient</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.id}</td>
                <td className="p-2">{a.patient_id}</td>
                <td className="p-2">{a.appointment_date}</td>
                <td className="p-2">{a.appointment_time}</td>
                <td className="p-2">{a.status}</td>
                <td className="p-2">
                  <select
                    className="border rounded px-2 py-1"
                    value={a.status}
                    onChange={(e) => updateStatus(a.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
            {!loading && appointments.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan={6}>
                  No appointments found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
