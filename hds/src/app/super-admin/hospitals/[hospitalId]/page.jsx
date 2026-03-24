"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Building2,
  CreditCard,
  FlaskConical,
  Headset,
  Pill,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

import apiClient from "@/lib/apiClient";

const MODULES = [
  {
    title: "Hospital Admins",
    subtitle: "Manage admins",
    icon: ShieldCheck,
    role: "hospital_admin",
    gradient: "from-violet-600 via-fuchsia-600 to-pink-600",
  },
  {
    title: "Doctors",
    subtitle: "Manage doctors",
    icon: Stethoscope,
    role: "doctor",
    gradient: "from-sky-600 via-blue-600 to-indigo-600",
  },
  {
    title: "Nurses",
    subtitle: "Manage nurses",
    icon: Syringe,
    role: "nurse",
    gradient: "from-emerald-600 via-teal-600 to-cyan-600",
  },
  {
    title: "Laboratory",
    subtitle: "Manage lab users",
    icon: FlaskConical,
    role: "labtechnician",
    gradient: "from-teal-600 via-cyan-600 to-sky-600",
  },
  {
    title: "Pharmacy",
    subtitle: "Manage pharmacists",
    icon: Pill,
    role: "pharmacist",
    gradient: "from-rose-600 via-pink-600 to-fuchsia-600",
  },
  {
    title: "Inventory",
    subtitle: "Manage inventory staff",
    icon: Boxes,
    role: "inventorymanager",
    gradient: "from-amber-600 via-orange-600 to-rose-600",
  },
  {
    title: "Accounts",
    subtitle: "Manage accountants",
    icon: CreditCard,
    role: "accountant",
    gradient: "from-yellow-600 via-amber-600 to-orange-600",
  },
  {
    title: "Reception",
    subtitle: "Manage reception staff",
    icon: Headset,
    role: "receptionist",
    gradient: "from-indigo-600 via-purple-600 to-violet-600",
  },
];

export default function SuperAdminHospitalModulesPage() {
  const router = useRouter();
  const params = useParams();
  const hospitalId = String(params?.hospitalId || "").trim();

  const [hospital, setHospital] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hospitalId) return;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await apiClient.get(`/api/hospitals/${hospitalId}`);
        const data = res.data?.hospital || res.data?.data || null;
        setHospital(data);
      } catch (err) {
        console.error("Failed to load hospital:", err);
        setHospital(null);
        setError(err?.response?.data?.message || err?.message || "Failed to load hospital.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [hospitalId]);

  const headerTitle = useMemo(() => {
    if (loading) return "Loading hospital…";
    if (!hospital) return "Hospital";
    return hospital.name || "Hospital";
  }, [hospital, loading]);

  return (
    <div className="min-h-screen space-y-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-rose-50 p-4 md:p-6">
      <div className="rounded-3xl border border-white/40 bg-white/80 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-900 text-white shadow-lg">
              <Building2 />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                Hospital Management Modules
              </p>
              <h1 className="mt-1 text-3xl font-extrabold text-slate-900">{headerTitle}</h1>
              {hospital?.address ? (
                <p className="mt-1 text-sm text-slate-600">{hospital.address}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/super-admin")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <button
              type="button"
              onClick={() => router.push(`/super-admin/users?hospital_id=${encodeURIComponent(hospitalId)}`)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:from-indigo-700 hover:to-violet-700"
            >
              <Users size={18} />
              View Users
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const link = `/super-admin/users?role=${encodeURIComponent(module.role)}&hospital_id=${encodeURIComponent(hospitalId)}`;
          return (
            <button
              key={module.title}
              type="button"
              onClick={() => router.push(link)}
              className="group relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-6 text-left shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-[0.08] transition group-hover:opacity-[0.14]`} />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Module
                  </p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-900">{module.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{module.subtitle}</p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${module.gradient} text-white shadow-lg`}>
                  <Icon size={22} />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

