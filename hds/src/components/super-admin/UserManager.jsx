"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Loader2, Plus, Power, Search, Shield, Trash2, X } from "lucide-react";

import { apiDelete, apiGet, apiPut } from "@/services/api";

const ROLE_OPTIONS = [
  { label: "All Roles", value: "all" },
  { label: "Super Admin", value: "super_admin" },
  { label: "Hospital Admin", value: "hospital_admin" },
  { label: "Doctor", value: "doctor" },
  { label: "Nurse", value: "nurse" },
  { label: "Lab Technician", value: "labtechnician" },
  { label: "Pharmacist", value: "pharmacist" },
  { label: "Inventory Manager", value: "inventorymanager" },
  { label: "Accountant", value: "accountant" },
  { label: "Receptionist", value: "receptionist" },
  { label: "Patient", value: "patient" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const badgeClass = (status) =>
  String(status || "").toLowerCase() === "active"
    ? "inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
    : "inline-flex rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700";

const formatRole = (value) =>
  String(value || "")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function SuperAdminUserManager() {
  const router = useRouter();
  const searchParams = null;
  const initialRole = (searchParams?.get?.("role") || "all").toLowerCase();
  const hospitalIdParam = searchParams?.get?.("hospital_id") || "";

  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(initialRole);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    hospital_id: "",
    status: "active",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const response = await apiGet("/api/hospitals");
        setHospitals(Array.isArray(response?.hospitals) ? response.hospitals : []);
      } catch (hospitalError) {
        console.error("Failed to load hospitals:", hospitalError);
      }
    };

    loadHospitals();
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (role && role !== "all") params.set("role", role);
      if (hospitalIdParam) params.set("hospital_id", hospitalIdParam);
      if (search.trim()) params.set("q", search.trim());

      const query = params.toString();
      const response = await apiGet(query ? `/api/users?${query}` : "/api/users");
      const list = Array.isArray(response?.users) ? response.users.filter(Boolean) : [];
      setUsers(list);
    } catch (loadError) {
      console.error("Failed to fetch users:", loadError);
      setUsers([]);
      setError(loadError?.customMessage || loadError?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [role, search, hospitalIdParam]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const hospitalMap = useMemo(
    () => new Map(hospitals.map((hospital) => [String(hospital.id), hospital.name])),
    [hospitals]
  );

  const handleRoleFilter = (value) => {
    setRole(value);
    const params = new URLSearchParams();
    if (value && value !== "all") params.set("role", value);
    if (hospitalIdParam) params.set("hospital_id", hospitalIdParam);
    const nextQuery = params.toString() ? `?${params.toString()}` : "";
    router.replace(`/super-admin/users${nextQuery}`);
  };

  const openEditModal = (user) => {
    setError("");
    setEditingUser(user);
    setEditForm({
      name: user?.name || "",
      email: user?.email || "",
      hospital_id: user?.hospital_id ? String(user.hospital_id) : "",
      status: String(user?.status || "active").toLowerCase(),
    });
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setEditForm({
      name: "",
      email: "",
      hospital_id: "",
      status: "active",
    });
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();

    if (!editingUser) return;

    try {
      setSubmitting(true);
      setError("");

      const payload = {
        role: editingUser.role,
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        status: editForm.status,
      };

      if (editingUser.role !== "super_admin") {
        payload.hospital_id = editForm.hospital_id ? Number(editForm.hospital_id) : null;
      }

      const response = await apiPut(`/api/users/${editingUser.id}`, payload);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to update user");
      }

      closeEditModal();
      await loadUsers();
    } catch (submitError) {
      console.error("Failed to update user:", submitError);
      setError(submitError?.customMessage || submitError?.message || "Failed to update user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const nextStatus = String(user.status || "").toLowerCase() === "active" ? "inactive" : "active";

    try {
      const response = await apiPut(`/api/users/${user.id}`, {
        role: user.role,
        status: nextStatus,
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to update user status");
      }

      await loadUsers();
    } catch (statusError) {
      console.error("Failed to toggle status:", statusError);
      setError(statusError?.customMessage || statusError?.message || "Failed to update status.");
    }
  };

  const handleDelete = async (user) => {
    const confirmed = window.confirm(`Delete ${user.name}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      const response = await apiDelete(`/api/users/${user.id}?role=${user.role}`);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to delete user");
      }

      await loadUsers();
    } catch (deleteError) {
      console.error("Failed to delete user:", deleteError);
      setError(deleteError?.customMessage || deleteError?.message || "Failed to delete user.");
    }
  };

  return (
    <div className="min-h-screen space-y-6 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-lg shadow-blue-200">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <Shield className="text-blue-100" />
          Super Admin User Management
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Manage users across hospitals without leaving the super admin module.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or email"
              className={`${inputClass} pl-11`}
            />
          </div>

          <select
            value={role}
            onChange={(event) => handleRoleFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 lg:w-56"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => router.push("/super-admin/users/create")}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <Plus size={18} />
            Add User
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr className="text-left text-sm font-semibold text-slate-700">
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Hospital</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="animate-spin" size={16} />
                      Loading users...
                    </span>
                  </td>
                </tr>
              ) : null}

              {!loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : null}

              {!loading
                ? users.map((user) => (
                    <tr key={`${user.role}-${user.id}`} className="text-sm text-slate-700">
                      <td className="px-6 py-4 font-semibold text-slate-900">{user.name || "--"}</td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-700">
                        {user?.employee_id || user?.patient_id_no || user?.id || "--"}
                      </td>
                      <td className="px-6 py-4">{user.email || "--"}</td>
                      <td className="px-6 py-4">{formatRole(user.role)}</td>
                      <td className="px-6 py-4">
                        {user?.hospital || hospitalMap.get(String(user?.hospital_id || "")) || "--"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={badgeClass(user.status)}>{String(user.status || "active")}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openEditModal(user)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                          >
                            <Edit size={16} />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
                          >
                            <Power size={16} />
                            {String(user.status || "").toLowerCase() === "active" ? "Deactivate" : "Activate"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-700"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Edit User</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Update user details without leaving the super admin module.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
                  <input
                    name="name"
                    value={editForm.name}
                    onChange={handleEditChange}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleEditChange}
                    className={inputClass}
                    required
                  />
                </div>

                {editingUser.role !== "super_admin" ? (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Hospital</label>
                    <select
                      name="hospital_id"
                      value={editForm.hospital_id}
                      onChange={handleEditChange}
                      className={inputClass}
                    >
                      <option value="">Select hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.id} value={hospital.id}>
                          {hospital.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
                  <select
                    name="status"
                    value={editForm.status}
                    onChange={handleEditChange}
                    className={inputClass}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? <Loader2 className="animate-spin" size={16} /> : <Edit size={16} />}
                  {submitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
