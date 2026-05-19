"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiGet } from "@/services/api";

const formatStatusLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Unknown";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const paymentTone = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "paid") return "bg-emerald-100 text-emerald-700";
  if (normalized === "pending" || normalized === "unpaid") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
};

const pageShell = "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-4 md:p-6";
const pageContent = "mx-auto w-full max-w-7xl space-y-6";
const surfaceCard = "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";
const insetCard = "rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4";

export default function RegisterDashboard() {
  const router = useRouter();
  const [username] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("username") || "";
  });
  const [stats, setStats] = useState({
    totalPatients: 0,
    todayAppointments: 0,
    paid: 0,
    unpaid: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [pickedPatient, setPickedPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [filters, setFilters] = useState({
    doctor: "all",
    payment: "all",
    sort: "timeAsc",
  });

  useEffect(() => {
    const fetchDashboard = async (date) => {
      try {
        const data = await apiGet("/api/register/dashboard", { date });
        if (!data?.success) return;

        const list = Array.isArray(data.list) ? data.list : [];
        setStats({
          totalPatients: Number(data.totalPatients || 0),
          todayAppointments: Number(data.appointmentsToday || 0),
          paid: Number(data.paid || 0),
          unpaid: Number(data.unpaid || 0),
        });
        setAppointments(list);
        setFiltered(list);
      } catch (err) {
        console.log("Dashboard Error:", err);
      }
    };

    fetchDashboard(selectedDate);
  }, [selectedDate]);

  const handleSearch = (text) => {
    setSearch(text);
    if (!text.trim()) {
      setPickedPatient(null);
      setFiltered(appointments);
      return;
    }

    const q = String(text).toLowerCase();
    const matched = appointments.filter((item) => {
      return (
        String(item?.patient_id || "").toLowerCase().includes(q) ||
        String(item?.patientName || item?.patient_name || "").toLowerCase().includes(q) ||
        String(item?.doctorName || item?.doctor_name || "").toLowerCase().includes(q)
      );
    });

    setFiltered(matched);
  };

  const doctorOptions = useMemo(() => {
    const names = new Set();
    appointments.forEach((item) => {
      const doctorName = item?.doctorName || item?.doctor_name;
      if (doctorName) names.add(doctorName);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [appointments]);

  const searchMatches = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return [];
    return appointments
      .filter((item) => {
        return (
          String(item?.patient_id || "").toLowerCase().includes(q) ||
          String(item?.patientName || item?.patient_name || "").toLowerCase().includes(q) ||
          String(item?.doctorName || item?.doctor_name || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [appointments, search]);

  const displayRows = useMemo(() => {
    let rows = [...filtered];

    if (filters.doctor !== "all") {
      rows = rows.filter((item) => (item?.doctorName || item?.doctor_name) === filters.doctor);
    }

    if (filters.payment !== "all") {
      rows = rows.filter(
        (item) => String(item?.paymentStatus || item?.payment_status || "").toLowerCase() === filters.payment
      );
    }

    rows.sort((a, b) => {
      if (filters.sort === "nameAsc") {
        return String(a?.patientName || a?.patient_name || "").localeCompare(
          String(b?.patientName || b?.patient_name || "")
        );
      }

      const aTime = String(a?.time || a?.appointment_time || "");
      const bTime = String(b?.time || b?.appointment_time || "");
      if (aTime === bTime) return 0;
      const result = aTime < bTime ? -1 : 1;
      return filters.sort === "timeAsc" ? result : -result;
    });

    return rows;
  }, [filtered, filters]);

  const paymentPendingCount = useMemo(() => {
    return appointments.filter((item) => {
      const status = String(item?.paymentStatus || item?.payment_status || "").toLowerCase();
      return status === "pending" || status === "unpaid";
    }).length;
  }, [appointments]);

  const doctorLoad = useMemo(() => {
    const totals = {};
    appointments.forEach((item) => {
      const doctorName = item?.doctorName || item?.doctor_name || "Unassigned";
      totals[doctorName] = (totals[doctorName] || 0) + 1;
    });

    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [appointments]);

  const autoSelectedPatient = useMemo(() => {
    if (displayRows.length !== 1) return null;
    const item = displayRows[0];
    return {
      patient_id: item?.patient_id || "--",
      name: item?.patientName || item?.patient_name || "--",
      doctor: item?.doctorName || item?.doctor_name || "--",
      time: item?.time || item?.appointment_time || "--",
      payment: item?.paymentStatus || item?.payment_status || "--",
    };
  }, [displayRows]);

  const selectedPatient = pickedPatient || autoSelectedPatient;

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleRowClick = (patientId) => {
    if (!patientId) return;
    router.push(`/register/registration?patient_id=${patientId}`);
  };

  const handleSearchPick = (item) => {
    if (!item) return;
    setPickedPatient({
      patient_id: item?.patient_id || "--",
      name: item?.patientName || item?.patient_name || "--",
      doctor: item?.doctorName || item?.doctor_name || "--",
      time: item?.time || item?.appointment_time || "--",
      payment: item?.paymentStatus || item?.payment_status || "--",
    });
  };

  return (
    <div className={pageShell}>
      <div className={pageContent}>
      <section className="rounded-[32px] bg-gradient-to-br from-sky-700 via-cyan-700 to-teal-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.55)] md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-100">
              Reception Desk
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              Front-desk control center
            </h1>
            <p className="mt-3 text-sm text-sky-50 md:text-base">
              Track daily appointments, find patients quickly, and move straight into intake,
              booking, and billing.
            </p>
            {username ? (
              <p className="mt-3 text-sm text-cyan-100">Signed in as {username}</p>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Link
              href="/register/patient-create"
              className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              New Patient
            </Link>
            <Link
              href="/register/registration"
              className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Book Appointment
            </Link>
            <Link
              href="/register/billing"
              className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              Open Billing
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={surfaceCard}>
          <p className="text-sm text-slate-500">Registered Patients</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.totalPatients}</p>
          <p className="mt-2 text-sm text-slate-500">Patients available for booking and billing.</p>
        </div>

        <div className="rounded-[28px] border border-sky-100 bg-sky-50/95 p-5 shadow-[0_16px_40px_-28px_rgba(14,165,233,0.55)]">
          <p className="text-sm text-sky-700">Appointments Today</p>
          <p className="mt-3 text-3xl font-bold text-sky-900">{stats.todayAppointments}</p>
          <p className="mt-2 text-sm text-sky-700">Current front-desk appointment volume.</p>
        </div>

        <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-5 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
          <p className="text-sm text-emerald-700">Payments Cleared</p>
          <p className="mt-3 text-3xl font-bold text-emerald-900">{stats.paid}</p>
          <p className="mt-2 text-sm text-emerald-700">Patients with completed payment status.</p>
        </div>

        <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-5 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
          <p className="text-sm text-amber-700">Pending Payment</p>
          <p className="mt-3 text-3xl font-bold text-amber-900">{stats.unpaid}</p>
          <p className="mt-2 text-sm text-amber-700">Patients still needing front-desk follow-up.</p>
        </div>
      </section>

      <section className="space-y-4">
        <div className={surfaceCard}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Search and filter</h2>
              <p className="text-sm text-slate-500">Find today&apos;s patient bookings faster.</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search patient ID, patient name, doctor"
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm shadow-sm outline-none transition focus:border-sky-500"
              />
            </div>

            <select
              name="doctor"
              value={filters.doctor}
              onChange={handleFilterChange}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="all">All Doctors</option>
              {doctorOptions.map((doctorName) => (
                <option key={doctorName} value={doctorName}>
                  {doctorName}
                </option>
              ))}
            </select>

            <select
              name="payment"
              value={filters.payment}
              onChange={handleFilterChange}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
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
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="timeAsc">Time Asc</option>
              <option value="timeDesc">Time Desc</option>
              <option value="nameAsc">Patient Name A-Z</option>
            </select>
          </div>

          {search.trim() ? (
            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70">
              {searchMatches.length ? (
                <div className="max-h-72 overflow-auto p-2">
                  {searchMatches.map((item, index) => {
                    const patientId = item?.patient_id || "";
                    const patientName = item?.patientName || item?.patient_name || "--";
                    const doctorName = item?.doctorName || item?.doctor_name || "--";
                    const time = item?.time || item?.appointment_time || "--";
                    return (
                      <button
                        key={`${patientId}-${doctorName}-${time}-${index}`}
                        type="button"
                        onClick={() => handleSearchPick(item)}
                        className="flex w-full items-start justify-between rounded-xl bg-white px-3 py-3 text-left transition hover:bg-sky-50"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{patientName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {patientId || "--"} | {doctorName}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {time}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-4 text-sm text-slate-500">No matching appointments found.</div>
              )}
            </div>
          ) : null}
        </div>

      </section>

      {selectedPatient ? (
        <section className={surfaceCard}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Quick patient context</h2>
              <p className="text-sm text-slate-500">Single result found from your current search.</p>
            </div>
            <Link
              href={`/register/registration?patient_id=${selectedPatient.patient_id}`}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              Open appointment flow
            </Link>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className={insetCard}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Patient ID</p>
              <p className="mt-2 font-semibold text-slate-900">{selectedPatient.patient_id}</p>
            </div>
            <div className={insetCard}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
              <p className="mt-2 font-semibold text-slate-900">{selectedPatient.name}</p>
            </div>
            <div className={insetCard}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Doctor</p>
              <p className="mt-2 font-semibold text-slate-900">{selectedPatient.doctor}</p>
            </div>
            <div className={insetCard}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Time</p>
              <p className="mt-2 font-semibold text-slate-900">{selectedPatient.time}</p>
            </div>
            <div className={insetCard}>
              <p className="text-xs uppercase tracking-wide text-slate-500">Payment</p>
              <p className="mt-2 font-semibold text-slate-900">
                {formatStatusLabel(selectedPatient.payment)}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className={surfaceCard}>
        <h2 className="text-lg font-semibold text-slate-900">Desk snapshot</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className={insetCard}>
            <p className="text-sm text-slate-500">Visible appointments</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{displayRows.length}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
            <p className="text-sm text-amber-700">Payment follow-up</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{paymentPendingCount}</p>
          </div>
          <div className="rounded-2xl border border-sky-200 bg-sky-50/90 p-4">
            <p className="text-sm text-sky-700">Top doctor load</p>
            {doctorLoad.length ? (
              <div className="mt-2 space-y-2 text-sm text-sky-900">
                {doctorLoad.map(([name, total]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="truncate pr-3">{name}</span>
                    <span className="font-semibold">{total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No appointment load yet.</p>
            )}
          </div>
        </div>
      </section>

      <section className={surfaceCard}>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Appointment desk queue</h2>
            <p className="text-sm text-slate-500">
              Showing {displayRows.length} of {appointments.length} appointments for the selected date.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Click any row to continue with that patient&apos;s appointment flow.
          </p>
        </div>

        <div className="mt-5 overflow-x-auto">
          {displayRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
              <p className="text-base font-medium text-slate-700">No appointments found</p>
              <p className="mt-2 text-sm text-slate-500">
                Try changing the date or clearing some filters.
              </p>
            </div>
          ) : (
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <th className="px-4 py-3 font-semibold">Patient ID</th>
                  <th className="px-4 py-3 font-semibold">Patient</th>
                  <th className="px-4 py-3 font-semibold">Doctor</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((item, index) => {
                  const patientId = item?.patient_id || "";
                  const patientName = item?.patientName || item?.patient_name || "--";
                  const doctorName = item?.doctorName || item?.doctor_name || "--";
                  const time = item?.time || item?.appointment_time || "--";
                  const paymentStatus = item?.paymentStatus || item?.payment_status || "unknown";

                  return (
                    <tr
                      key={`${patientId}-${doctorName}-${time}-${index}`}
                      className="border-b border-slate-100 transition hover:bg-sky-50/70"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{patientId || "--"}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{patientName}</td>
                      <td className="px-4 py-3 text-slate-700">{doctorName}</td>
                      <td className="px-4 py-3 text-slate-700">{time}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${paymentTone(
                            paymentStatus
                          )}`}
                        >
                          {formatStatusLabel(paymentStatus)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRowClick(patientId)}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
      </div>
    </div>
  );
}
