"use client";
import React, { useState, useRef, useEffect } from "react";
import { hospitalRoles, departments } from "@/data/role";
import { apiPost, apiGet, API_URL } from "@/services/api";
import {
  User, Mail, Phone, Calendar, MapPin, Briefcase,
  CreditCard, Lock, Upload, CheckCircle, AlertCircle,
  Loader2, X, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const INITIAL_FORM = {
  username: "",
  name: "",
  email: "",
  department: "",
  role: "",
  specialization: "", // For sub-roles
  mobile: "",
  alt_mobile: "",
  join_date: "",
  address_line1: "",
  address_line2: "",
  district: "",
  state: "",
  pincode: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  password: "",
  confirm_password: "",
  passbook_file: null,
  government_proof: null,
  photo: null,
};

// Senior Dev Pattern: Customized Input Components for consistency
const FormInput = ({ label, name, type = "text", value, onChange, error, icon: Icon, required, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className="relative group">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
          <Icon size={18} />
        </div>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={`
          w-full pl-${Icon ? '10' : '4'} pr-4 py-2.5 
          bg-gray-50 border rounded-xl text-sm outline-none transition-all duration-200
          ${error
            ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 bg-red-50'
            : 'border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:bg-white hover:border-blue-300'}
        `}
        {...props}
      />
    </div>
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xs text-red-500 font-medium flex items-center gap-1"
      >
        <AlertCircle size={12} /> {error}
      </motion.p>
    )}
  </div>
);

const FileUpload = ({ label, name, onChange, file, error, required }) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    <div className={`
      relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group
      ${error ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'}
    `}>
      <input
        type="file"
        name={name}
        onChange={onChange}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        accept="image/*,.pdf"
      />
      <div className="flex flex-col items-center justify-center gap-2 text-gray-500 group-hover:text-blue-600">
        {file ? (
          <>
            <CheckCircle size={32} className="text-green-500" />
            <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</span>
            <span className="text-xs text-green-600">File attached</span>
          </>
        ) : (
          <>
            <Upload size={24} />
            <span className="text-sm font-medium">Click to upload or drag and drop</span>
            <span className="text-xs text-gray-400">SVG, PNG, JPG or PDF</span>
          </>
        )}
      </div>
    </div>
    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
  </div>
);

