"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/services/api"; // Using central API config

export default function RegisterDashboard() {
    const router = useRouter();
    const [username, setUsername] = useState("");

    const [stats, setStats] = useState({
        totalPatients: 0,
        todayAppointments: 0,
        paid: 0,
        unpaid: 0,
    });

    const [appointments, setAppointments] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState("");
    const [searchPatient, setSearchPatient] = useState(null);
    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        return d.toISOString().split("T")[0];
    });

    const [filters, setFilters] = useState({
        doctor: "all",
        payment: "all",
        sort: "timeAsc", // timeAsc | timeDesc | nameAsc
    });

    // Auth check handled by Layout, just getting username here
    useEffect(() => {
        const user = localStorage.getItem("username");
        setUsername(user || "");
    }, []);

    // Fetch Dashboard Stats
    useEffect(() => {
        const fetchDashboard = async (date) => {
            try {
                const data = await apiGet(`/api/register/dashboard`, { date });
                if (data.success) {
                    setStats({
                        totalPatients: data.totalPatients,
                        todayAppointments: data.appointmentsToday,
                        paid: data.paid,
                        unpaid: data.unpaid,
                    });
                    setAppointments(data.list || []);
                    setFiltered(data.list || []);
                }
            } catch (err) {
                console.log("Dashboard Error:", err);
            }
        };
        fetchDashboard(selectedDate);
    }, [selectedDate]);

    // Search
    const handleSearch = async (text) => {
        setSearch(text);
        if (!text.trim()) {
            setFiltered(appointments);
            setSearchPatient(null);
            return;
        }

        const q = String(text).toLowerCase();
        const matched = (appointments || []).filter((a) => {
            return (
                (a.patient_id || "").toLowerCase().includes(q) ||
                (a.patientName || "").toLowerCase().includes(q) ||
                (a.doctorName || "").toLowerCase().includes(q)
            );
        });

        setFiltered(matched);
        if (matched.length === 1) {
            const p = matched[0];
            setSearchPatient({
                patient_id: p.patient_id,
                name: p.patientName,
                age: "",
                mobile: "",
                address: "",
            });
        } else {
            setSearchPatient(null);
        }
    };

    // Filters
    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const doctorOptions = useMemo(() => {
        const set = new Set();
        (appointments || []).forEach((a) => {
            if (a.doctorName) set.add(a.doctorName);
        });
        return Array.from(set);
    }, [appointments]);

    const displayRows = useMemo(() => {
        let rows = [...filtered];
        if (filters.doctor !== "all") {
            rows = rows.filter((a) => a.doctorName === filters.doctor);
        }
        if (filters.payment !== "all") {
            rows = rows.filter(
                (a) => (a.paymentStatus || "").toLowerCase() === filters.payment
            );
        }
        rows.sort((a, b) => {
            if (filters.sort === "nameAsc") {
                return (a.patientName || "").localeCompare(b.patientName || "");
            }
            if (filters.sort === "timeDesc" || filters.sort === "timeAsc") {
                const ta = a.time || "";
                const tb = b.time || "";
                if (ta === tb) return 0;
                const cmp = ta < tb ? -1 : 1;
                return filters.sort === "timeAsc" ? cmp : -cmp;
            }
            return 0;
        });
        return rows;
    }, [filtered, filters]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const handleRowClick = (patient_id) => {
        if (!patient_id) return;
        router.push(`/register/registration?patient_id=${patient_id}`);
    };

    // REMOVED SIDEBAR AND LAYOUT WRAPPER
    return (
        <div className="w-full">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-800">
                    Appointments of the Day
                </h1>
                {/* Username handled in sidebar/layout usually, but kept here for context if needed */}
            </div>

            {/* STAT CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-xl shadow text-center">
                    <p className="text-gray-600">Total Patients</p>
                    <h2 className="text-3xl font-bold">{stats.totalPatients}</h2>
                </div>

                <div className="bg-blue-100 p-6 rounded-xl shadow text-center">
                    <p className="text-gray-700">Appointments Today</p>
                    <h2 className="text-3xl font-bold">{stats.todayAppointments}</h2>
                </div>

                <div className="bg-green-100 p-6 rounded-xl shadow text-center">
                    <p className="text-gray-700">Paid</p>
                    <h2 className="text-3xl font-bold">{stats.paid}</h2>
                </div>

                <div className="bg-yellow-100 p-6 rounded-xl shadow text-center">
                    <p className="text-gray-700">Unpaid</p>
                    <h2 className="text-3xl font-bold">{stats.unpaid}</h2>
                </div>
            </div>

            {/* SEARCH + CREATE */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="🔍 Search by Patient ID / Name / Doctor..."
                    className="w-full md:w-1/3 px-4 py-2 border rounded-md shadow-sm"
                />

                <Link
                    href="/register/patient-create"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md shadow w-full md:w-auto text-center"
                >
                    + Create Registration
                </Link>
            </div>

            {/* DATE PICKER */}
            <div className="mb-4">
                <label className="text-sm text-gray-600 mr-2">Select Date:</label>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={handleDateChange}
                    className="px-3 py-2 border rounded-md"
                />
            </div>

            {/* FILTER BAR */}
            <div className="bg-white p-4 rounded-xl shadow mb-6 flex flex-wrap gap-4 items-center">
                <span className="text-sm font-semibold text-gray-700">
                    Filters:
                </span>

                <select
                    name="doctor"
                    value={filters.doctor}
                    onChange={handleFilterChange}
                    className="px-3 py-2 border rounded-md text-sm"
                >
                    <option value="all">All Doctors</option>
                    {doctorOptions.map((doc) => (
                        <option key={doc} value={doc}>
                            {doc}
                        </option>
                    ))}
                </select>

                <select
                    name="payment"
                    value={filters.payment}
                    onChange={handleFilterChange}
                    className="px-3 py-2 border rounded-md text-sm"
                >
                    <option value="all">All Payments</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="unpaid">Unpaid</option>
                </select>

                <select
                    name="sort"
                    value={filters.sort}
                    onChange={handleFilterChange}
                    className="px-3 py-2 border rounded-md text-sm"
                >
                    <option value="timeAsc">Time ↑</option>
                    <option value="timeDesc">Time ↓</option>
                    <option value="nameAsc">Patient Name A→Z</option>
                </select>

                <span className="ml-auto text-xs text-gray-500">
                    Showing {displayRows.length} of {appointments.length} appointments
                </span>
            </div>

            {/* PATIENT INFO BOX */}
            {searchPatient && (
                <div className="bg-white p-6 rounded-xl shadow mb-6">
                    <h2 className="text-lg font-semibold mb-2">Patient Details</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <p>
                            <b>Patient ID:</b> {searchPatient.patient_id}
                        </p>
                        <p>
                            <b>Name:</b> {searchPatient.name}
                        </p>
                        <p>
                            <b>Age:</b> {searchPatient.age}</p>
                        <p>
                            <b>Mobile:</b> {searchPatient.mobile}
                        </p>
                        <p className="col-span-2">
                            <b>Address:</b> {searchPatient.address}
                        </p>
                    </div>
                </div>
            )}

            {/* APPOINTMENT LIST */}
            <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
                {displayRows.length === 0 ? (
                    <p className="text-gray-500 text-center">No appointments found.</p>
                ) : (
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="p-2">Patient ID</th>
                                <th className="p-2">Name</th>
                                <th className="p-2">Doctor</th>
                                <th className="p-2">Time</th>
                                <th className="p-2">Payment</th>
                            </tr>
                        </thead>

                        <tbody>
                            {displayRows.map((a, index) => (
                                <tr
                                    key={index}
                                    className="border-b hover:bg-blue-50 cursor-pointer transition"
                                    onClick={() => handleRowClick(a.patient_id)}
                                >
                                    <td className="p-2 font-mono">{a.patient_id}</td>
                                    <td className="p-2">{a.patientName}</td>
                                    <td className="p-2">{a.doctorName}</td>
                                    <td className="p-2">{a.time}</td>
                                    <td className="p-2 capitalize">{a.paymentStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
