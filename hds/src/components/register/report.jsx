"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/services/api";

export default function ReportPage() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [patients, setPatients] = useState([]);
    const [selectedPatientId, setSelectedPatientId] = useState("");
    const [report, setReport] = useState(null);
    const [savedReports, setSavedReports] = useState([]);

    useEffect(() => {
        const user = localStorage.getItem("username");
        setUsername(user || "");

        // Load Patients
        apiGet("/api/patients/all").then(data => {
            if (data.success) setPatients(data.patients || []);
        });

        // Load Reports
        apiGet("/api/reports").then(data => {
            if (data.success) setSavedReports(data.reports || []);
        });
    }, []);

    const loadReport = async () => {
        if (!selectedPatientId) return;
        try {
            const data = await apiGet(`/api/reports/patient/${selectedPatientId}`);
            if (data.success) {
                setReport({
                    patient: data.data.patient,
                    appointments: data.data.appointments || [],
                    billings: data.data.bills || [],
                });
            }
        } catch (err) { console.error(err); }
    };

    const handleGeneratePdf = async () => {
        if (!selectedPatientId) return;
        try {
            const data = await apiPost("/api/reports/generate", { patient_id: selectedPatientId });
            if (data.success) {
                alert("Report Generated!");
                // Refresh list
                apiGet("/api/reports").then(d => { if (d.success) setSavedReports(d.reports || []); });
            }
        } catch (err) { console.error(err); }
    };

    // REMOVED SIDEBAR
    return (
        <div className="p-4 md:p-8 min-h-screen bg-gray-100 print:bg-white">
            <div className="flex justify-between items-center mb-6 print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
                {/* Username handled in layout */}
            </div>

            {/* CONTROLS */}
            <div className="bg-white rounded-2xl shadow-md p-6 mb-6 print:hidden">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                    <select className="border p-2 rounded w-full md:flex-1" value={selectedPatientId} onChange={e => setSelectedPatientId(e.target.value)}>
                        <option value="">Select Patient</option>
                        {patients.map(p => <option key={p.patient_id} value={p.patient_id}>{p.name}</option>)}
                    </select>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={loadReport} className="bg-blue-600 text-white px-4 py-2 rounded w-full md:w-auto">Load</button>
                        <button onClick={handleGeneratePdf} className="bg-green-600 text-white px-4 py-2 rounded w-full md:w-auto">Generate PDF</button>
                    </div>
                </div>
            </div>

            {/* REPORT DISPLAY */}
            {report && (
                <div className="bg-white rounded-2xl shadow-md p-6 print:shadow-none">
                    <h1 className="text-2xl font-bold mb-4">Patient Report: {report.patient?.name}</h1>
                    <p>ID: {report.patient?.patient_id}</p>
                    <hr className="my-4" />
                    <h2 className="text-lg font-bold">Appointments ({report.appointments.length})</h2>
                    {/* ... Table omitted for brevity, logic remains same ... */}
                    <div className="mt-4">
                        {report.appointments.map((a, i) => <div key={i}>{a.date} - {a.doctor_name}</div>)}
                    </div>
                    <hr className="my-4" />
                    <h2 className="text-lg font-bold">Billing</h2>
                    <div className="mt-4">
                        {report.billings.map((b, i) => <div key={i}>{b.grand_total} ({b.payment_status})</div>)}
                    </div>
                </div>
            )}
        </div>
    );
}
