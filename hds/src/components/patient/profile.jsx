"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Save, Upload } from "lucide-react";

import { apiGet, apiPost, apiPut } from "@/services/api";

import { API_BASE_URL } from "@/lib/apiBaseUrl";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

const sectionClass = "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

export default function PatientProfilePage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    dob: "",
    blood_group: "",
    height: "",
    weight: "",
    address: "",
    profile_image: "",
  });
  const [emergency, setEmergency] = useState({
    contact_name: "",
    relation: "",
    phone: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmergency, setSavingEmergency] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, emergencyRes] = await Promise.all([
          apiGet("/api/patients/profile"),
          apiGet("/api/patient/emergency"),
        ]);

        if (profileRes?.success) {
          setProfile({
            name: profileRes.name || "",
            email: profileRes.email || "",
            phone: profileRes.phone || "",
            gender: profileRes.gender || "",
            dob: profileRes.dob ? String(profileRes.dob).split("T")[0] : "",
            blood_group: profileRes.blood_group || "",
            height: profileRes.height || "",
            weight: profileRes.weight || "",
            address: profileRes.address || "",
            profile_image: profileRes.profile_image || "",
            profile_image_url: profileRes.profile_image_url || "",
          });
        }

        if (emergencyRes?.success) {
          setEmergency({
            contact_name: emergencyRes.contact_name || "",
            relation: emergencyRes.relation || "",
            phone: emergencyRes.phone || "",
          });
        }
      } catch (loadError) {
        console.error("PATIENT PROFILE PAGE LOAD ERROR:", loadError);
        setError(loadError?.message || "Failed to load profile");
      }
    };

    loadProfile();
  }, []);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  };

  const handleEmergencyChange = (event) => {
    const { name, value } = event.target;
    setEmergency((current) => ({ ...current, [name]: value }));
  };

  const submitProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", profile.name || "");
      formData.append("phone", profile.phone || "");
      formData.append("address", profile.address || "");
      formData.append("gender", profile.gender || "");
      formData.append("dob", profile.dob || "");
      formData.append("blood_group", profile.blood_group || "");

      const response = await apiPut("/api/patients/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (!response?.success) {
        throw new Error(response?.message || "Failed to save profile");
      }
      setProfile((current) => ({
        ...current,
        profile_image: response.profile_image || current.profile_image,
        profile_image_url: response.profile_image_url || current.profile_image_url,
      }));
      setMessage("Profile updated successfully.");
    } catch (saveError) {
      setError(saveError?.message || "Failed to save profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const submitEmergency = async (event) => {
    event.preventDefault();
    setSavingEmergency(true);
    setMessage("");
    setError("");

    try {
      const response = await apiPost("/api/patient/emergency", emergency);
      if (!response?.success) {
        throw new Error(response?.message || "Failed to save emergency contact");
      }
      setMessage("Emergency contact updated successfully.");
    } catch (saveError) {
      setError(saveError?.message || "Failed to save emergency contact");
    } finally {
      setSavingEmergency(false);
    }
  };

  const uploadProfileImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("profile_image", file);

      const response = await apiPut("/api/patients/profile", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (!response?.success) {
        throw new Error(response?.message || "Failed to upload profile image");
      }

      setProfile((current) => ({
        ...current,
        profile_image: response.profile_image || current.profile_image,
        profile_image_url: response.profile_image_url || current.profile_image_url,
      }));
      setMessage("Profile image updated successfully.");
    } catch (uploadError) {
      setError(uploadError?.message || "Failed to upload profile image");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-6 bg-slate-50 p-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Patient Profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100">
          View and update your personal information, medical details, emergency contact, and profile image.
        </p>
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
            <div className="flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl bg-slate-100 text-5xl font-bold text-slate-400">
              {profile.profile_image || profile.profile_image_url ? (
                <img
                  src={(() => {
                    const raw = String(profile.profile_image_url || profile.profile_image || "").trim();
                    if (!raw) return "";
                    if (/^https?:\/\//i.test(raw)) return raw;
                    if (raw.startsWith("/uploads/")) return `${API_BASE_URL}${raw}`;
                    if (raw.startsWith("uploads/")) return `${API_BASE_URL}/${raw}`;
                    if (raw.startsWith("profile_images/")) return `${API_BASE_URL}/uploads/${raw}`;
                    return `${API_BASE_URL}/uploads/profile_images/${raw}`;
                  })()}
                  alt="Patient profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                (profile.name || "P").charAt(0).toUpperCase()
              )}
            </div>
            <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              {uploadingImage ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              {uploadingImage ? "Uploading..." : "Change Profile Image"}
              <input type="file" accept="image/*" className="hidden" onChange={uploadProfileImage} />
            </label>
          </div>
        </div>

        <form onSubmit={submitProfile} className={`${sectionClass} xl:col-span-2`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
              <p className="mt-1 text-sm text-slate-500">Manage your contact and medical basics.</p>
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingProfile ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Full Name</label>
              <input name="name" value={profile.name} onChange={handleProfileChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
              <input value={profile.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
              <input name="phone" value={profile.phone} onChange={handleProfileChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Gender</label>
              <select name="gender" value={profile.gender} onChange={handleProfileChange} className={inputClass}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Date of Birth</label>
              <input type="date" name="dob" value={profile.dob} onChange={handleProfileChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Blood Group</label>
              <input name="blood_group" value={profile.blood_group} onChange={handleProfileChange} className={inputClass} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Height</label>
              <input name="height" value={profile.height} onChange={handleProfileChange} className={inputClass} placeholder="170" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Weight</label>
              <input name="weight" value={profile.weight} onChange={handleProfileChange} className={inputClass} placeholder="68" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
              <textarea
                name="address"
                value={profile.address}
                onChange={handleProfileChange}
                rows={4}
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        </form>
      </div>

      <form onSubmit={submitEmergency} className={sectionClass}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Emergency Contact</h2>
            <p className="mt-1 text-sm text-slate-500">Keep your emergency details current for faster support.</p>
          </div>
          <button
            type="submit"
            disabled={savingEmergency}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingEmergency ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
            {savingEmergency ? "Saving..." : "Save Contact"}
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Contact Name</label>
            <input
              name="contact_name"
              value={emergency.contact_name}
              onChange={handleEmergencyChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Relation</label>
            <input
              name="relation"
              value={emergency.relation}
              onChange={handleEmergencyChange}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
            <input name="phone" value={emergency.phone} onChange={handleEmergencyChange} className={inputClass} />
          </div>
        </div>
      </form>
    </div>
  );
}
