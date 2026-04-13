"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/services/api";

const COUNTRY_CODES = [
    { value: "+91", label: "India (+91)" },
    { value: "+1", label: "USA (+1)" },
    { value: "+44", label: "UK (+44)" },
    { value: "+61", label: "Australia (+61)" },
];

export default function PatientCreatePage() {
    const router = useRouter();
    const [username, setUsername] = useState("");

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        gender: "",
        bloodGroup: "",
        maritalStatus: "",
        dob: "",
        age: "",
        primaryCode: "+91",
        primaryPhone: "",
        altCode: "+91",
        altPhone: "",
        address1: "",
        address2: "",
        state: "",
        country: "India",
        pincode: "",
    });

    useEffect(() => {
        const user = localStorage.getItem("username");
        setUsername(user || "");
    }, []);

    const updateField = (name, value) => {
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleDobChange = (value) => {
        let age = "";
        if (value) {
            const birth = new Date(value);
            const today = new Date();
            let years = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                years--;
            }
            if (!Number.isNaN(years) && years >= 0) age = String(years);
        }
        setForm((prev) => ({ ...prev, dob: value, age }));
    };

    const handleAgeChange = (value) => {
        const sanitized = String(value || "").replace(/[^\d]/g, "").slice(0, 3);
        setForm((prev) => ({ ...prev, age: sanitized }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const requiredFields = ["fullName", "email", "gender", "bloodGroup", "dob", "primaryPhone"];

        for (const key of requiredFields) {
            if (!form[key] || String(form[key]).trim() === "") {
                alert(`Please fill required fields`);
                return;
            }
        }

        try {
            const safe = (value) => {
                if (value === undefined || value === null) return "";
                return String(value).trim();
            };

            const addressParts = [
                safe(form.address1),
                safe(form.address2),
                safe(form.state),
                safe(form.country),
            ].filter(Boolean);

            const payload = {
                name: safe(form.fullName),
                email: safe(form.email).toLowerCase(),
                gender: safe(form.gender),
                blood_group: safe(form.bloodGroup),
                dob: safe(form.dob),
                age: safe(form.age),
                mobile: safe(form.primaryPhone),
                state: safe(form.state),
                country: safe(form.country),
                pincode: safe(form.pincode),
                address: [addressParts.join(", "), safe(form.pincode)].filter(Boolean).join(" - "),
            };

            const data = await apiPost("/api/register/create", payload);

            if (!data.success && !data.patient) {
                alert(data.message || "Error creating patient");
                return;
            }

            const createdPatient = data.patient || data;
            alert(`Patient Created! ID: ${createdPatient.patient_id}`);
            router.push(`/register/registration?patient_id=${createdPatient.patient_id}`);
        } catch (err) {
            console.error(err);
            alert(err?.message || "Server error");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex justify-center">
            <div className="w-full max-w-5xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">New Patient Registration</h1>
                        <p className="text-slate-500 mt-1">Capture demographic details.</p>
                    </div>
                    {/* Username handled in layout */}
                </div>

                <form onSubmit={handleSubmit} className="bg-white shadow-xl rounded-3xl px-8 py-8 space-y-10">
                    <section>
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Personal Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <input type="text" placeholder="Full Name *" value={form.fullName} onChange={e => updateField("fullName", e.target.value)} className="border p-2 rounded w-full" />
                            <input type="email" placeholder="Email *" value={form.email} onChange={e => updateField("email", e.target.value)} className="border p-2 rounded w-full" />
                            <select value={form.gender} onChange={e => updateField("gender", e.target.value)} className="border p-2 rounded w-full">
                                <option value="">Gender *</option><option value="Male">Male</option><option value="Female">Female</option>
                            </select>
                            <select value={form.bloodGroup} onChange={e => updateField("bloodGroup", e.target.value)} className="border p-2 rounded w-full">
                                <option value="">Blood Group *</option><option>O+</option><option>A+</option><option>B+</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={form.dob} onChange={e => handleDobChange(e.target.value)} className="border p-2 rounded w-full" />
                                <input type="number" min="0" max="150" value={form.age} onChange={e => handleAgeChange(e.target.value)} placeholder="Age" className="border p-2 rounded w-full" />
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-slate-800 mb-4">Contact Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex gap-2">
                                <select value={form.primaryCode} onChange={e => updateField("primaryCode", e.target.value)} className="border p-2 rounded"><option value="+91">+91</option></select>
                                <input type="tel" placeholder="Phone *" value={form.primaryPhone} onChange={e => updateField("primaryPhone", e.target.value)} className="border p-2 rounded flex-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                            <input type="text" placeholder="State" value={form.state} onChange={e => updateField("state", e.target.value)} className="border p-2 rounded" />
                            <input type="text" placeholder="Country" value={form.country} onChange={e => updateField("country", e.target.value)} className="border p-2 rounded" />
                            <input type="text" placeholder="Pincode" value={form.pincode} onChange={e => updateField("pincode", e.target.value)} className="border p-2 rounded" />
                        </div>
                        <textarea placeholder="Address Line 1" value={form.address1} onChange={e => updateField("address1", e.target.value)} className="border p-2 rounded w-full mt-4" />
                    </section>

                    <div className="flex justify-end">
                        <button type="submit" className="px-10 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700">Create Patient</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
