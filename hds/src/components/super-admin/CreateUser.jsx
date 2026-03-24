"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, ShieldPlus } from "lucide-react";

import { apiGet, apiPost } from "@/services/api";

const ROLES = [
  { label: "Super Admin", value: "super_admin" },
  { label: "Hospital Admin", value: "hospital_admin" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

export default function SuperAdminCreateUser() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    hospital_id: "",
  });
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const showHospital = useMemo(() => form.role === "hospital_admin", [form.role]);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const response = await apiGet("/api/hospitals");
        setHospitals(response?.hospitals || []);
      } catch (hospitalError) {
        console.error("Failed to load hospitals", hospitalError);
      }
    };

    loadHospitals();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "role" && value === "super_admin" ? { hospital_id: "" } : {}),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword || !form.role) {
      setError("All required fields must be completed.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (showHospital && !form.hospital_id) {
      setError("Please select a hospital.");
      return;
    }

    const endpointByRole = {
      super_admin: "/api/super-admins",
      hospital_admin: "/api/hospital-admins",
    };

    try {
      setLoading(true);
      const endpoint = endpointByRole[form.role];
      const response = await apiPost(endpoint, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        ...(showHospital ? { hospital_id: Number(form.hospital_id) } : {}),
      });

      if (!response.success) {
        throw new Error(response.message || "Failed to create user");
      }

      setSuccess("User created successfully.");
      setForm({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        role: "",
        hospital_id: "",
      });

      setTimeout(() => {
        router.push("/super-admin/users");
      }, 600);
    } catch (submitError) {
      setError(submitError.customMessage || submitError.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-8 text-white shadow-lg shadow-blue-200">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          <ShieldPlus className="text-blue-100" />
          Super Admin Create User
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          Create users directly inside the super admin module without redirecting to hospital admin pages.
        </p>
      </div>

      {success ? (
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-green-700">
          <CheckCircle2 className="mt-0.5" size={20} />
          <div>
            <p className="font-semibold">Success</p>
            <p className="text-sm">{success}</p>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700">
          <AlertCircle className="mt-0.5" size={20} />
          <div>
            <p className="font-semibold">Unable to create user</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={inputClass}
              placeholder="Dr John Doe"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={inputClass}
              placeholder="doctor@hds.com"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className={inputClass}
              placeholder="Enter password"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              className={inputClass}
              placeholder="Re-enter password"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className={inputClass}
              required
            >
              <option value="">Select role</option>
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          {showHospital ? (
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Hospital</label>
              <select
                name="hospital_id"
                value={form.hospital_id}
                onChange={handleChange}
                className={inputClass}
                required
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
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push("/super-admin/users")}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
            {loading ? "Creating..." : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
