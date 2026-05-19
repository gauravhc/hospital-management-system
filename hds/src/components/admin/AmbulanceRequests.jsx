"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/services/api";

const toLower = (v) => String(v || "").toLowerCase();
const safeGetRole = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem("role") || "";
  } catch {
    return "";
  }
};

const AMBULANCE_TYPE_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "advanced", label: "Advanced" },
  { value: "icu", label: "ICU" },
  { value: "oxygen", label: "With Oxygen" },
  { value: "cardiac", label: "With Cardiac" },
];

export default function AmbulanceRequests() {
  const router = useRouter();
  const searchParams = null;
  const [statusFilter, setStatusFilter] = useState("pending");
  const [requests, setRequests] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [error, setError] = useState("");
  const [focusedRequestId, setFocusedRequestId] = useState("");

  const [assignForm, setAssignForm] = useState({
    ambulance_id: "",
    driver_name: "",
    driver_phone: "",
    eta_minutes: "",
  });

  const [creatingAmbulance, setCreatingAmbulance] = useState(false);
  const [newAmbulance, setNewAmbulance] = useState({
    vehicle_no: "",
    type: "basic",
    driver_name: "",
    driver_phone: "",
  });

  const canManage = useMemo(() => {
    const role = toLower(safeGetRole());
    return role === "hospital_admin" || role === "super_admin";
  }, []);

  const load = async () => {
    try {
      setError("");
      setLoading(true);
      const [reqRes, ambRes] = await Promise.all([
        apiGet("/api/ambulance/hospital-requests", { status: statusFilter }),
        apiGet("/api/ambulances/available"),
      ]);

      const reqList = Array.isArray(reqRes?.data)
        ? reqRes.data
        : Array.isArray(reqRes?.requests)
        ? reqRes.requests
        : [];
      const ambList = Array.isArray(ambRes?.data)
        ? ambRes.data
        : Array.isArray(ambRes?.ambulances)
        ? ambRes.ambulances
        : [];

      setRequests(reqList);
      setAmbulances(ambList);
    } catch (e) {
      setError(e?.message || "Failed to load ambulance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canManage) {
      router.push("/login");
      return;
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    const requestId =
      searchParams?.get("request_id") ||
      searchParams?.get("requestId") ||
      "";
    const statusParam = (searchParams?.get("status") || "").trim().toLowerCase();

    if (requestId) setFocusedRequestId(requestId);
    if (statusParam) {
      setStatusFilter((prev) => (prev === statusParam ? prev : statusParam));
    }
  }, [searchParams]);

  const createAmbulance = async () => {
    if (!newAmbulance.vehicle_no.trim()) {
      alert("Vehicle number is required");
      return;
    }

    try {
      setCreatingAmbulance(true);
      await apiPost("/api/ambulances", {
        vehicle_no: newAmbulance.vehicle_no.trim(),
        type: newAmbulance.type || "basic",
        driver_name: newAmbulance.driver_name?.trim() || null,
        driver_phone: newAmbulance.driver_phone?.trim() || null,
        status: "available",
      });
      setNewAmbulance({ vehicle_no: "", type: "basic", driver_name: "", driver_phone: "" });
      await load();
      alert("Ambulance added");
    } catch (e) {
      alert(e?.message || "Failed to add ambulance");
    } finally {
      setCreatingAmbulance(false);
    }
  };

  const assign = async (request) => {
    if (!assignForm.ambulance_id) {
      alert("Select an ambulance");
      return;
    }

    try {
      setAssigningId(request.id);
      await apiPost(`/api/ambulance/assign`, {
        request_id: request.id,
        ambulance_id: assignForm.ambulance_id,
        eta_minutes: assignForm.eta_minutes ? Number(assignForm.eta_minutes) : null,
      });

      setAssignForm({ ambulance_id: "", driver_name: "", driver_phone: "", eta_minutes: "" });
      await load();
      alert("Ambulance assigned");
    } catch (e) {
      alert(e?.message || "Failed to assign ambulance");
    } finally {
      setAssigningId(null);
    }
  };

  const updateStatus = async (requestId, nextStatus) => {
    try {
      await apiPut(`/api/ambulance/update-status`, { request_id: requestId, status: nextStatus });
      await load();
    } catch (e) {
      alert(e?.message || "Failed to update status");
    }
  };

  return (
    <div className="w-full p-6">
      <div className="mb-6 rounded-3xl border border-white/20 bg-white/95 p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900">Ambulance Requests</h2>
            <p className="text-sm text-slate-500">Assign ambulances and track request status.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800"
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="assigned">Assigned</option>
              <option value="enroute">En Route</option>
              <option value="arrived">Arrived</option>
              <option value="completed">Completed</option>
            </select>
            <button
              type="button"
              onClick={load}
              className="rounded-2xl bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-white/20 bg-white/95 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {loading ? "Loading..." : `${requests.length} request(s)`}
          </p>
        </div>

        {ambulances.length === 0 ? (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-bold">No available ambulances found for this hospital.</p>
            <p className="mt-1 text-xs text-amber-700">
              Add at least one ambulance (status: available) to assign requests.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <input
                value={newAmbulance.vehicle_no}
                onChange={(e) => setNewAmbulance((s) => ({ ...s, vehicle_no: e.target.value }))}
                placeholder="Vehicle no (e.g. KA01AB1234)"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold"
              />
              <select
                value={newAmbulance.type}
                onChange={(e) => setNewAmbulance((s) => ({ ...s, type: e.target.value }))}
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold"
              >
                {AMBULANCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                value={newAmbulance.driver_phone}
                onChange={(e) => setNewAmbulance((s) => ({ ...s, driver_phone: e.target.value }))}
                placeholder="Driver phone"
                className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold"
              />
              <button
                type="button"
                disabled={creatingAmbulance}
                onClick={createAmbulance}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {creatingAmbulance ? "Adding..." : "Add Ambulance"}
              </button>
            </div>
          </div>
        ) : null}

        {requests.length === 0 ? (
          <p className="text-sm text-slate-500">No requests found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Patient</th>
                  <th className="py-2">Pickup</th>
                  <th className="py-2">Drop</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-t border-slate-100 ${focusedRequestId && String(r.id) === String(focusedRequestId) ? "bg-amber-50" : ""}`}
                  >
                    <td className="py-3 font-semibold text-slate-900">
                      {r.patient_name || r.patient_id || "--"}
                    </td>
                    <td className="py-3 text-slate-700">{r.pickup_address || "--"}</td>
                    <td className="py-3 text-slate-700">{r.drop_address || "--"}</td>
                    <td className="py-3 text-slate-700">{r.ambulance_type || "--"}</td>
                    <td className="py-3 text-slate-700">{r.contact_phone || r.patient_phone || "--"}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {r.status || "--"}
                      </span>
                    </td>
                    <td className="py-3">
                      {toLower(r.status) === "pending" ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={assignForm.ambulance_id}
                            onChange={(e) => setAssignForm((s) => ({ ...s, ambulance_id: e.target.value }))}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          >
                            <option value="">Select ambulance</option>
                            {ambulances.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.vehicle_no} ({a.type})
                              </option>
                            ))}
                          </select>
                          <input
                            value={assignForm.eta_minutes}
                            onChange={(e) => setAssignForm((s) => ({ ...s, eta_minutes: e.target.value }))}
                            placeholder="ETA (min)"
                            className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold"
                          />
                          <button
                            type="button"
                            disabled={assigningId === r.id}
                            onClick={() => assign(r)}
                            className="rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-[linear-gradient(90deg,#ff3b3b,#ff7a18)] hover:opacity-95 disabled:opacity-60"
                          >
                            {assigningId === r.id ? "Assigning..." : "Assign"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          {(() => {
                            const status = toLower(r.status);
                            if (status === "assigned") {
                              return (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(r.id, "enroute")}
                                  className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-sky-700"
                                >
                                  Start Trip
                                </button>
                              );
                            }

                            if (status === "enroute" || status === "en_route") {
                              return (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(r.id, "arrived")}
                                    className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-700"
                                  >
                                    Mark Arrived
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(r.id, "completed")}
                                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                                  >
                                    Complete
                                  </button>
                                </>
                              );
                            }

                            if (status === "arrived") {
                              return (
                                <button
                                  type="button"
                                  onClick={() => updateStatus(r.id, "completed")}
                                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                                >
                                  Complete
                                </button>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
