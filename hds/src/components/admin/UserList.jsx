"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    Search, Filter, MoreVertical, Edit, Trash2,
    Shield, CheckCircle, XCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

const apiLocal = async (url, { method = "GET", body } = {}) => {
    const finalUrl = String(url || "").startsWith("http") ? url : `${API_BASE_URL}${url}`;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers["Content-Type"] = "application/json";

    const res = await fetch(finalUrl, {
        method,
        credentials: "include",
        headers: Object.keys(headers).length ? headers : undefined,
        body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.success === false) {
        const message = json?.message || `Request failed (${res.status})`;
        throw new Error(message);
    }
    return json;
};

const hospitalRoles = [
    "All",
    "Doctor",
    "Nurse",
    "Pharmacist",
    "LabTechnician",
    "Receptionist",
    "Admin",
    "InventoryManager",
    "Accountant"
];

export default function UserList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialRole = searchParams.get("role") || "All";

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedRole, setSelectedRole] = useState(initialRole);

    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: "", email: "", phone: "" });
    const [savingEdit, setSavingEdit] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            // In a real app, use debouncing for search
            const queryParams = new URLSearchParams();
            if (selectedRole !== "All") queryParams.append("role", selectedRole);
            if (search) queryParams.append("q", search);

            const res = await apiLocal(`/api/admin/users?${queryParams.toString()}`);
            if (res.success) {
                setUsers(res.users);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    }, [selectedRole, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const overrideRoleFilter = (role) => {
        setSelectedRole(role);
        router.replace(`/admin/users?role=${role}`);
    };

    const actorRole = String(typeof window !== "undefined" ? localStorage.getItem("role") : "")
        .toLowerCase()
        .trim();

    const canManageRow = (user) => {
        const targetRole = String(user?.role || "").toLowerCase().trim();
        if (actorRole !== "hospital_admin" && actorRole !== "super_admin") return false;
        if (actorRole === "hospital_admin" && (targetRole === "super_admin" || targetRole === "hospital_admin")) {
            return false;
        }
        return true;
    };

    const openEdit = (user) => {
        if (!canManageRow(user)) return;
        const name = user?.name || user?.full_name || "";
        const email = user?.email || "";
        const phone = user?.mobile || user?.phone || "";
        setEditingUser(user);
        setEditForm({ name, email, phone });
    };

    const saveEdit = async () => {
        if (!editingUser?.id) return;
        if (!editForm.name.trim() || !editForm.email.trim()) {
            alert("Name and email are required");
            return;
        }

        try {
            setSavingEdit(true);
            const res = await apiLocal(`/api/admin/users/${editingUser.id}`, {
                method: "PUT",
                body: {
                role: editingUser.role,
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                phone: editForm.phone.trim(),
                },
            });

            if (!res?.success) {
                alert(res?.message || "Failed to update user");
                return;
            }

            setEditingUser(null);
            await fetchUsers();
        } catch (error) {
            alert(error?.message || "Failed to update user");
        } finally {
            setSavingEdit(false);
        }
    };

    const deleteUser = async (user) => {
        if (!canManageRow(user)) return;
        const name = user?.name || user?.full_name || user?.email || "this user";
        const ok = window.confirm(`Delete ${name}?`);
        if (!ok) return;

        try {
            setDeletingId(user.id);
            const role = encodeURIComponent(String(user.role || ""));
            await apiLocal(`/api/admin/users/${user.id}?role=${role}`, { method: "DELETE" });
            await fetchUsers();
        } catch (error) {
            alert(error?.message || "Failed to delete user");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-lg font-extrabold text-gray-900">Edit User</h3>
                                <p className="text-sm text-gray-500">{editingUser?.role}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                                <input
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
                                <input
                                    value={editForm.email}
                                    onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                                <input
                                    value={editForm.phone}
                                    onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={savingEdit}
                                onClick={saveEdit}
                                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                                {savingEdit ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* HEADER & FILTERS */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all"
                        />
                    </div>

                    <div className="hidden md:flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {hospitalRoles.slice(0, 4).map(role => (
                            <button
                                key={role}
                                onClick={() => overrideRoleFilter(role)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${selectedRole === role
                                        ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                                    }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedRole}
                        onChange={(e) => overrideRoleFilter(e.target.value)}
                        className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                        {hospitalRoles.map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-900">User</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">ID</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Role</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Department</th>
                                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-gray-900">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                [...Array(5)].map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4"><div className="h-10 w-10 bg-gray-100 rounded-full inline-block mr-3"></div><div className="h-4 w-24 bg-gray-100 rounded inline-block"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                                        <td className="px-6 py-4"><div className="h-6 w-16 bg-gray-100 rounded-full"></div></td>
                                        <td className="px-6 py-4"></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                users.map((user, index) => (
                                    (() => {
                                        const displayName = user?.name || user?.full_name || "Unknown User";
                                        const initial = displayName?.charAt?.(0) || user?.email?.charAt?.(0) || "?";
                                        const statusValue = String(user?.status || "").toLowerCase();
                                        const isActive = statusValue === "active";
                                        const rowKey = `${String(user?.role || "user").toLowerCase()}-${user?.id ?? "na"}-${user?.email ?? index}`;

                                        return (
                                    <tr key={rowKey} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center font-bold">
                                                    {initial}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-gray-900">{displayName}</div>
                                                    <div className="text-xs text-gray-500">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-mono text-gray-700">
                                                {user?.employee_id || user?.patient_id_no || user?.id || "--"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 font-medium text-gray-700">
                                                <Shield size={14} className="text-gray-400" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {user.department}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                        ${isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}
                      `}>
                                                {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                {isActive ? "Active" : user.status || "Unknown"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEdit(user)}
                                                    disabled={!canManageRow(user)}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteUser(user)}
                                                    disabled={!canManageRow(user) || deletingId === user.id}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                        );
                                    })()
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
