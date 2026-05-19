"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Save, User2 } from "lucide-react";

import { apiGet, apiPut } from "@/services/api";
import { emitAuthChange } from "@/lib/authStore";

import { API_BASE_URL } from "@/lib/apiBaseUrl";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const sectionClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

function buildAvatarUrl(raw) {
  if (!raw) return "";
  const value = String(raw).trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/uploads/")) return `${API_BASE_URL}${value}`;
  if (value.startsWith("uploads/")) return `${API_BASE_URL}/${value}`;
  if (value.startsWith("profile_images/")) return `${API_BASE_URL}/uploads/${value}`;
  return `${API_BASE_URL}/uploads/profile_images/${value}`;
}

export default function DoctorProfilePage() {
  const router = useRouter();
  const fileRef = useRef(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    specialization: "",
    department: "",
    dob: "",
    profile_image: "",
    profile_image_url: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userId = useMemo(() => {
    if (typeof window === "undefined") return "";
    try {
      const raw = localStorage.getItem("user");
      const parsed = raw ? JSON.parse(raw) : null;
      return String(parsed?.id || localStorage.getItem("id") || "").trim();
    } catch {
      return String(localStorage.getItem("id") || "").trim();
    }
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await apiGet("/api/doctors/me/profile");
      const data = res?.data || res?.doctor || res?.user || res;
      const dobValue = data?.dob || data?.date_of_birth || data?.dateOfBirth || "";
      setProfile({
        name: data?.name || data?.full_name || data?.fullName || "",
        email: data?.email || "",
        phone: data?.phone || data?.mobile || "",
        gender: data?.gender || "",
        specialization: data?.specialization || "",
        department: data?.department || "",
        dob: dobValue ? String(dobValue).split("T")[0] : "",
        profile_image: data?.profile_image || "",
        profile_image_url: data?.profile_image_url || "",
      });
    } catch (err) {
      setError(err?.message || "Failed to load doctor profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const role = typeof window !== "undefined" ? localStorage.getItem("role") : null;
    if (!token || role !== "doctor") {
      router.push("/login");
      return;
    }
    load();
  }, [router]);

  const onChange = (event) => {
    const { name, value } = event.target;
    setProfile((cur) => ({ ...cur, [name]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: profile.name,
        phone: profile.phone,
        gender: profile.gender,
        specialization: profile.specialization,
        department: profile.department,
        dob: profile.dob,
      };

      const res = await apiPut("/api/doctors/me/profile", payload);
      const data = res?.data || res?.doctor || res?.user || res;

      setProfile((cur) => ({
        ...cur,
        name: data?.name || cur.name,
        phone: data?.phone || cur.phone,
        gender: data?.gender || cur.gender,
        specialization: data?.specialization || cur.specialization,
        department: data?.department || cur.department,
        dob: data?.dob ? String(data.dob).split("T")[0] : cur.dob,
        profile_image: data?.profile_image || cur.profile_image,
        profile_image_url: data?.profile_image_url || cur.profile_image_url,
      }));

      // keep dashboards in sync
      try {
        const raw = localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed) {
          const nextUser = {
            ...parsed,
            name: data?.name || profile.name || parsed.name || null,
            profile_image: data?.profile_image || parsed.profile_image || "",
            profile_image_url: data?.profile_image_url || parsed.profile_image_url || "",
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          if (nextUser.name) localStorage.setItem("username", String(nextUser.name));
          emitAuthChange();
        }
      } catch {
        // ignore
      }

      setMessage("Profile updated.");
    } catch (err) {
      setError(err?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const pickImage = () => {
    setMessage("");
    setError("");
    fileRef.current?.click();
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage("");
    setError("");
    try {
      const formData = new FormData();
      formData.append("profile_image", file);
      const res = await apiPut("/api/doctors/me/profile-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!res?.success) throw new Error(res?.message || "Failed to upload profile image");

      const profileImage = res?.profile_image || "";
      const profileImageUrl = res?.profile_image_url || "";
      setProfile((cur) => ({
        ...cur,
        profile_image: profileImage || cur.profile_image,
        profile_image_url: profileImageUrl || cur.profile_image_url,
      }));

      try {
        const raw = localStorage.getItem("user");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed) {
          const nextUser = {
            ...parsed,
            profile_image: profileImage || parsed.profile_image || "",
            profile_image_url: profileImageUrl || parsed.profile_image_url || "",
          };
          localStorage.setItem("user", JSON.stringify(nextUser));
          emitAuthChange();
        }
      } catch {
        // ignore
      }

      setMessage("Profile image updated.");
    } catch (err) {
      setError(err?.message || "Failed to upload profile image");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const avatarSrc = buildAvatarUrl(profile.profile_image_url || profile.profile_image || "");

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-700 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Doctor Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">View and update your details and profile image.</p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className={`${sectionClass} xl:col-span-1`}>
          <h2 className="text-lg font-bold text-slate-900">Profile Image</h2>
          <div className="mt-6 flex flex-col items-center">
            <div className="relative flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl bg-slate-100 text-5xl font-bold text-slate-400">
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrc} alt="Doctor profile" className="h-full w-full object-cover" />
              ) : (
                <User2 size={44} />
              )}

              <button
                type="button"
                onClick={pickImage}
                disabled={uploading || loading}
                className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900/80 text-white shadow hover:bg-slate-900 disabled:opacity-60"
                title="Change photo"
                aria-label="Change photo"
              >
                {uploading ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={uploadImage} />
            </div>
            <p className="mt-4 text-center text-sm text-slate-600">
              JPG / PNG / WEBP. Recommended square image.
            </p>
          </div>
        </div>

        <form onSubmit={save} className={`${sectionClass} xl:col-span-2`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <p className="mt-1 text-sm text-slate-500">Edit your public doctor details.</p>
            </div>
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <input name="name" value={profile.name} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input value={profile.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
              <input name="phone" value={profile.phone} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
              <select name="gender" value={profile.gender} onChange={onChange} className={inputClass}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Specialization</label>
              <input name="specialization" value={profile.specialization} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Department</label>
              <input name="department" value={profile.department} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
              <input type="date" name="dob" value={profile.dob} onChange={onChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Doctor ID</label>
              <input value={userId || "--"} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
