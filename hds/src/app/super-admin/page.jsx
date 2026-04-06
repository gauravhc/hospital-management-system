"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ hospitals: 0, admins: 0, staff: 0 });
  const [hospitals, setHospitals] = useState([]);
  const [superAdmins, setSuperAdmins] = useState([]);
  const [currentSuperAdmin, setCurrentSuperAdmin] = useState(null);
  const [showHospitalModal, setShowHospitalModal] = useState(false);
  const [showSuperAdminModal, setShowSuperAdminModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingHospitalId, setEditingHospitalId] = useState(null);
  const [editingSuperAdminId, setEditingSuperAdminId] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const isFetchingRef = useRef(false);

  const [newHospital, setNewHospital] = useState({
    name: "",
    address: "",
    gst_number: "",
    certification: "",
    phone: "",
    email: "",
    password: "",
  });
  const [newSuperAdmin, setNewSuperAdmin] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const fetchData = async () => {
    if (isFetchingRef.current) return;
    try {
      isFetchingRef.current = true;
      const [statRes, hospRes, saRes] = await Promise.all([
        apiClient.get(`/api/dashboard/stats?t=${Date.now()}`),
        apiClient.get(`/api/hospitals`),
        apiClient.get(`/api/super-admins?t=${Date.now()}`),
      ]);

      setStats(statRes.data || { hospitals: 0, admins: 0, staff: 0 });
      setHospitals(Array.isArray(hospRes.data?.hospitals) ? hospRes.data.hospitals : []);
      const superAdminPayload = saRes.data;
      const superAdminRows = Array.isArray(superAdminPayload)
        ? superAdminPayload
        : Array.isArray(superAdminPayload?.data)
          ? superAdminPayload.data
          : Array.isArray(superAdminPayload?.admins)
            ? superAdminPayload.admins
            : [];
      setSuperAdmins(superAdminRows);
      setLastSyncedAt(new Date());
    } catch (err) {
      console.error("Error loading super admin dashboard:", err);
    } finally {
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    }, 5000);

    const onFocus = () => fetchData();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchData();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed) return;
      const role = String(parsed.role || "").toLowerCase();
      if (role === "super_admin" || role === "superadmin" || role === "super-admin") {
        setCurrentSuperAdmin({
          id: parsed.id || "current-session",
          name: parsed.full_name || parsed.name || "Super Admin",
          email: parsed.email || "-",
        });
      }
    } catch (err) {
      console.error("Failed to parse current super admin details:", err);
    }
  }, []);

  const displaySuperAdmins =
    currentSuperAdmin && !superAdmins.some((a) => String(a.email || "").toLowerCase() === String(currentSuperAdmin.email || "").toLowerCase())
      ? [currentSuperAdmin, ...superAdmins]
      : superAdmins;

  const derivedStats = useMemo(() => {
    const keys = new Set();
    for (const h of hospitals) {
      const key =
        h?.hospital_id !== null && h?.hospital_id !== undefined
          ? `id:${h.hospital_id}`
          : `name:${String(h?.hospital_name || h?.name || "").trim().toLowerCase()}`;
      if (key !== "name:") keys.add(key);
    }
    return {
      hospitals: keys.size,
      admins: hospitals.length,
      superAdmins: displaySuperAdmins.length,
      staff: Number(stats?.staff || 0),
    };
  }, [displaySuperAdmins.length, hospitals, stats]);

  const openCreateHospital = () => {
    setFormError("");
    setEditingHospitalId(null);
    setNewHospital({
      name: "",
      address: "",
      gst_number: "",
      certification: "",
      phone: "",
      email: "",
      password: "",
    });
    setShowHospitalModal(true);
  };

  const openCreateSuperAdmin = () => {
    setFormError("");
    setEditingSuperAdminId(null);
    setNewSuperAdmin({ name: "", email: "", password: "", confirmPassword: "" });
    setShowSuperAdminModal(true);
  };

  const addHospital = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = {
      name: newHospital.name.trim(),
      address: newHospital.address.trim(),
      gst_number: newHospital.gst_number.trim(),
      certification: newHospital.certification.trim(),
      phone: newHospital.phone.trim(),
      email: newHospital.email.trim(),
      password: newHospital.password,
    };
    const missingHospitalFields = [
      payload.name,
      payload.address,
      payload.gst_number,
      payload.certification,
      payload.phone,
    ].some((value) => !value);
    if (
      missingHospitalFields ||
      (!editingHospitalId && (!payload.email || !payload.password))
    ) {
      setFormError(
        editingHospitalId
          ? "All fields are required."
          : "All fields are required."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingHospitalId) {
        await apiClient.put(`/api/hospitals/${editingHospitalId}`, payload);
      } else {
        await apiClient.post(`/api/hospitals`, payload);
      }
      setShowHospitalModal(false);
      setEditingHospitalId(null);
      setNewHospital({
        name: "",
        address: "",
        gst_number: "",
        certification: "",
        phone: "",
        email: "",
        password: "",
      });
      await fetchData();
    } catch (err) {
      setFormError(err?.message || "Failed to save hospital.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addSuperAdmin = async (e) => {
    e.preventDefault();
    setFormError("");
    const isEditingSuperAdmin = Boolean(editingSuperAdminId);
    const payload = {
      name: newSuperAdmin.name.trim(),
      email: newSuperAdmin.email.trim(),
      ...(isEditingSuperAdmin ? {} : { password: newSuperAdmin.password }),
    };

    if (!payload.name || !payload.email) {
      setFormError(isEditingSuperAdmin ? "Name and email are required." : "Name, email and password are required.");
      return;
    }
    if (!isEditingSuperAdmin && !newSuperAdmin.password) {
      setFormError("Name, email and password are required.");
      return;
    }
    if (!isEditingSuperAdmin && newSuperAdmin.password !== newSuperAdmin.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (isEditingSuperAdmin) {
        await apiClient.put(`/api/super-admins/${editingSuperAdminId}`, payload);
      } else {
        await apiClient.post("/api/super-admins", payload);
      }
      setShowSuperAdminModal(false);
      setEditingSuperAdminId(null);
      setNewSuperAdmin({ name: "", email: "", password: "", confirmPassword: "" });
      await fetchData();
    } catch (err) {
      setFormError(err?.message || (isEditingSuperAdmin ? "Failed to update super admin." : "Failed to create super admin."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteSuperAdmin = async (id) => {
    if (!confirm("Delete this super admin?")) return;
    try {
      await apiClient.delete(`/api/super-admins/${id}`);
      await fetchData();
    } catch (err) {
      alert(err?.message || "Failed to delete super admin.");
    }
  };

  const deleteHospital = async (id) => {
    if (!confirm("Delete this hospital?")) return;
    try {
      await apiClient.delete(`/api/hospitals/${id}`);
      await fetchData();
    } catch (err) {
      alert(err?.message || "Failed to delete hospital.");
    }
  };

  return (
    <div className="space-y-6 min-h-screen p-4 md:p-6 bg-gradient-to-br from-sky-50 via-cyan-50 to-indigo-100">
      <div className="bg-gradient-to-r from-slate-900 via-cyan-900 to-indigo-900 text-white rounded-2xl p-6 shadow-xl border border-white/15">
        <h1 className="text-3xl font-bold">Super Admin Control Center</h1>
        <p className="opacity-90">Create hospitals and super admins, then open a hospital to manage its modules.</p>
        <p className="mt-2 text-xs opacity-75">
          Live sync {lastSyncedAt ? `at ${lastSyncedAt.toLocaleTimeString()}` : "pending..."}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-sky-600 to-cyan-600 opacity-[0.10] transition group-hover:opacity-[0.16]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Action</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Add Hospital</h2>
              <p className="mt-1 text-sm text-slate-600">Create a hospital, then open it to manage modules.</p>
              <p className="mt-4 text-sm font-semibold text-indigo-700">Total hospitals: {derivedStats.hospitals}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-600 text-white shadow-lg">
              <Building2 size={22} />
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">Opens the “Add Hospital” form</span>
            <button
              type="button"
              onClick={openCreateHospital}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#4f46e5,#06b6d4)] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-cyan-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 active:translate-y-0"
            >
              <Building2 size={18} />
              Add Hospital
            </button>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600 via-violet-600 to-indigo-600 opacity-[0.10] transition group-hover:opacity-[0.16]" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Quick Action</p>
              <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Create Super Admin</h2>
              <p className="mt-1 text-sm text-slate-600">Add a super admin for platform-level access.</p>
              <p className="mt-4 text-sm font-semibold text-fuchsia-700">Total super admins: {derivedStats.superAdmins}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-indigo-600 text-white shadow-lg">
              <UserPlus size={22} />
            </div>
          </div>
          <div className="relative mt-6 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-500">Opens the “Create Super Admin” form</span>
            <button
              type="button"
              onClick={openCreateSuperAdmin}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(90deg,#d946ef,#4f46e5)] px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-fuchsia-200/50 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70 active:translate-y-0"
            >
              <UserPlus size={18} />
              Create Super Admin
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-6 border border-white/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Hospitals</h2>
            <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Sparkles size={14} />
              Click a hospital to open modules
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-gray-700">
                <tr>
                  <th className="p-3 text-left">Hospital</th>
                  <th className="p-3 text-left">Address</th>
                  <th className="p-3 text-left">GST Number</th>
                  <th className="p-3 text-left">Certification</th>
                  <th className="p-3 text-left">Phone</th>
                  <th className="p-3 text-left w-28">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white/95">
                {hospitals.length === 0 ? (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={6}>
                      No hospitals found.
                    </td>
                  </tr>
                ) : hospitals.map((h, idx) => (
                  <tr
                    key={`hospital-${h?.id ?? "na"}-${idx}`}
                    onClick={() => {
                      const id = h?.id ?? h?.hospital_id;
                      if (!id) return;
                      router.push(`/super-admin/hospitals/${id}`);
                    }}
                    className="border-t cursor-pointer hover:bg-slate-50"
                  >
                    <td className="p-3">{h.name || "-"}</td>
                    <td className="p-3">{h.address || "-"}</td>
                    <td className="p-3 break-all">{h.gst_number || "-"}</td>
                    <td className="p-3 break-all">{h.certification || "-"}</td>
                    <td className="p-3">{h.phone || "-"}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormError("");
                            setEditingHospitalId(h?.id ?? h?.hospital_id);
                            setNewHospital({
                              name: h.name || "",
                              address: h.address || "",
                              gst_number: h.gst_number || "",
                              certification: h.certification || "",
                              phone: h.phone || "",
                              email: "",
                              password: "",
                            });
                            setShowHospitalModal(true);
                          }}
                          className="text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHospital(h?.id ?? h?.hospital_id);
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-md shadow-xl rounded-2xl p-6 border border-white/60">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Super Admins</h2>
            <span className="text-xs font-semibold text-slate-500">Use “Create Super Admin” above</span>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[620px] text-sm">
              <thead className="bg-slate-50 text-gray-700">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Email</th>
                  <th className="p-3 text-left w-28">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {displaySuperAdmins.length === 0 ? (
                  <tr className="border-t">
                    <td className="p-4 text-slate-500" colSpan={3}>
                      No super admins found.
                    </td>
                  </tr>
                ) : displaySuperAdmins.map((a, idx) => {
                  const isSessionOnly = String(a.id) === "current-session";
                  return (
                  <tr key={`superadmin-${a?.id ?? "na"}-${String(a?.email || "").toLowerCase()}-${idx}`} className="border-t">
                    <td className="p-3">
                      {a.name}
                      {currentSuperAdmin && String(a.email || "").toLowerCase() === String(currentSuperAdmin.email || "").toLowerCase() ? (
                        <span className="ml-2 text-xs text-slate-500">(Current)</span>
                      ) : null}
                    </td>
                    <td className="p-3">{a.email}</td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                      {isSessionOnly ? (
                        <span className="text-xs text-slate-500">Session user</span>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setFormError("");
                              setEditingSuperAdminId(a.id);
                              setNewSuperAdmin({
                                name: a.name || "",
                                email: a.email || "",
                                password: "",
                                confirmPassword: "",
                              });
                              setShowSuperAdminModal(true);
                            }}
                            className="text-indigo-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSuperAdmin(a.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </>
                      )}
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800">
              {editingHospitalId ? "Edit Hospital" : "Add Hospital"}
            </h3>
            <form onSubmit={addHospital} className="mt-5 space-y-4" autoComplete="off">
              {/* Prevent browser autofilling the super-admin login into this modal */}
              <input
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                type="text"
                name="sa_fake_username"
                autoComplete="username"
              />
              <input
                className="hidden"
                aria-hidden="true"
                tabIndex={-1}
                type="password"
                name="sa_fake_password"
                autoComplete="current-password"
              />
              <input
                type="text"
                placeholder="Hospital name"
                value={newHospital.name}
                onChange={(e) => setNewHospital((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_name"
                autoComplete="off"
                required
              />
              <input
                type="text"
                placeholder="Address"
                value={newHospital.address}
                onChange={(e) => setNewHospital((p) => ({ ...p, address: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_address"
                autoComplete="off"
                required
              />
              <input
                type="text"
                placeholder="GST Number"
                value={newHospital.gst_number}
                onChange={(e) => setNewHospital((p) => ({ ...p, gst_number: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_gst_number"
                autoComplete="off"
                required
              />
              <input
                type="text"
                placeholder="Certification"
                value={newHospital.certification}
                onChange={(e) => setNewHospital((p) => ({ ...p, certification: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_certification"
                autoComplete="off"
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={newHospital.phone}
                onChange={(e) => setNewHospital((p) => ({ ...p, phone: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_phone"
                autoComplete="off"
                required
              />
              <input
                type="email"
                placeholder="Hospital Admin Email"
                value={newHospital.email}
                onChange={(e) => setNewHospital((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                name="hospital_admin_email"
                autoComplete="off"
                data-1p-ignore="true"
                data-lpignore="true"
                required
              />
              {!editingHospitalId ? (
                <input
                  type="password"
                  placeholder="Hospital Admin Password"
                  value={newHospital.password}
                  onChange={(e) => setNewHospital((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  name="hospital_admin_password"
                  autoComplete="new-password"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  required
                />
              ) : null}
              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingHospitalId(null);
                    setShowHospitalModal(false);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm"
                >
                  {isSubmitting ? "Saving..." : editingHospitalId ? "Update" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuperAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800">
              {editingSuperAdminId ? "Edit Super Admin" : "Create Super Admin"}
            </h3>
            <form onSubmit={addSuperAdmin} className="mt-5 space-y-4">
              <input
                type="text"
                placeholder="Full name"
                value={newSuperAdmin.name}
                onChange={(e) => setNewSuperAdmin((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="email"
                placeholder="Email"
                value={newSuperAdmin.email}
                onChange={(e) => setNewSuperAdmin((p) => ({ ...p, email: e.target.value }))}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={newSuperAdmin.password}
                onChange={(e) => setNewSuperAdmin((p) => ({ ...p, password: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${editingSuperAdminId ? "hidden" : ""}`}
              />
              <input
                type="password"
                placeholder="Confirm password"
                value={newSuperAdmin.confirmPassword}
                onChange={(e) =>
                  setNewSuperAdmin((p) => ({ ...p, confirmPassword: e.target.value }))
                }
                className={`w-full rounded-lg border px-3 py-2 text-sm ${editingSuperAdminId ? "hidden" : ""}`}
              />
              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingSuperAdminId(null);
                    setShowSuperAdminModal(false);
                  }}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-purple-600 text-white px-4 py-2 text-sm"
                >
                  {isSubmitting ? (editingSuperAdminId ? "Updating..." : "Creating...") : (editingSuperAdminId ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
