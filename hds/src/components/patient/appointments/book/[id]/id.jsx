"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

function formatFriendly(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function BookDoctorPage() {
  const { id } = useParams();
  const router = useRouter();
  // Use apiClient with env base URL

  const [doctor, setDoctor] = useState(null);
  const [date, setDate] = useState(""); // format: YYYY-MM-DD
  const [symptoms, setSymptoms] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDoctor() {
      try {
        const data = await apiGet(`/api/doctors/${id}`);
        setDoctor(data);
      } catch (err) {
        setMessage("Unable to load doctor details. Please try again.");
      }
    }
    if (id) loadDoctor();
  }, [id]);

  const minDateISO = new Date().toISOString().split("T")[0];

  const handleContinue = async () => {
    setMessage("");
    if (!date || !symptoms.trim()) {
      setMessage("Please select a date and enter your symptoms.");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const body = { doctorId: id, date, symptoms };
      const data = await apiPost(`/api/appointments/book`, body, token);
      router.push(`/patient/payment?appointmentId=${data.appointment?.id || data.id}`);
    } catch (err) {
      console.error(err);
      setMessage("Server error while creating appointment.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-6 md:p-10">
      <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent drop-shadow mb-10">
        Book Appointment
      </h1>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Doctor Card */}
        {doctor && (
          <div
            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-white/30
                       flex items-center gap-5 hover:shadow-2xl transition-all duration-300"
          >
            <div
              className="w-16 h-16 rounded-full
                         bg-gradient-to-br from-indigo-500 to-sky-500
                         flex items-center justify-center text-white text-2xl font-bold shadow-lg"
            >
              {doctor.username?.charAt(0)?.toUpperCase() || "D"}
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">{doctor.username}</h2>
              <p className="text-indigo-600 font-medium">{doctor.department}</p>
            </div>
          </div>
        )}

        {/* message */}
        {message && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow">
            {message}
          </div>
        )}

        {/* Booking card */}
        <div className="bg-white/85 p-8 rounded-2xl shadow-xl border border-sky-200">
          {/* Selected date preview (always visible) */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Date</label>

            <div className="flex items-center gap-3">
              {/* friendly pill */}
              <div
                aria-hidden
                className="flex-1 bg-slate-800 text-white rounded-md px-4 py-3 shadow-md flex items-center gap-3"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 opacity-80"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>

                <div className="text-left">
                  <div className="text-sm text-slate-300">Selected</div>
                  <div className="text-base font-medium">
                    {date ? formatFriendly(date) : "No date selected"}
                  </div>
                </div>
              </div>

              {/* small clear button */}
              {date && (
                <button
                  onClick={() => setDate("")}
                  className="ml-2 inline-flex items-center rounded-md border border-slate-200 px-3 py-2 bg-white hover:bg-slate-50 text-sm shadow"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Native date input (big, styled) */}
          <div className="mb-6">
            <input
              type="date"
              className="w-full border rounded-lg px-4 py-3 text-slate-800 bg-white focus:ring-2 focus:ring-indigo-300 outline-none shadow-sm"
              value={date}
              min={minDateISO}
              onChange={(e) => {
                // keep only YYYY-MM-DD
                const val = e.target.value;
                setDate(val);
              }}
              aria-label="Choose appointment date"
            />
            <div className="text-xs text-slate-400 mt-2">
              Past dates disabled — earliest:{" "}
              <span className="font-medium">{formatFriendly(minDateISO)}</span>
            </div>
          </div>

          {/* Symptoms */}
          <label className="block text-sm font-semibold text-slate-700 mb-1">Symptoms</label>
          <textarea
            className="border border-indigo-200 p-3 rounded-xl w-full min-h-[140px] bg-white/80 focus:ring-2 focus:ring-indigo-400 outline-none shadow-sm transition resize-vertical"
            placeholder="Describe your symptoms..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
          />

          {/* Submit */}
          <button
            onClick={handleContinue}
            className="w-full mt-6 py-3 rounded-xl text-white text-lg font-bold
                       bg-gradient-to-r from-indigo-600 to-sky-500 shadow-lg hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-200"
          >
            Continue to Payment →
          </button>
        </div>
      </div>

      {/* small animation CSS */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.45s ease-out; }
      `}</style>
    </div>
  );
}
