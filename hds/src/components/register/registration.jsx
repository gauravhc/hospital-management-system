"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

export default function PatientRegistration() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patient_id = searchParams.get("patient_id") || "";
    const [username, setUsername] = useState("");

    const [patientsList, setPatientsList] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);

    const [patient, setPatient] = useState({
        patient_id: "",
        name: "",
        age: "",
        mobile: "",
        user_id: null,
        address: "",
    });

    const [doctors, setDoctors] = useState([]);

    const [appointment, setAppointment] = useState({
        doctor_id: "",
        doctor_name: "",
        department: "",
        date: "",
        time: "",
        payment_status: "pending",
        payment_method: "",
        symptoms: "",
        upi_id: "",
        transaction_id: "",
    });

    useEffect(() => {
        const user = localStorage.getItem("username");
        setUsername(user || "");
    }, []);

    // Fetch Patient if ID present
    useEffect(() => {
        if (!patient_id) return;
        const fetchPatient = async () => {
            try {
                const data = await apiGet(`/api/patients/${patient_id}`);
                if (data.patient) {
                    const p = data.patient;
                    setPatient({
                        patient_id: p.patient_id,
                        user_id: p.user_id || null,
                        name: p.name || "",
                        age: p.age || "", // Simplified age
                        mobile: p.phone || p.mobile || "",
                        address: p.address_line1 || p.address || "",
                    });
                }
            } catch (err) {
                console.log("Patient Load Error:", err);
            }
        };
        fetchPatient();
    }, [patient_id]);

    // Load All Patients for Search
    useEffect(() => {
        const loadPatients = async () => {
            try {
                const data = await apiGet("/api/patients/all");
                if (data && data.patients) {
                    setPatientsList(data.patients);
                }
            } catch (err) {
                console.log("Patient list load error:", err);
            }
        };
        loadPatients();
    }, []);

    useEffect(() => {
        if (!searchQuery || !searchQuery.trim()) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }
        const q = searchQuery.toLowerCase();
        const results = patientsList.filter((p) =>
            (p.patient_id?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q))
        );
        setSearchResults(results.slice(0, 30));
        setShowDropdown(results.length > 0);
    }, [searchQuery, patientsList]);

    const selectPatient = async (p) => {
        try {
            setShowDropdown(false);
            setSearchQuery(`${p.patient_id} — ${p.name}`);
            const data = await apiGet(`/api/patients/${p.patient_id}`);
            if (data && data.patient) {
                setPatient({
                    patient_id: data.patient.patient_id,
                    name: data.patient.name,
                    mobile: data.patient.phone || data.patient.mobile,
                    address: data.patient.address,
                    age: data.patient.age
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Doctors
    useEffect(() => {
        const loadDoctors = async () => {
            try {
                const data = await apiGet("/api/doctors");
                const list = Array.isArray(data) ? data : data.doctors || [];
                setDoctors(list);
            } catch (err) {
                console.log("Doctor Fetch Error:", err);
            }
        };
        loadDoctors();
    }, []);

    const handleAppointmentChange = (e) => {
        const { name, value } = e.target;
        setAppointment((prev) => ({ ...prev, [name]: value }));
    };

    const handleDoctorSelect = (e) => {
        const id = e.target.value;
        const selected = doctors.find((d) => String(d.id) === String(id));
        setAppointment((prev) => ({
            ...prev,
            doctor_id: id,
            doctor_name: selected?.name || "",
            department: selected?.department || "",
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!appointment.doctor_id || !appointment.date || !appointment.time) {
            alert("Please fill all appointment details");
            return;
        }

        try {
            if (patient.patient_id) {
                const payload = {
                    patient_id: patient.patient_id,
                    patient_name: patient.name,
                    doctor_id: appointment.doctor_id,
                    date: appointment.date,
                    time: appointment.time,
                    doctor_name: appointment.doctor_name,
                    symptoms: appointment.symptoms,
                    status: "awaiting_registration",
                };
                const data = await apiPost("/api/register/create-appointment", payload);
                if (!data.success) { alert(data.message || "Error"); return; }
                alert("Appointment Registered!");
                router.push("/register");
                return;
            }

            // No patient -> create both logic (omitted for brevity, assume usually selecting existing or use create page first)
            alert("Please select or create a patient first.");

        } catch (err) {
            console.error(err);
            alert("Server Error");
        }
    };

    const baseInput = "peer block w-full rounded-xl border border-slate-300 bg-transparent px-4 pt-5 pb-2 text-sm outline-none transition focus:border-blue-500 disabled:bg-slate-100";
    const baseLabel = "pointer-events-none absolute left-4 top-3 z-10 origin-[0] -translate-y-1 scale-90 transform text-xs font-medium text-slate-500";

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-6 flex justify-center">
            <form onSubmit={handleSubmit} className="w-full max-w-4xl rounded-3xl bg-white shadow-xl px-6 py-6 md:px-10 md:py-8 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h1 className="text-2xl font-semibold text-slate-800">Create Appointment</h1>
                    <div className="text-xs text-slate-500">Patient ID: {patient.patient_id || "---"}</div>
                </div>

                {/* Search */}
                <div className="relative">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Patient</label>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onFocus={() => setShowDropdown(true)} className="w-full px-4 py-2 border rounded-lg" placeholder="Search Patient..." />
                    {showDropdown && searchResults.length > 0 && (
                        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white shadow-lg">
                            {searchResults.map(p => (
                                <li key={p.patient_id} onMouseDown={() => selectPatient(p)} className="px-3 py-2 hover:bg-slate-100 cursor-pointer">{p.name} ({p.patient_id})</li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Patient Details Readonly */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <input type="text" value={patient.name} disabled className="border p-2 rounded w-full" placeholder="Name" />
                    <input type="text" value={patient.mobile} disabled className="border p-2 rounded w-full" placeholder="Mobile" />
                </div>

                <hr />

                {/* Appointment Form */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <select name="doctor_id" value={appointment.doctor_id} onChange={handleDoctorSelect} className="border p-2 rounded w-full"><option value="">Select Doctor</option>{doctors.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                    <input type="date" name="date" value={appointment.date} onChange={handleAppointmentChange} className="border p-2 rounded w-full" />
                    <input type="time" name="time" value={appointment.time} onChange={handleAppointmentChange} className="border p-2 rounded w-full" />
                </div>
                <textarea name="symptoms" value={appointment.symptoms} onChange={handleAppointmentChange} className="w-full border p-2 rounded" placeholder="Symptoms"></textarea>

                <button type="submit" className="w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700">Register</button>
            </form>
        </div>
    );
}
