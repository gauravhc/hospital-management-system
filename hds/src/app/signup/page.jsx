"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/services/api";
import { FaUser, FaEnvelope, FaLock, FaPhone, FaMapMarkerAlt, FaHeartbeat, FaCalendarAlt, FaVenusMars, FaGlobeAmericas } from "react-icons/fa";
import { MdBloodtype, MdEmergency } from "react-icons/md";
import { BsPersonVcard } from "react-icons/bs";

export default function SignupPage() {
    const router = useRouter();

    /** --------------------- Options --------------------- **/
    const genderOptions = ["Male", "Female", "Other"];
    const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

    // Country Codes (Common ones)
    const countryCodes = ["+91", "+1", "+44", "+971", "+81", "+49", "+33"];

    const indianStates = [
        "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
        "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
        "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
        "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
        "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
        "West Bengal", "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry"
    ];

    const countries = ["India", "USA", "UK", "Canada", "Australia", "UAE", "Germany", "France", "Japan"];

    /** --------------------- Form State --------------------- **/
    const [documentPreview, setDocumentPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const [form, setForm] = useState({
        fullName: "",
        email: "",
        gender: "",
        bloodGroup: "",
        age: "",
        countryCode: "+91",
        phone: "",
        address: "",
        state: "",
        country: "India", // Default
        pincode: "",
        password: "",
        confirmPassword: "",
        documentDataUrl: "",
        documentName: "",
        documentFile: null,
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleDocumentUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file for profile photo.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Image size should be 5MB or less.");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = typeof reader.result === "string" ? reader.result : "";
            setDocumentPreview(dataUrl);
            setForm((prev) => ({ ...prev, documentDataUrl: dataUrl, documentName: file.name, documentFile: file }));
        };
        reader.onerror = () => {
            alert("Failed to read image file.");
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (form.password !== form.confirmPassword) {
            alert("Passwords do not match!");
            setLoading(false);
            return;
        }

        const payload = new FormData();
        payload.append("name", form.fullName);
        payload.append("email", form.email);
        payload.append("password", form.password);
        payload.append("phone", `${form.countryCode} ${form.phone}`);
        if (form.gender) payload.append("gender", form.gender);
        if (form.bloodGroup) payload.append("blood_group", form.bloodGroup);
        if (form.address) payload.append("address", form.address);
        if (form.state) payload.append("state", form.state);
        if (form.country) payload.append("country", form.country);
        if (form.pincode) payload.append("pincode", form.pincode);
        if (form.documentFile) payload.append("profile_image", form.documentFile);

        try {
            const data = await apiPost("/api/patients/register", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            alert(data.message || "Registration Successful! Welcome aboard.");
            router.push("/login");
        } catch (err) {
            const msg = err.message || "Signup failed. Please try again.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    /** ------------------------ UI ------------------------ **/
    return (
        <div className="min-h-screen flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80')] bg-cover bg-center bg-no-repeat py-10 px-4">

            {/* Dark Overlay for contrast */}
            <div className="absolute inset-0 bg-blue-900/40 backdrop-blur-sm z-0"></div>

            <div className="relative z-10 w-full max-w-4xl bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/50 flex flex-col md:flex-row">

                {/* Left Side: Branding / Welcome */}
                <div className="hidden md:flex flex-col justify-center items-center w-1/3 bg-gradient-to-br from-teal-600 to-blue-600 p-8 text-white">
                    <div className="mb-6 bg-white/20 p-4 rounded-full">
                        <FaHeartbeat className="text-6xl animate-pulse" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2 text-center">Join Us</h2>
                    <p className="text-center text-teal-100 mb-6">Start your health journey with the best medical professionals.</p>
                    <div className="text-sm text-teal-200">
                        <ul className="space-y-2">
                            <li className="flex items-center gap-2"><BsPersonVcard /> Secure Records</li>
                            <li className="flex items-center gap-2"><MdEmergency /> 24/7 Support</li>
                            <li className="flex items-center gap-2"><FaUser /> Easy Access</li>
                        </ul>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="w-full md:w-2/3 p-8 md:p-12 overflow-y-auto max-h-[90vh] scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-gray-100">

                    <div className="mb-8">
                        <h1 className="text-3xl font-extrabold text-gray-800">Create Account</h1>
                        <p className="text-gray-500 text-sm mt-1">Please fill in your details to register.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">

                        {/* 1. Identity Section */}
                        <SectionTitle title="Personal Details" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ModernInput
                                label="Full Name"
                                name="fullName"
                                icon={<FaUser />}
                                value={form.fullName}
                                onChange={handleChange}
                                required
                            />
                            <ModernInput
                                label="Email Address"
                                name="email"
                                type="email"
                                icon={<FaEnvelope />}
                                value={form.email}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <ModernSelect
                                label="Gender"
                                name="gender"
                                options={genderOptions}
                                icon={<FaVenusMars />}
                                value={form.gender}
                                onChange={handleChange}
                            />
                            <ModernSelect
                                label="Blood Group"
                                name="bloodGroup"
                                options={bloodGroups}
                                icon={<MdBloodtype />}
                                value={form.bloodGroup}
                                onChange={handleChange}
                            />
                            <ModernInput
                                label="Age"
                                name="age"
                                type="number"
                                icon={<FaCalendarAlt />}
                                value={form.age}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* 2. Contact Section */}
                        <SectionTitle title="Contact Info" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="flex gap-2">
                                <div className="w-1/3">
                                    <ModernSelect
                                        label="Code"
                                        name="countryCode"
                                        options={countryCodes}
                                        value={form.countryCode}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="w-2/3">
                                    <ModernInput
                                        label="Phone Number"
                                        name="phone"
                                        type="tel"
                                        icon={<FaPhone />}
                                        value={form.phone}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>
                            <ModernInput
                                label="Address"
                                name="address"
                                icon={<FaMapMarkerAlt />}
                                value={form.address}
                                onChange={handleChange}
                                placeholder="House No, Street Area"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <ModernSelect
                                label="State"
                                name="state"
                                options={indianStates}
                                value={form.state}
                                onChange={handleChange}
                            />
                            <ModernSelect
                                label="Country"
                                name="country"
                                options={countries}
                                icon={<FaGlobeAmericas />} // Error fix: defined above? No, FaGlobeAmericas import check
                                value={form.country}
                                onChange={handleChange}
                            />
                            <ModernInput
                                label="Pincode"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                            />
                        </div>

                        {/* 3. Security Section */}
                        <SectionTitle title="Security" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <ModernInput
                                label="Password"
                                name="password"
                                type="password"
                                icon={<FaLock />}
                                value={form.password}
                                onChange={handleChange}
                                required
                            />
                            <ModernInput
                                label="Confirm Password"
                                name="confirmPassword"
                                type="password"
                                icon={<FaLock />}
                                value={form.confirmPassword}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        {/* Document Upload (Optional - kept for completeness) */}
                        <div className="mt-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Profile / ID Document
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleDocumentUpload}
                                    className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-teal-50 file:text-teal-700
                                    hover:file:bg-teal-100
                                    cursor-pointer border border-gray-300 rounded-lg p-2
                                    "
                                />
                                {documentPreview && (
                                    <div className="absolute top-0 right-0 mt-[-3rem] mr-2">
                                        <img src={documentPreview} alt="Preview" className="h-10 w-10 rounded-full object-cover border-2 border-white shadow" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all duration-200 flex justify-center items-center gap-2 mt-6"
                        >
                            {loading ? "Creating Account..." : "Register Now"}
                        </button>

                        <p className="text-center text-gray-500 text-sm mt-4">
                            Already have an account? <span onClick={() => router.push('/login')} className="text-teal-600 font-bold cursor-pointer hover:underline">Log in</span>
                        </p>

                    </form>
                </div>
            </div>
        </div>
    );
}

/* ------------------ UI Components ------------------ */

function SectionTitle({ title }) {
    return (
        <div className="flex items-center gap-2 mb-2 mt-4">
            <div className="h-px bg-gray-300 flex-grow"></div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</span>
            <div className="h-px bg-gray-300 flex-grow"></div>
        </div>
    );
}

function ModernInput({ label, name, type = "text", value, onChange, required, icon, placeholder }) {
    return (
        <div className="relative">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1 uppercase">{label} {required && <span className="text-red-500">*</span>}</label>
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    required={required}
                    placeholder={placeholder}
                    className={`w-full ${icon ? "pl-10" : "pl-4"} pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm placeholder-gray-400`}
                />
            </div>
        </div>
    );
}

function ModernSelect({ label, name, options, value, onChange, icon }) {
    return (
        <div className="relative">
            <label className="block text-xs font-bold text-gray-600 mb-1 ml-1 uppercase">{label}</label>
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        {icon}
                    </div>
                )}
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={`w-full ${icon ? "pl-10" : "pl-4"} pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all shadow-sm appearance-none`}
                >
                    <option value="">Select</option>
                    {options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </div>
        </div>
    );
}
