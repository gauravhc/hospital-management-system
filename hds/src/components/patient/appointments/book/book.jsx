"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";
import { useRouter } from "next/navigation";
import { Datepicker } from "flowbite-react";

export default function BookPage() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use apiClient with base URL from env

  useEffect(() => {
    async function loadDoctors() {
      try {
        const data = await apiGet(`/api/doctors`);
        setDoctors(data || []);
      } catch (err) {
        console.error("Error loading doctors:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDoctors();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 p-8">

      {/* HEADER */}
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold bg-gradient-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent drop-shadow-md">
          Book Appointment
        </h1>
        <p className="text-slate-600 mt-1 text-lg">
          Choose your doctor and pick an available date
        </p>
      </div>

      {/* DOCTOR GRID */}
      {loading ? (
        <p className="text-slate-500">Loading doctors...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {doctors.map((d) => (
            <div
              key={d.id}
              className="
                bg-white/70 backdrop-blur-xl 
                shadow-lg border border-sky-100 rounded-2xl p-6 
                hover:shadow-2xl hover:-translate-y-1 
                transition-all duration-300 cursor-pointer
              "
              onClick={() => router.push(`/patient/appointments/book/${d.id}`)}
            >
              {/* Doctor Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {d.name?.charAt(0)?.toUpperCase() || "D"}
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {d.name || d.username}
                  </h2>
                  <p className="text-indigo-600 font-medium">
                    {d.department || "General Medicine"}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-indigo-300 to-transparent my-4" />

              {/* CTA Button */}
              <button
                className="
                  w-full py-2 mt-2 
                  bg-gradient-to-r from-indigo-500 to-sky-500 
                  text-white font-semibold rounded-lg
                  hover:from-sky-500 hover:to-indigo-500 
                  transition-all duration-300 shadow-md
                "
              >
                View Available Dates →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
