"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Truck } from "lucide-react";
import { apiGet, apiPost } from "@/services/api";

const AMBULANCE_TYPES = ["Private", "108"];

const computeAge = (dob) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const monthDiff = now.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) age -= 1;
  if (age < 0 || age > 130) return null;
  return age;
};

const PatientAmbulancePage = () => {
  const [pickup, setPickup] = useState("");
  const [hospitals, setHospitals] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [type, setType] = useState("Private");
  const [time, setTime] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [latestRequest, setLatestRequest] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const statusLabel = useMemo(() => {
    const s = String(latestRequest?.status || "").toLowerCase();
    if (!s) return "";
    if (s === "pending") return "Pending";
    if (s === "assigned") return "Assigned";
    if (s === "enroute" || s === "en_route") return "En Route";
    if (s === "completed") return "Completed";
    return s;
  }, [latestRequest]);

  const loadLatestRequest = async () => {
    try {
      setLoadingStatus(true);
      const res = await apiGet("/api/ambulance/my-request");
      setLatestRequest(res?.data || null);
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  };

  const loadHospitals = async () => {
    try {
      const res = await apiGet("/api/hospitals/list");
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res?.hospitals) ? res.hospitals : [];
      setHospitals(list);
      if (!hospitalId && list[0]?.id) setHospitalId(list[0].id);
    } catch {
      setHospitals([]);
    }
  };

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      // Use the same profile endpoint used across the patient portal.
      const res = await apiGet("/api/patients/profile");
      setProfile(res?.data || null);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
    loadProfile();
    loadLatestRequest();
    const id = setInterval(loadLatestRequest, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pickup || !hospitalId || !phone) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      await apiPost("/api/ambulance/request", {
        pickup_address: pickup,
        hospital_id: hospitalId,
        ambulance_type: type,
        pickup_time: time || null,
        contact_phone: phone,
      });

      alert("Ambulance requested successfully!");
      await loadLatestRequest();

      setPickup("");
      setPhone("");
      setTime("");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to request ambulance");
    } finally {
      setLoading(false);
    }
  };

  const patientName = String(profile?.name || "").trim();
  const patientAge = computeAge(profile?.dob);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <header className="mb-6">
            <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
              <Truck className="text-red-600" />
              Book Ambulance
            </h2>
            <p className="text-slate-600">
              Request emergency or scheduled transport with live ETA tracking.
            </p>
          </header>

          <section className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Patient Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Patient Name</label>
                  <input
                    value={profileLoading ? "Loading..." : patientName || "--"}
                    readOnly
                    className="p-3 border rounded-xl w-full bg-white text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Age</label>
                  <input
                    value={profileLoading ? "Loading..." : patientAge !== null ? String(patientAge) : "--"}
                    readOnly
                    className="p-3 border rounded-xl w-full bg-white text-slate-800"
                  />
                </div>
              </div>
            </div>

            {latestRequest && (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Latest Ambulance Request
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900">
                      Status:{" "}
                      <span className="text-red-700">
                        {loadingStatus ? "Updating..." : statusLabel || "--"}
                      </span>
                    </p>
                  </div>
                  {latestRequest?.eta_minutes ? (
                    <div className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
                      ETA: {latestRequest.eta_minutes} min
                    </div>
                  ) : null}
                </div>

                {(latestRequest?.driver_name ||
                  latestRequest?.driver_phone ||
                  latestRequest?.ambulance_id) && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-3">
                    <div>
                      <span className="font-semibold">Ambulance:</span>{" "}
                      {latestRequest?.ambulance_id || "--"}
                    </div>
                    <div>
                      <span className="font-semibold">Driver:</span>{" "}
                      {latestRequest?.driver_name || "--"}
                    </div>
                    <div>
                      <span className="font-semibold">Phone:</span>{" "}
                      {latestRequest?.driver_phone || "--"}
                    </div>
                  </div>
                )}

                <div className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold">Type:</span> {latestRequest?.ambulance_type || "--"}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Pickup Address
                  </label>
                  <input
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-red-400 outline-none"
                    placeholder="Enter pickup location"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Drop-Off Hospital
                  </label>
                  <select
                    value={hospitalId}
                    onChange={(e) => setHospitalId(e.target.value)}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-red-400 outline-none bg-white"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}{h.address ? ` - ${h.address}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Ambulance Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-red-400 outline-none"
                  >
                    {AMBULANCE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Pickup Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-red-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Contact Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="p-3 border rounded-xl w-full focus:ring-2 focus:ring-red-400 outline-none"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-7 py-3.5 text-white font-extrabold rounded-full transition-all duration-200 shadow-lg shadow-red-200/70 hover:shadow-xl hover:shadow-orange-200/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed bg-[linear-gradient(90deg,#ff3b3b,#ff7a18)]"
                >
                  {loading ? "Requesting..." : "Request Ambulance"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-8 bg-white p-6 rounded-2xl shadow">
            <h3 className="text-lg font-semibold mb-2">How it works</h3>
            <ul className="text-slate-600 space-y-2 list-disc list-inside">
              <li>Submit your pickup and hospital location.</li>
              <li>Nearest ambulance is assigned automatically.</li>
              <li>Track real-time ETA and driver details.</li>
              <li>Service available 24/7 for emergencies.</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PatientAmbulancePage;
