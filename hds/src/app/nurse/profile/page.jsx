"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/services/api";
import { API_BASE_URL as backendBase } from "@/lib/apiBaseUrl";

function resolveImageUrl(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("/")) return `${backendBase}${raw}`;
  if (raw.startsWith("uploads/")) return `${backendBase}/${raw}`;
  return `${backendBase}/uploads/profile_images/${raw}`;
}

export default function NurseProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "nurse") {
      router.push("/login");
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await apiGet("/api/nurse/profile");
        setProfile(res?.data || null);
      } catch (e) {
        setError(e?.message || "Failed to load profile.");
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  const name = profile?.full_name || profile?.name || profile?.email || "Nurse";
  const imageUrl = useMemo(() => resolveImageUrl(profile?.profile_image), [profile?.profile_image]);

  return (
    <div className="bg-white/90 border rounded-2xl p-8 shadow">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
          <p className="mt-1 text-sm text-slate-600">View your account details.</p>
        </div>
        <Link href="/nurse" className="text-sm font-semibold text-sky-700 hover:underline">
          Back to dashboard
        </Link>
      </div>

      {loading ? <p className="mt-6 text-slate-600">Loading...</p> : null}
      {error ? <p className="mt-6 text-rose-600">{error}</p> : null}

      {!loading && !error && profile ? (
        <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="w-24 h-24 rounded-full bg-sky-600 flex items-center justify-center text-white text-3xl font-extrabold overflow-hidden shrink-0">
            {imageUrl && !imgFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setImgFailed(true)}
              />
            ) : (
              <span>{String(name || "N").charAt(0)}</span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Full name</p>
              <p className="mt-1 font-bold text-slate-900">{name}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Email</p>
              <p className="mt-1 font-semibold text-slate-800">{profile?.email || "--"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Hospital ID</p>
              <p className="mt-1 font-mono text-sm text-slate-800">{profile?.hospital_id || "--"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Nurse ID</p>
              <p className="mt-1 font-mono text-sm text-slate-800">{profile?.id || "--"}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
