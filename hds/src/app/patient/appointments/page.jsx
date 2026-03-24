"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiGet("/api/patients/appointments");
        setAppointments(Array.isArray(data?.appointments) ? data.appointments : Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        setError(err?.message || "Failed to load appointments.");
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">My Appointments</h1>

      {loading ? <p>Loading...</p> : null}
      {error ? <p className="text-red-600">{error}</p> : null}

      <div className="overflow-x-auto border rounded-xl bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Doctor</th>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Time</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.id}</td>
                <td className="p-2">{a.doctor_name || a.doctorName || a.doctor_id || "--"}</td>
                <td className="p-2">{a.appointment_date || a.date || "--"}</td>
                <td className="p-2">{a.appointment_time || a.time || "--"}</td>
                <td className="p-2">{a.status || "--"}</td>
              </tr>
            ))}
            {!loading && appointments.length === 0 ? (
              <tr>
                <td className="p-3 text-slate-500" colSpan={5}>
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
