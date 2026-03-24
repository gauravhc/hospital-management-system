"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";

function AppointmentDetails({ params }) {
  const router = useRouter();
  const { id } = params;

  const [details, setDetails] = useState(null);
  const [error, setError] = useState("");

  const [nurses, setNurses] = useState([]);
  const [selectedNurse, setSelectedNurse] = useState("");

  // Nurse Task Updates (Vitals etc)
  const [nurseUpdates, setNurseUpdates] = useState([]);

  // Doctor Instructions for Nurse
  const [nurseTask, setNurseTask] = useState("");

  // Lab Test
  const [testNotes, setTestNotes] = useState("");
  const [selectedTests, setSelectedTests] = useState([]);
  const [labTests, setLabTests] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetchDetails(token);
    fetchNurses(token);
    fetchNurseUpdates(token, id);
    fetchLabTests(token, id);
  }, [router, id]);

  // ----------------------------------------------------------
  // FETCH APPOINTMENT DETAILS
  // ----------------------------------------------------------
  const fetchDetails = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setDetails(data.data);
        setNurseTask(data.data.nurseTask || "");
      } else {
        setError(data.message || "Error fetching details");
      }
    } catch (err) {
      console.error(err);
      setError("Server error fetching details");
    }
  };

  // ----------------------------------------------------------
  // FETCH NURSE LIST
  // ----------------------------------------------------------
  const fetchNurses = async (token) => {
    try {
      const res = await fetch(`${API_URL}/api/hr/nurses-list`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      setNurses(data.nurses || []);
    } catch (err) {
      console.error("Nurse Fetch Error:", err);
    }
  };

  // ----------------------------------------------------------
  // FETCH NURSE UPDATES (Vitals from nurse)
  // ----------------------------------------------------------
  const fetchNurseUpdates = async (token, appointmentId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/doctors/nurse-updates/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (res.ok) {
        setNurseUpdates(data.data || []);
      } else {
        setNurseUpdates([]);
      }
    } catch (err) {
      console.error("Fetch nurse updates error:", err);
      setNurseUpdates([]);
    }
  };

  // ----------------------------------------------------------
  // ASSIGN NURSE + CREATE NURSE TASK
  // ----------------------------------------------------------
  const assignNurse = async () => {
    if (!selectedNurse) return alert("Please select a nurse");

    const token = localStorage.getItem("token");

    const payload = {
      appointment_id: Number(id),
      doctor_id: details?.doctor_id,
      nurse_id: selectedNurse,
      patient_id: details?.patient_id,
      task_title: "Nurse Task",
      description: nurseTask,
    };

    try {
      const res = await fetch(`${API_URL}/api/doctors/assign-task`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Nurse assigned & task saved!");
        fetchDetails(token);
        fetchNurseUpdates(token, id);
      } else {
        alert(data.message || "Failed to assign nurse");
      }
    } catch (err) {
      console.error("Assign nurse error:", err);
      alert("Server error assigning task");
    }
  };

  // ----------------------------------------------------------
  // REQUEST LAB TEST
  // ----------------------------------------------------------
  const requestLabTest = async () => {
    if (!selectedTests || selectedTests.length === 0) {
      alert("Please select at least one test");
      return;
    }

    const token = localStorage.getItem("token");

    try {
      const res = await fetch(
        `${API_URL}/api/appointments/request-lab-test/${id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tests: selectedTests,
            notes: testNotes,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        alert("Lab test requested successfully!");
        // Refresh tests list immediately so the newly requested tests appear
        await fetchLabTests(token, id);
        setSelectedTests([]);
        setTestNotes("");
      } else {
        alert(data.message || "Failed to request lab test");
      }
    } catch (err) {
      console.error("Lab Test Error:", err);
      alert("Server error requesting lab test");
    }
  };

  // ----------------------------------------------------------
  // FETCH LAB TESTS FOR THIS APPOINTMENT
  // ----------------------------------------------------------
  const fetchLabTests = async (token, appointmentId) => {
    try {
      const res = await fetch(
        `${API_URL}/api/lab/appointment/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) setLabTests(data.data || []);
      else setLabTests([]);
    } catch (err) {
      console.error("Fetch lab tests error:", err);
      setLabTests([]);
    }
  };

  const getStatusColor = (status) => {
    if (status === "completed") return "#16a34a"; // green
    if (status === "in-progress") return "#f59e0b"; // amber
    return "#2563eb"; // blue (pending/default)
  };

  // ----------------------------------------------------------
  // ERROR SCREEN
  // ----------------------------------------------------------
  if (error) {
    return (
      <div className="min-h-screen bg-[#eef4ff] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-white border border-red-100 shadow-lg p-6 text-center">
          <p className="text-red-600 font-semibold mb-2">Error</p>
          <p className="text-slate-600 text-sm">{error}</p>
          <button
            onClick={() => router.push("/doctors")}
            className="mt-4 w-full rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium py-2.5 transition"
          >
            ⬅ Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // LOADING SCREEN
  // ----------------------------------------------------------
  if (!details) {
    return (
      <div className="min-h-screen bg-[#eef4ff] flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading appointment details...</p>
      </div>
    );
  }

  // ----------------------------------------------------------
  // MAIN UI
  // ----------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#eef4ff] flex justify-center py-10 px-4">
      <div className="w-full max-w-5xl">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_20px_45px_rgba(15,23,42,0.08)] p-8 space-y-6">

          {/* ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ */}
          {/* HEADER ROW WITH BACK BUTTON + TITLE + STATUS */}
          {/* ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ */}

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

            {/* LEFT SIDE → BACK + TITLE */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/doctors")}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium px-4 py-2 shadow-sm transition"
              >
                ⬅ Back
              </button>

              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  🧾 Appointment Details
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Review patient, doctor, nurse updates and lab workflow in one place.
                </p>
              </div>
            </div>

            {/* RIGHT SIDE → STATUS + COMPLETED BUTTON */}
            <div className="flex flex-col items-start md:items-end gap-2">
              <span
                className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide text-white shadow-sm"
                style={{ backgroundColor: getStatusColor(details.status) }}
              >
                {details.status || "pending"}
              </span>

              {details.status !== "completed" && (
                <MarkCompletedButton
                  appointmentId={id}
                  onDone={() => {
                    const token = localStorage.getItem("token");
                    fetchDetails(token);
                  }}
                />
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------- */}
          {/* Other components follow here — PATIENT INFO, SYMPTOMS,
              NURSE UPDATES, ASSIGN NURSE, LAB REQUESTS ... */}
          {/* ---------------------------------------------------------- */}

          {/* Patient & Doctor Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
                👤 Patient Information
              </h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><span className="font-medium text-slate-500">ID: </span>{details.patient_id}</p>
                <p><span className="font-medium text-slate-500">Name: </span>{details.patientName}</p>
              </div>
            </div>

            <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
                👨‍⚕️ Doctor Information
              </h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><span className="font-medium text-slate-500">ID: </span>{details.doctor_id}</p>
                <p><span className="font-medium text-slate-500">Name: </span>{details.doctorName}</p>
              </div>
            </div>
          </div>

          {/* Symptoms + Schedule */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
                🩺 Symptoms
              </h3>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 min-h-[72px]">
                {details.symptoms || "No symptoms recorded."}
              </div>
            </div>

            <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-2">
                📅 Appointment Schedule
              </h3>
              <div className="space-y-1 text-sm text-slate-700">
                <p><span className="font-medium text-slate-500">Date: </span>{details.date}</p>
                <p><span className="font-medium text-slate-500">Time: </span>{details.time}</p>
              </div>
            </div>
          </div>

          {/* Nurse Updated Vitals */}
          <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              🩺 Nurse Updated Vitals
            </h3>

            {nurseUpdates.length === 0 ? (
              <p className="text-sm text-slate-500">No updates from nurse yet.</p>
            ) : (
              <div className="relative pl-4">
                <div className="absolute left-1 top-1 bottom-1 w-px bg-slate-200" />

                <div className="space-y-4">
                  {nurseUpdates.map((u, idx) => (
                    <div key={u.task_id || idx} className="relative">
                      <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-blue-500 shadow-sm" />

                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                        <p className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                          📝 {u.task_title || "Nurse Task"}
                        </p>

                        <textarea
                          value={u.updated_value || "No comments entered"}
                          readOnly
                          className="w-full text-xs text-slate-700 border border-slate-200 rounded-lg bg-slate-50 p-2 resize-none min-h-[70px] outline-none"
                        />

                        <p className="mt-1 text-[11px] text-slate-500">
                          <span className="font-semibold">Status:</span> {u.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assign Nurse */}
          <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              🧑‍⚕️ Assign Nurse
            </h3>

            <div className="space-y-3">
              <select
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                value={selectedNurse}
                onChange={(e) => setSelectedNurse(e.target.value)}
              >
                <option value="">Select Nurse</option>
                {nurses.map((n) => (
                  <option key={n.employee_id} value={n.employee_id}>
                    {n.name} ({n.employee_id})
                  </option>
                ))}
              </select>

              <textarea
                value={nurseTask}
                onChange={(e) => setNurseTask(e.target.value)}
                placeholder="Write instructions..."
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[90px]"
              />

              <button
                onClick={assignNurse}
                className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold py-2.5 shadow-sm"
              >
                Assign Nurse & Save Task
              </button>
            </div>
          </div>

          {/* Request Lab Test */}
          <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-3">
              🧪 Request Lab Test
            </h3>

            <div className="space-y-3">
              <select
                multiple
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                value={selectedTests}
                onChange={(e) => {
                  const values = Array.from(e.target.selectedOptions).map((o) => o.value);
                  setSelectedTests(values);
                }}
              >
                <option value="CBC">CBC</option>
                <option value="Blood Sugar">Blood Sugar</option>
                <option value="KFT">KFT</option>
                <option value="LFT">LFT</option>
                <option value="X-Ray Chest">X-Ray Chest</option>
                <option value="ECG">ECG</option>
                <option value="Urine Test">Urine Test</option>
                <option value="Thyroid Profile">Thyroid Profile</option>
              </select>

              <textarea
                placeholder="Notes for lab (optional)"
                value={testNotes}
                onChange={(e) => setTestNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm min-h-[80px]"
              />

              <button
                onClick={requestLabTest}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 shadow-sm"
              >
                Request Lab Test
              </button>
            </div>
          </div>

          {/* Lab Test List */}
          <div className="bg-[#f8fbff] border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              🧬 Lab Tests for this Appointment
            </h3>

            {labTests.length === 0 ? (
              <p className="text-sm text-slate-500">No lab tests requested.</p>
            ) : (
              <div className="space-y-3">
                {labTests.map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 text-sm shadow-sm"
                  >
                    <p className="font-semibold">{t.testName}</p>
                    {t.notes && <p className="text-xs mt-1">{t.notes}</p>}
                    <p className="text-xs mt-1">
                      <span className="font-semibold">Status:</span> {t.status}
                    </p>

                    {t.result ? (
                      (() => {
                        try {
                          const arr =
                            typeof t.result === "string"
                              ? JSON.parse(t.result)
                              : t.result;

                          if (Array.isArray(arr)) {
                            return (
                              <div className="mt-2 space-y-1">
                                {arr.map((r, i) => (
                                  <a
                                    key={i}
                                    href={`${API_URL}${r}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 underline"
                                  >
                                    Download Report {i + 1}
                                  </a>
                                ))}
                              </div>
                            );
                          }

                          return (
                            <a
                              href={`${API_URL}${t.result}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              Download Report
                            </a>
                          );
                        } catch (err) {
                          return (
                            <a
                              href={`${API_URL}${t.result}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 underline"
                            >
                              Download Report
                            </a>
                          );
                        }
                      })()
                    ) : (
                      <p className="text-xs text-amber-500 mt-1">Pending</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Back Button */}
          <button
            className="w-full mt-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold py-2.5"
            onClick={() => router.push("/doctors")}
          >
            ⬅ Back to Doctor Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------
   MARK COMPLETED BUTTON
----------------------------------------------------------- */
function MarkCompletedButton({ appointmentId, onDone }) {
  const [hover, setHover] = useState(false);

  const handleClick = async () => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Not authenticated");

    try {
      const res = await fetch(
        `${API_URL}/api/doctors/update-status/${appointmentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "completed" }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        alert("Appointment marked as completed!");
        onDone();
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Mark completed error:", err);
      alert("Server error updating status");
    }
  };

  return (
    <button
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={handleClick}
      className={`rounded-xl text-white text-xs font-semibold px-4 py-2.5 transition shadow-sm ${hover ? "bg-green-700" : "bg-green-600"
        }`}
    >
      Mark Appointment Completed
    </button>
  );
}

export default AppointmentDetails;