export default function CreateUser() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [availableSubRoles, setAvailableSubRoles] = useState([]);

  // Live validation timeouts
  const checkTimeout = useRef(null);

  useEffect(() => {
    if (form.role && hospitalRoles[form.role]) {
      setAvailableSubRoles(hospitalRoles[form.role]);
    } else {
      setAvailableSubRoles([]);
    }
  }, [form.role]);

  const validateField = (name, value, allData = form) => {
    switch (name) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : "Invalid email address";
      case 'mobile':
      case 'alt_mobile':
        return /^\d{10}$/.test(value) ? null : "Must be 10 digits";
      case 'password':
        return value.length >= 6 ? null : "Min 6 chars required";
      case 'confirm_password':
        return value === allData.password ? null : "Passwords do not match";
      default:
        return value ? null : "This field is required";
    }
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (files) {
      setForm(prev => ({ ...prev, [name]: files[0] }));
      setErrors(prev => ({ ...prev, [name]: null }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));

    // Real-time validation clearing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess(false);

    // Validate all required fields
    const newErrors = {};
    const requiredKeys = [
      'username', 'name', 'email', 'department', 'role',
      'mobile', 'password', 'confirm_password', 'photo'
    ];

    requiredKeys.forEach(key => {
      if (!form[key]) newErrors[key] = "Required";
    });

    if (form.password !== form.confirm_password) {
      newErrors.confirm_password = "Passwords mismatch";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
     const payload = {
  name: form.name,                     // ✅ FIXED
  email: form.email,
  password: form.password,
  role: form.role.toLowerCase(),       // ✅ IMPORTANT
  department: form.department,
  specialization: form.specialization || null,
  mobile: form.mobile,
  alt_mobile: form.alt_mobile || null,
  join_date: form.join_date,            // ✅ FIXED
  address_line1: form.address_line1 || null,
  address_line2: form.address_line2 || null,
  district: form.district || null,
  state: form.state || null,
  pincode: form.pincode || null,
  bank_name: form.bank_name || null,
  account_number: form.account_number || null,
  ifsc_code: form.ifsc_code || null,
};


      // Handle "File" objects specifically if needed, but for MOCK DB we skip file uploads for now
      // or convert them to base64 if we really wanted to. 
      // For now, let's just ignore file objects to avoid JSON serialization errors.

      const formData = new FormData();

      // Preserve the existing payload mapping, but send as multipart to support uploads.
      for (const [key, value] of Object.entries(payload)) {
        if (value === undefined || value === null) continue;
        formData.append(key, String(value));
      }

      if (form.username) formData.set("username", form.username);
      if (form.photo) formData.set("photo", form.photo);
      if (form.government_proof) formData.set("government_proof", form.government_proof);
      if (form.passbook_file) formData.set("passbook_file", form.passbook_file);

      const res = await apiPost("/api/admin/create-user", formData, {
        headers: { "Content-Type": undefined },
      });

      if (res.success) {
        setSuccess(true);
        setForm(INITIAL_FORM);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrors({ submit: res.message || "Failed to create user" });
      }
    } catch (err) {
      console.error("Submission Error:", err);
      const errorMsg = err.customMessage || err.message || "An unexpected error occurred.";
      setErrors({ submit: errorMsg });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">

      {/* Header Section */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-blue-200">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserPlusIcon className="text-blue-200" />
          Register New Staff
        </h1>
        <p className="text-blue-100 mt-2 opacity-90">
          Create new access credentials and profiles for hospital staff members.
        </p>
      </div>

      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 p-4 bg-green-50 text-green-700 border border-green-200 rounded-xl flex items-center gap-3 shadow-sm"
          >
            <CheckCircle size={24} />
            <div>
              <p className="font-bold">User Created Successfully!</p>
              <p className="text-sm">The new staff member has been added to the system.</p>
            </div>
            <button onClick={() => setSuccess(false)} className="ml-auto text-green-500 hover:bg-green-100 p-1 rounded-full">
              <X size={18} />
            </button>
          </motion.div>
        )}

        {errors.submit && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl flex items-center gap-3 shadow-sm"
          >
            <AlertCircle size={24} />
            <div>
              <p className="font-bold">Error Creating User</p>
              <p className="text-sm">{errors.submit}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Account Information */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <SectionHeader title="Account Details" icon={Shield} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <FormInput
              label="Username"
              name="username"
              value={form.username}
              onChange={handleChange}
              error={errors.username}
              required
              icon={User}
              placeholder="e.g. dr.smith"
            />
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
              icon={Mail}
              placeholder="john@hospital.com"
            />
            <div className="md:col-span-1 lg:col-span-1"></div> {/* Spacer */}

            <FormInput
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
              icon={Lock}
              placeholder="Min 6 characters"
            />
            <FormInput
              label="Confirm Password"
              name="confirm_password"
              type="password"
              value={form.confirm_password}
              onChange={handleChange}
              error={errors.confirm_password}
              required
              icon={Lock}
              placeholder="Re-enter password"
            />
          </div>
        </section>

        {/* Section 2: Personal & Professional */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <SectionHeader title="Personal Information" icon={Briefcase} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            <FormInput
              label="Full Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
              icon={User}
              placeholder="John Doe"
            />
            <FormInput
              label="Mobile Number"
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              error={errors.mobile}
              required
              icon={Phone}
              placeholder="10 digit number"
            />
            <FormInput
              label="Alt. Mobile"
              name="alt_mobile"
              value={form.alt_mobile}
              onChange={handleChange}
              error={errors.alt_mobile}
              icon={Phone}
              placeholder="Optional"
            />

            <FormInput
              label="Date of Joining"
              name="join_date"
              type="date"
              value={form.join_date}
              onChange={handleChange}
              error={errors.join_date}
              required
              icon={Calendar}
            />

            {/* Role Selection */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm outline-none transition-all
                    ${errors.role ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'}
                  `}
                >
                  <option value="">Select Role</option>
                  {Object.keys(hospitalRoles).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              {errors.role && <p className="text-xs text-red-500">{errors.role}</p>}
            </div>

            {/* Sub-role Selection (Dynamic) */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-semibold text-gray-700">Specialization / Sub-Role</label>
              <div className="relative">
                <select
                  name="specialization"
                  value={form.specialization}
                  onChange={handleChange}
                  disabled={!availableSubRoles.length}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Specialization</option>
                  {availableSubRoles.length > 0 ? (
                    availableSubRoles.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))
                  ) : (
                    <option value="" disabled>Select Role first</option>
                  )}
                </select>
              </div>
            </div>

            {/* Department */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">Department <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <FormInput
              label="Address Line 1"
              name="address_line1"
              value={form.address_line1}
              onChange={handleChange}
              icon={MapPin}
              placeholder="Street Address"
            />
            <FormInput
              label="Address Line 2"
              name="address_line2"
              value={form.address_line2}
              onChange={handleChange}
              icon={MapPin}
              placeholder="Apartment, Studio, or Floor"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
            <FormInput label="District" name="district" value={form.district} onChange={handleChange} />
            <FormInput label="State" name="state" value={form.state} onChange={handleChange} />
            <FormInput label="Pincode" name="pincode" value={form.pincode} onChange={handleChange} />
          </div>
        </section>

        {/* Section 3: Bank Details */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <SectionHeader title="Bank Information" icon={CreditCard} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <FormInput label="Bank Name" name="bank_name" value={form.bank_name} onChange={handleChange} placeholder="Citibank etc." />
            <FormInput label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} placeholder="XXXXXXXXXX" />
            <FormInput label="IFSC Code" name="ifsc_code" value={form.ifsc_code} onChange={handleChange} placeholder="IFSC000123" />
          </div>
        </section>

        {/* Section 4: Documents */}
        <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <SectionHeader title="Documents & Proofs" icon={Upload} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <FileUpload label="Profile Photo" name="photo" onChange={handleChange} file={form.photo} error={errors.photo} required />
            <FileUpload label="Government Proof" name="government_proof" onChange={handleChange} file={form.government_proof} error={errors.government_proof} />
            <FileUpload label="Passbook Copy" name="passbook_file" onChange={handleChange} file={form.passbook_file} error={errors.passbook_file} />
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-6">
          <button
            type="button"
            onClick={() => setForm(INITIAL_FORM)}
            className="px-6 py-3 text-gray-700 font-bold bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Reset Form
          </button>

          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="animate-spin" /> : <CheckCircle size={20} />}
            {loading ? "Creating Profile..." : "Create Employee Profile"}
          </button>
        </div>

      </form>
    </div>
  );
}

// Helper Subcomponent
const SectionHeader = ({ title, icon: Icon }) => (
  <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-2">
    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
      <Icon size={20} />
    </div>
    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
  </div>
);

// Helper Icon
const UserPlusIcon = (props) => (
  <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="8.5" cy="7" r="4"></circle>
    <line x1="20" y1="8" x2="20" y2="14"></line>
    <line x1="23" y1="11" x2="17" y2="11"></line>
  </svg>
);
