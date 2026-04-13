"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  Users,
  FileCheck,
  LogOut,
  Stethoscope,
  Syringe,
  Briefcase,
  Shield,
  Hammer,
  Cpu,
  Utensils,
  Search,
  Download,
  Printer,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, API_URL } from "@/services/api";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import IDCard from "@/components/IDCard";

export default function HRDashboard() {
  const router = useRouter();
  const [portalTitle, setPortalTitle] = useState("Hospital Admin Directory Search");
  const [hospitalBrand, setHospitalBrand] = useState({
    name: "",
    logo: "",
  });
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);

  const isPatientResult = String(searchResult?.entityType || "").toLowerCase() === "patient";

  const fallbackAvatarSrc = (() => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#e5e7eb"/>
        <text x="100" y="104" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#6b7280">
          No Image
        </text>
      </svg>
    `;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  })();

  const resolveImageSrc = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return fallbackAvatarSrc;

    const normalized = raw.replace(/\\/g, "/");
    if (/^https?:\/\//i.test(normalized)) return normalized;

    // If backend already returned a full /uploads path, keep it intact.
    if (normalized.startsWith("/uploads/")) return `${API_URL}${normalized}`;
    if (normalized.startsWith("uploads/")) return `${API_URL}/${normalized}`;

    // Other absolute paths from the backend should be respected.
    if (normalized.startsWith("/")) return `${API_URL}${normalized}`;

    // Common backend upload refs may come as:
    // - "/uploads/profile_images/x.jpg"
    // - "uploads/profile_images/x.jpg"
    // - "profile_images/x.jpg"
    // - "x.jpg" (legacy)
    const cleaned = normalized.replace(/^\/+/, "").replace(/^uploads\//i, "");

    if (/^(profile_images|patients|patient_images|avatars|patient_documents|staff_documents)\//i.test(cleaned)) {
      return `${API_URL}/uploads/${cleaned}`;
    }

    if (!cleaned.includes("/") && /\.[a-z0-9]+$/i.test(cleaned)) {
      return `${API_URL}/uploads/profile_images/${cleaned}`;
    }

    return `${API_URL}/${cleaned}`;
  };

  const normalizeEmployee = (user) => {
    if (!user || typeof user !== "object") return null;
    const firstName = user.first_name || user.firstName || "";
    const lastName = user.last_name || user.lastName || "";
    const name = user.name || `${firstName} ${lastName}`.trim();

    return {
      ...user,
      entityType: user.entityType || "employee",
      name,
      role: user.role || user.designation || user.user_type || "staff",
      employee_id: user.employee_id || user.employeeId || user.id || "",
      mobile: user.mobile || user.phone || "",
      photo: user.photo || user.profile_image_url || user.profile_image || user.avatar_url || "",
    };
  };

  const normalizePatient = (patient) => {
    if (!patient || typeof patient !== "object") return null;
    return {
      ...patient,
      entityType: "patient",
      role: "patient",
      name: patient.name || patient.full_name || patient.fullName || "",
      patient_id: patient.patient_id || patient.patientId || patient.id || "",
      mobile: patient.phone || patient.mobile || "",
      dob: patient.dob || patient.date_of_birth || patient.dateOfBirth || null,
      photo:
        patient.profile_image_url ||
        patient.profileImageUrl ||
        patient.profile_image ||
        patient.avatar_url ||
        patient.photo_url ||
        "",
    };
  };

  const [stats, setStats] = useState({
    total: {},
    present: {},
  });
  const [pendingAmbulanceRequests, setPendingAmbulanceRequests] = useState([]);

  const InfoRow = ({ label, value }) => (
    <div className="flex justify-between border-b border-gray-100 py-2">
      <span className="font-medium text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value || "—"}</span>
    </div>
  );

  useEffect(() => {
    const role = (localStorage.getItem("role") || "").toLowerCase();
    if (role === "super_admin") {
      setPortalTitle("Super Admin Directory Search");
    } else {
      setPortalTitle("Hospital Admin Directory Search");
      loadHospitalBrand();
    }

    fetchDashboardData();
    const intervalId = setInterval(fetchDashboardData, 5000);
    window.addEventListener("focus", fetchDashboardData);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", fetchDashboardData);
    };
  }, []);

  const getInitials = (name) => {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return "H";
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  };

  const loadHospitalBrand = async () => {
    try {
      const rawUser = localStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      const hospitalId = user?.hospital_id;
      const userHospitalName =
        user?.hospital_name || user?.hospital || user?.name || "";

      if (!hospitalId) {
        if (userHospitalName) {
          setHospitalBrand({ name: userHospitalName, logo: "" });
        }
        return;
      }

      const payload = await apiGet("/api/hospitals");
      const hospitals = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.hospitals)
          ? payload.hospitals
          : [];

      const matchedHospital = hospitals.find(
        (item) => String(item?.id) === String(hospitalId)
      );

      setHospitalBrand({
        name:
          matchedHospital?.name ||
          matchedHospital?.hospital_name ||
          userHospitalName ||
          "Hospital",
        logo:
          matchedHospital?.logo ||
          matchedHospital?.hospital_logo ||
          "",
      });
    } catch (error) {
      console.error("Failed to load hospital brand", error);
    }
  };

  // ============================================================
  // FETCH DASHBOARD STATS
  // ============================================================
  const fetchDashboardData = async () => {
    try {
      if (!localStorage.getItem("token")) {
        // Handle redirect if needed
        return;
      }

      const [statsRes, ambulanceRes] = await Promise.all([
        apiGet("/api/admin/dashboard-stats"),
        apiGet("/api/admin/ambulance/requests", { status: "active", limit: 5 }),
      ]);

      const payload = statsRes?.data || statsRes || {};
      const doctors = Number(payload?.doctors || 0);
      const nurses = Number(payload?.nurses || 0);
      const totalStaff = Number(payload?.staff || payload?.users || 0);
      const staffByRole = payload?.staff_by_role || {};

      const lab = Number(staffByRole?.labtechnician || 0);
      const pharmacy = Number(staffByRole?.pharmacist || 0);
      const inventory = Number(staffByRole?.inventorymanager || 0);
      const accounts = Number(staffByRole?.accountant || 0);
      const reception = Number(staffByRole?.receptionist || 0);
      const management = Number(staffByRole?.admin || 0) || Math.max(0, totalStaff - doctors - nurses - lab - pharmacy - inventory - accounts - reception);

      setStats({
        total: {
          doctor: doctors,
          nurse: nurses,
          lab,
          pharmacy,
          inventory,
          accounts,
          "top management": Math.max(0, management),
          "register / front desk": reception,
        },
        present: {
          doctor: doctors,
          nurse: nurses,
          lab,
          pharmacy,
          inventory,
          accounts,
          "top management": Math.max(0, management),
          "register / front desk": reception,
        },
      });

      const activeList = Array.isArray(ambulanceRes?.data)
        ? ambulanceRes.data
        : Array.isArray(ambulanceRes?.requests)
        ? ambulanceRes.requests
        : [];
      setPendingAmbulanceRequests(activeList);
    } catch (err) {
      console.error("Dashboard error", err);
    }
  };

  // ============================================================
  // SEARCH EMPLOYEE
  // ============================================================
  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    setSearchError("");
    setSearchResult(null);

    if (!search.trim()) {
      setSearchError("Please enter a patient ID, employee ID, or name");
      return;
    }

    setLoadingSearch(true);

    try {
      const q = search.trim();
      const isNumeric = /^\d+$/.test(q);

      if (isNumeric) {
        try {
          const patientRes = await apiGet(`/api/patients/${q}`);
          const patient = normalizePatient(patientRes?.data || patientRes?.patient || patientRes);
          if (patient) {
            setSearchResult(patient);
            return;
          }
        } catch (patientErr) {
          // If patient lookup fails, fall back to employee search below.
          if (patientErr?.response?.status && patientErr.response.status !== 404) {
            throw patientErr;
          }
        }
      }

      const data = await apiGet("/api/hr/search", { q });
      const candidate =
        data?.user ||
        (Array.isArray(data?.data) ? data.data[0] : null) ||
        (Array.isArray(data) ? data[0] : null);

      const employee = normalizeEmployee(candidate);
      if (!employee) {
        setSearchError("No matching record found");
        return;
      }

      setSearchResult(employee);
    } catch (err) {
      setSearchError(err?.message || "Server connection failed");
    } finally {
      setLoadingSearch(false);
    }
  };

  // ============================================================
  // LOGOUT
  // ============================================================
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    router.push("/login");
  };

  // ============================================================
  // PRINT ID CARD
  // ============================================================
  const printIDCard = () => {
    const content = document.getElementById("idCard");
    if (!content) return;

    const win = window.open("", "_blank");
    const cloned = content.cloneNode(true);

    win.document.open();
    win.document.write(`
      <html>
        <head>
          <title>Print ID Card</title>
          <style>
            body { 
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: #f3f4f6;
            }
            #print-container { transform: scale(1); }
          </style>
        </head>
        <body><div id="print-container">${cloned.outerHTML}</div></body>
      </html>
    `);
    win.document.close();

    // WAIT FOR IMAGES TO LOAD
    const images = win.document.images;
    let loaded = 0;

    const triggerPrint = () => {
      win.focus();
      win.print();
      win.close();
    };

    if (images.length === 0) {
      triggerPrint();
    } else {
      for (let img of images) {
        img.onload = img.onerror = () => {
          loaded++;
          if (loaded === images.length) triggerPrint();
        };
      }
    }
  };


  // ============================================================
  // PDF DOWNLOAD
  // ============================================================
  const downloadPDF = async () => {
    const card = document.getElementById("idCard");
    if (!card) return;

    try {
      const canvas = await html2canvas(card, {
        scale: 3, // Higher scale for better quality
        useCORS: true,
        backgroundColor: "#ffffff"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      // Center image on PDF
      const imgWidth = 85.6; // Standard card width mm
      const imgHeight = 54; // Standard card height mm (landscape) -> here portrait logic

      // Our card is vertical
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const cardWidthPDF = 90; // mm
      const cardHeightPDF = (canvas.height * cardWidthPDF) / canvas.width;

      const x = (pdfWidth - cardWidthPDF) / 2;

      pdf.addImage(imgData, "PNG", x, 20, cardWidthPDF, cardHeightPDF);
      pdf.save(`${searchResult.username || 'employee'}_id_card.pdf`);
    } catch (err) {
      console.error("PDF generation failed", err);
      alert("Failed to generate PDF. Please try again.");
    }
  };

  // ============================================================
  // 12 DASHBOARD CARDS
  // ============================================================
  const keyMap = {
    doctor: "doctor",
    nurse: "nurse",
    lab: "lab",
    pharmacy: "pharmacy",
    inventory: "inventory",
    accounts: "accounts",
    management: "top management",
    register: "register / front desk",
    "IT & Systems": "it & systems",
    "Security & Transport": "security & transport",
    "Housekeeping & Sanitation": "housekeeping & sanitation",
    Catering: "catering",
  };

  const cards = [
    {
      title: "Doctors",
      statsKey: keyMap.doctor,
      icon: <Stethoscope className="w-10 h-10 text-blue-600" />,
      colorClass: "bg-blue-50 text-blue-900 border-blue-100",
      link: "/admin/users?role=Doctor",
    },
    {
      title: "Nurses",
      statsKey: keyMap.nurse,
      icon: <Syringe className="w-10 h-10 text-green-600" />,
      colorClass: "bg-green-50 text-green-900 border-green-100",
      link: "/admin/users?role=Nurse",
    },
    {
      title: "Laboratory",
      statsKey: keyMap.lab,
      icon: <FileCheck className="w-10 h-10 text-teal-600" />,
      colorClass: "bg-teal-50 text-teal-900 border-teal-100",
      link: "/admin/users?role=LabTechnician",
    },
    {
      title: "Pharmacy",
      statsKey: keyMap.pharmacy,
      icon: <Briefcase className="w-10 h-10 text-pink-600" />,
      colorClass: "bg-pink-50 text-pink-900 border-pink-100",
      link: "/admin/users?role=Pharmacist",
    },
    {
      title: "Inventory",
      statsKey: keyMap.inventory,
      icon: <Boxes className="w-10 h-10 text-orange-600" />,
      colorClass: "bg-orange-50 text-orange-900 border-orange-100",
      link: "/admin/users?role=InventoryManager",
    },
    {
      title: "Accounts",
      statsKey: keyMap.accounts,
      icon: <Building2 className="w-10 h-10 text-yellow-600" />,
      colorClass: "bg-yellow-50 text-yellow-900 border-yellow-100",
      link: "/admin/users?role=Accountant",
    },
    {
      title: "Management",
      statsKey: keyMap.management,
      icon: <Users className="w-10 h-10 text-red-600" />,
      colorClass: "bg-red-50 text-red-900 border-red-100",
      link: "/admin/users?role=hospital_admin",
    },
    {
      title: "Reception",
      statsKey: keyMap.register,
      icon: <Briefcase className="w-10 h-10 text-indigo-600" />,
      colorClass: "bg-indigo-50 text-indigo-900 border-indigo-100",
      link: "/admin/users?role=Receptionist",
    },
  ];

  // ============================================================
  // RENDER UI
  // ============================================================
  return (
    <div className="max-w-7xl mx-auto pb-20">

      {/* SEARCH BAR SECTION */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

        {portalTitle === "Hospital Admin Directory Search" && hospitalBrand.name && (
          <div className="mb-4 flex items-center justify-center gap-3">
            {hospitalBrand.logo ? (
              <img
                src={hospitalBrand.logo}
                alt={`${hospitalBrand.name} logo`}
                className="h-12 w-12 rounded-full object-cover border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center border border-blue-700 shadow-sm">
                {getInitials(hospitalBrand.name)}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-semibold tracking-wide uppercase text-gray-500">
                Hospital
              </p>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {hospitalBrand.name}
              </p>
            </div>
          </div>
        )}

        <h2 className="text-2xl font-bold text-gray-800 mb-2">{portalTitle}</h2>
        <p className="text-gray-500 mb-6 max-w-lg mx-auto">Find and manage employee details, print ID cards, or verify information comfortably.</p>

        <form onSubmit={handleSearch} className="flex justify-center max-w-md mx-auto relative">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name or ID..."
              className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loadingSearch}
            className="absolute right-2 top-2 bottom-2 bg-blue-600 text-white px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-70 transition-colors"
          >
            {loadingSearch ? "..." : "Search"}
          </button>
        </form>

        {searchError && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-500 mt-3 font-medium flex items-center justify-center gap-2"
          >
            <Shield size={16} /> {searchError}
          </motion.p>
        )}
      </section>

      {/* SEARCH RESULT CARD */}
      <AnimatePresence>
        {searchResult && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-10"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="bg-gray-50 px-8 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
                  <Users size={20} className="text-blue-600" /> {isPatientResult ? "Patient Profile" : "Employee Profile"}
                </h3>
                <button
                  onClick={() => { setSearchResult(null); setSearch(""); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              <div className="p-8 grid lg:grid-cols-3 gap-10">
                {/* Visual Identity */}
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-lg border-4 border-white mb-6 bg-gray-200">
                    <img
                      src={resolveImageSrc(searchResult.photo)}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = fallbackAvatarSrc; }}
                    />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">{searchResult.name}</h2>
                  <p className="text-blue-600 font-medium">{isPatientResult ? "patient" : searchResult.role}</p>
                </div>

                {/* Details */}
                <div className="lg:col-span-2 grid md:grid-cols-2 gap-x-12 gap-y-2">
                  <div className="col-span-2 mb-4">
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Personal Information</h4>
                  </div>
                  {isPatientResult ? (
                    <>
                      <InfoRow label="Patient ID" value={searchResult.patient_id} />
                      <InfoRow label="Gender" value={searchResult.gender} />
                      <InfoRow label="Email" value={searchResult.email} />
                      <InfoRow label="Mobile" value={searchResult.mobile} />
                      <InfoRow label="DOB" value={searchResult.dob} />
                      <InfoRow label="Blood Group" value={searchResult.blood_group} />
                      <div className="col-span-2 mt-2">
                        <InfoRow label="Address" value={searchResult.address} />
                      </div>
                    </>
                  ) : (
                    <>
                      <InfoRow label="Employee ID" value={searchResult.employee_id} />
                      <InfoRow label="Department" value={searchResult.department} />
                      <InfoRow label="Email" value={searchResult.email} />
                      <InfoRow label="Mobile" value={searchResult.mobile} />

                      <div className="col-span-2 mt-6 mb-4">
                        <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Financial Details</h4>
                      </div>
                      <InfoRow label="Bank Name" value={searchResult.bank_name} />
                      <InfoRow label="Account Number" value={searchResult.account_number} />
                      <InfoRow label="IFSC Code" value={searchResult.ifsc_code} />
                    </>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              {!isPatientResult && (
                <div className="bg-gray-50 px-8 py-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-6">

                  {/* ID Card Hidden Render */}
                  <div className="hidden">
                    <div id="idCard">
                      <IDCard employee={searchResult} />
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 italic flex-1">
                    * Actions generated here are logged for audit purposes.
                  </p>

                  <div className="flex gap-3">
                    <button
                      onClick={printIDCard}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                      <Printer size={18} /> Print Card
                    </button>
                    <button
                      onClick={downloadPDF}
                      className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                    >
                      <Download size={18} /> Download ID
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* DASHBOARD CARDS GRID */}
      <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Boxes size={20} className="text-blue-600" /> Department Overview
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            onClick={() => router.push(card.link)}
            className={`
              relative cursor-pointer rounded-2xl p-6 border transition-all shadow-sm hover:shadow-lg
              ${card.colorClass} bg-white
            `}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{stats.total?.[card.statsKey] || 0}</p>
                <p className="text-xs opacity-70 font-medium uppercase tracking-wide">Staff</p>
              </div>
            </div>

            <h4 className="text-lg font-bold mb-1">{card.title}</h4>
            <div className="w-full bg-black/5 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-current opacity-50"
                style={{ width: `${Math.min(((stats.present?.[card.statsKey] || 0) / (stats.total?.[card.statsKey] || 1)) * 100, 100)}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs font-medium opacity-80">
              <span>{stats.present?.[card.statsKey] || 0} Present</span>
              <span>{(stats.total?.[card.statsKey] || 0) - (stats.present?.[card.statsKey] || 0)} Absent</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 rounded-3xl border border-white/20 bg-white/95 p-6 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-extrabold text-slate-900">Active Ambulance Requests</h4>
            <p className="text-sm text-slate-500">
              {pendingAmbulanceRequests.length} active request(s)
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/ambulance")}
            className="rounded-2xl px-6 py-3 text-white font-extrabold bg-[linear-gradient(90deg,#ff3b3b,#ff7a18)] hover:opacity-95"
          >
            Manage Ambulance
          </button>
        </div>

        {pendingAmbulanceRequests.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No active requests.</p>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="py-2">Patient</th>
                  <th className="py-2">Pickup</th>
                  <th className="py-2">Drop</th>
                  <th className="py-2">Type</th>
                  <th className="py-2">Phone</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingAmbulanceRequests.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="py-3 font-semibold text-slate-900">{r.patient_name || r.patient_id || "--"}</td>
                    <td className="py-3 text-slate-700">{r.pickup_address || "--"}</td>
                    <td className="py-3 text-slate-700">{r.drop_address || "--"}</td>
                    <td className="py-3 text-slate-700">{r.ambulance_type || "--"}</td>
                    <td className="py-3 text-slate-700">{r.contact_phone || r.patient_phone || "--"}</td>
                    <td className="py-3">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {r.status || "--"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {String(r.status || "").toLowerCase() === "pending" ? (
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/ambulance?request_id=${encodeURIComponent(r.id)}&status=pending`)}
                          className="rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-[linear-gradient(90deg,#ff3b3b,#ff7a18)] hover:opacity-95"
                        >
                          Assign
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => router.push(`/admin/ambulance?request_id=${encodeURIComponent(r.id)}&status=${encodeURIComponent(String(r.status || \"pending\").toLowerCase())}`)}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-extrabold text-white hover:bg-slate-800"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
