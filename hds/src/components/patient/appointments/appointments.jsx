"use client";

import { useEffect, useState, useRef } from "react";
import { apiGet, apiPut, apiDelete, apiPost } from "@/services/api";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {

  FaChevronRight,
  FaEllipsisV,
  FaCalendarAlt,
  FaFlask,
  FaPrescriptionBottleAlt,
  FaFileInvoiceDollar,
  FaFileMedical,
  FaFileUpload,
  FaAmbulance,
  FaShieldAlt,
  FaChevronLeft,
  FaChevronRight as FaNext,
} from "react-icons/fa";

/**
 * Upgraded Appointments page (premium calendar)
 * - Modal-only details
 * - Custom CalendarUI for reschedule
 * - Theme A (Sky + Indigo accents) + soft gradients
 *
 * Endpoints used (unchanged):
 * GET  /api/appointments/my
 * PATCH /api/appointments/update/:id    { date }
 * PATCH /api/appointments/cancel/:id
 * DELETE /api/appointments/delete/:id
 * GET /api/payments/history/:appointmentId
 */

export default function AppointmentsPage() {
  const APPT_API = "/api/appointments";
  const router = useRouter();


  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState("upcoming");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [doctors, setDoctors] = useState([]);

  const [actionOpenId, setActionOpenId] = useState(null);
  const actionRef = useRef({});

  // DETAILS MODAL state (modal-only approach)
  const [detailsModal, setDetailsModal] = useState({
    open: false,
    appt: null,
    paymentHistory: [],
    loadingPayments: false,
  });

  // Reschedule modal state
  const [reschedule, setReschedule] = useState({ open: false, id: null, date: "" });
  const [rescheduleDate, setRescheduleDate] = useState(""); // YYYY-MM-DD

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load appointments
  const loadAppointments = async () => {
    setLoading(true);
    try {
      const data = await apiGet(APPT_API);
      const arr = Array.isArray(data.appointments) ? data.appointments : (Array.isArray(data) ? data : []);
      setAppointments(arr);
      const uniqueDoctors = [
        ...new Set(
          arr
            .map((a) => a.doctorName || a.doctor?.username || a.doctor_id)
            .filter(Boolean)
        ),
      ];
      setDoctors(uniqueDoctors);
    } catch (err) {
      console.error("Failed to load appointments", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // helper to call appointment endpoints
  const callApi = async (path, method = "PATCH", body) => {
    if (method === "PATCH" || method === "PUT") {
      return apiPut(`${APPT_API}${path}`, body || {});
    }
    if (method === "DELETE") {
      return apiDelete(`${APPT_API}${path}`);
    }
    if (method === "POST") {
      return apiPost(`${APPT_API}${path}`, body || {});
    }
    return apiGet(`${APPT_API}${path}`);
  };

  const handleCancel = async (id) => {
    const ok = confirm("Cancel this appointment?");
    if (!ok) return;

    try {
      await callApi(`/cancel/${id}`, "PATCH");

      // Refresh appointments
      await loadAppointments();

      // Close modal if open
      if (detailsModal.open && detailsModal.appt?.id === id) {
        setDetailsModal((prev) => ({
          ...prev,
          appt: { ...prev.appt, status: "cancelled" },
        }));
      }

      // Force move user to Cancelled tab
      setFilter("cancelled");
    } catch (err) {
      console.log(err);
      alert("Error cancelling appointment.");
    }
  };

  const handleDelete = async (id) => {
    const ok = confirm("Permanently delete this appointment?");
    if (!ok) return;

    try {
      await callApi(`/delete/${id}`, "DELETE");

      // Close modal and refresh appointments
      setDetailsModal({ open: false, appt: null, paymentHistory: [], loadingPayments: false });

      await loadAppointments();

      // Force-filter to the cancelled page
      setFilter("cancelled");
    } catch (err) {
      console.log("Delete API error", err);
      alert("Error deleting appointment.");
    }
  };

  // Open reschedule prefilled with appointment date
  const handleOpenRescheduleFromList = (appt) => {
    setReschedule({ open: true, id: appt.id, date: appt.date || "" });
    // normalize to YYYY-MM-DD if possible (some data may be in other format)
    const normalized = toISODate(appt.date) || todayISO;
    setRescheduleDate(normalized);
  };

  // Submit reschedule uses rescheduleDate
  const submitReschedule = async () => {
    const { id } = reschedule;
    const date = rescheduleDate;

    if (!date) {
      alert("Please select a valid future date.");
      return;
    }

    // simple validation (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      alert("Invalid date format. Please use the date picker.");
      return;
    }

    try {
      await callApi(`/update/${id}`, "PATCH", { date });
      setReschedule({ open: false, id: null, date: "" });
      await loadAppointments();

      // if details modal open for same appointment, refresh
      if (detailsModal.open && detailsModal.appt?.id === id) {
        setDetailsModal((s) => ({ ...s, appt: { ...s.appt, date } }));
      }
    } catch (err) {
      console.error("Reschedule failed:", err);
      alert("Failed to reschedule appointment.");
    }
  };

  const toggleActions = (id) => {
    setActionOpenId((prev) => (prev === id ? null : id));
  };

  // open details modal (use existing appointment data from list + fetch payment history)
  const openDetailsModal = async (appt) => {
    setDetailsModal({ open: true, appt, paymentHistory: [], loadingPayments: true });
    try {
      try {
        const json = await apiGet(`/api/payments/history/${appt.id}`);
        const payments = Array.isArray(json) ? json : json.payments || [];
        setDetailsModal((s) => ({ ...s, paymentHistory: payments, loadingPayments: false }));
      } catch (e) {
        setDetailsModal((s) => ({ ...s, paymentHistory: [], loadingPayments: false }));
      }
    } catch (err) {
      console.error("payment history fetch error", err);
      setDetailsModal((s) => ({ ...s, paymentHistory: [], loadingPayments: false }));
    }
  };

  // close details modal
  const closeDetailsModal = () => setDetailsModal({ open: false, appt: null, paymentHistory: [], loadingPayments: false });

  // Pay action (navigates to your existing payment page)
  const handlePay = (id) => {
    router.push(`/patient/payment?appointmentId=${id}`);
  };

  // close action menus when clicking outside
  useEffect(() => {
    const closeOnOutside = (e) => {
      const refs = Object.values(actionRef.current || {});
      const clickedInside = refs.some((r) => r && r.contains && r.contains(e.target));
      if (!clickedInside) setActionOpenId(null);
    };
    document.addEventListener("click", closeOnOutside);
    return () => document.removeEventListener("click", closeOnOutside);
  }, []);

  // filtering logic derived from appointments list
  const filteredAppointments = appointments.filter((a) => {
    if (doctorFilter !== "all") {
      const name = (a.doctorName || a.doctor?.username || a.doctor_id || "").toString();
      if (name !== doctorFilter) return false;
    }
    const status = (a.status || "pending").toLowerCase();
    const paid = a.paid || a.payment_status === "success" || false;

    if (filter === "upcoming") return status !== "cancelled" && status !== "completed";
    if (filter === "past") return status === "completed";
    if (filter === "cancelled") return status === "cancelled";
    if (filter === "paid") return paid === true;
    if (filter === "unpaid") return paid === false;
    return true;
  });

  // small skeleton loader component
  const SkeletonCard = () => (
    <div className="animate-pulse bg-gradient-to-r from-white to-sky-50 rounded-lg p-6 shadow-sm">
      <div className="h-5 w-48 bg-slate-200 rounded mb-4"></div>
      <div className="h-4 w-24 bg-slate-200 rounded mb-3"></div>
      <div className="h-3 w-full bg-slate-200 rounded mt-6"></div>
    </div>
  );

  // today's date in YYYY-MM-DD for min attribute (prevents past selections)
  const todayISO = new Date().toISOString().split("T")[0];

  // helper: convert some common date formats to YYYY-MM-DD (best-effort)
  function toISODate(raw) {
    if (!raw) return null;
    try {
      // if already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      // dd-mm-yyyy or dd/mm/yyyy
      const dmy = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
      if (dmy) {
        const dd = dmy[1].padStart(2, "0");
        const mm = dmy[2].padStart(2, "0");
        const yyyy = dmy[3];
        return `${yyyy}-${mm}-${dd}`;
      }
      // try Date parse fallback
      const dt = new Date(raw);
      if (!isNaN(dt)) {
        return dt.toISOString().split("T")[0];
      }
    } catch (e) { }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100">


      {/* MAIN */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">My Appointments</h1>
            <p className="text-sm text-slate-600 mt-1">Upcoming appointments and history — manage payments, reschedule or cancel.</p>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/patient/appointments/book">
              <button className="px-4 py-2 rounded-md bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg">Book Appointment</button>
            </Link>
          </div>
        </div>

        {/* filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {["upcoming", "past", "cancelled", "all", "paid", "unpaid"].map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === k ? "bg-gradient-to-r from-sky-400 to-indigo-400 text-white shadow-md" : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"}`}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Doctor</label>
            <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)} className="px-3 py-1 border rounded bg-white">
              <option value="all">All</option>
              {doctors.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* list */}
        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-8 bg-white rounded shadow text-center">
            <p className="text-slate-600">No appointments match this filter.</p>
            <div className="mt-4">
              <Link href="/patient/appointments/book">
                <button className="px-4 py-2 rounded bg-sky-600 text-white">Book Appointment</button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((a) => {
              const status = (a.status || "pending").toLowerCase();
              const paid = a.paid || a.payment_status === "success" || false;
              return (
                <article key={a.id} className="bg-white rounded-lg p-6 shadow-sm flex md:items-start md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">Dr. {a.doctorName || a.doctor?.username || a.doctor_id}</div>
                        <div className="text-sm text-slate-500 mt-1">{a.date || a.slot || "No date specified"}</div>
                      </div>

                      <div className="text-right">
                        <StatusBadge status={status} paid={paid} />
                        <div className="text-xs text-slate-400 mt-1">Appt ID: {a.id}</div>
                      </div>
                    </div>

                    {a.symptoms && <div className="mt-4 text-sm text-slate-700"><span className="font-medium">Symptoms: </span>{a.symptoms}</div>}
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    {/* Pay button */}
                    {!paid && (status === "pending" || status === "awaiting_registration") && (
                      <button onClick={() => handlePay(a.id)} className="px-3 py-1 rounded bg-emerald-500 text-white text-sm">Pay</button>
                    )}

                    {/* action menu */}
                    <div className="relative" ref={(el) => (actionRef.current[a.id] = el)}>
                      <button onClick={(e) => { e.stopPropagation(); toggleActions(a.id); }} className="p-2 rounded hover:bg-slate-100" aria-label="actions">
                        <FaEllipsisV />
                      </button>

                      {actionOpenId === a.id && (
                        <div className="absolute right-0 top-10 w-44 bg-white border rounded shadow-md z-30">
                          <button
                            onClick={() => {
                              setActionOpenId(null);
                              openDetailsModal(a); // open modal instead of routing
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50"
                          >
                            View Details
                          </button>

                          <button
                            onClick={() => {
                              setActionOpenId(null);
                              handleOpenRescheduleFromList(a);
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50"
                          >
                            Reschedule
                          </button>

                          {status !== "cancelled" && (
                            <button
                              onClick={async () => {
                                setActionOpenId(null);
                                await handleCancel(a.id);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-rose-600"
                            >
                              Cancel
                            </button>
                          )}

                          {status === "cancelled" && (
                            <button
                              onClick={async () => {
                                setActionOpenId(null);
                                await handleDelete(a.id);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-rose-700"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* DETAILS MODAL (centered) */}
      {detailsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all">
            {/* header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-slate-800">Appointment Details</h2>
                <p className="text-sm text-slate-500">Appt ID: {detailsModal.appt?.id}</p>
              </div>
              <div className="flex items-center gap-3">
                {!detailsModal.appt?.paid && detailsModal.appt?.status !== "cancelled" && (
                  <button onClick={() => handlePay(detailsModal.appt.id)} className="px-3 py-1 rounded bg-emerald-500 text-white">Pay</button>
                )}
                <button onClick={closeDetailsModal} className="px-3 py-1 rounded bg-slate-100">Close</button>
              </div>
            </div>

            {/* body */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="mb-4">
                  <p className="text-xs text-slate-500">Doctor</p>
                  <div className="text-lg font-medium text-slate-800">Dr. {detailsModal.appt?.doctorName || detailsModal.appt?.doctor_id}</div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500">Appointment Date</p>
                  <div className="text-sm text-slate-700">{detailsModal.appt?.date || "No date"}</div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500">Symptoms</p>
                  <div className="text-sm text-slate-700">{detailsModal.appt?.symptoms || "—"}</div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-slate-500">Status</p>
                  <StatusBadge status={(detailsModal.appt?.status || "pending").toLowerCase()} paid={detailsModal.appt?.paid || detailsModal.appt?.payment_status === "success"} />
                </div>

                {/* payment history */}
                <div className="mt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Payment History</p>
                  {detailsModal.loadingPayments ? (
                    <div className="space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-24 animate-pulse"></div>
                      <div className="h-3 bg-slate-200 rounded w-40 animate-pulse"></div>
                    </div>
                  ) : detailsModal.paymentHistory.length === 0 ? (
                    <div className="text-sm text-slate-500">No payments yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {detailsModal.paymentHistory.map((p) => (
                        <div key={p.id || p.razorpay_payment_id} className="flex items-center justify-between bg-slate-50 p-3 rounded">
                          <div>
                            <div className="text-sm font-medium">{p.method || p.payment_method || "Razorpay"}</div>
                            <div className="text-xs text-slate-500">{new Date(p.createdAt || p.created_at || p.created_at || Date.now()).toLocaleString()}</div>
                          </div>
                          <div className="text-sm font-semibold">{p.amount ? `₹${(p.amount / 100) || p.amount}` : p.amount}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* right column: actions */}
              <div>
                <div className="mb-4">
                  <p className="text-xs text-slate-500">Quick Actions</p>
                  <div className="flex flex-col gap-2 mt-3">
                    {detailsModal.appt?.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          setReschedule({ open: true, id: detailsModal.appt.id, date: "" });
                          // prefill rescheduleDate
                          const iso = toISODate(detailsModal.appt?.date) || todayISO;
                          setRescheduleDate(iso);
                        }}
                        className="w-full px-4 py-2 bg-yellow-400 rounded text-white"
                      >
                        Reschedule
                      </button>
                    )}
                    {detailsModal.appt?.status !== "cancelled" && <button onClick={() => handleCancel(detailsModal.appt.id)} className="w-full px-4 py-2 bg-rose-500 rounded text-white">Cancel</button>}
                    {detailsModal.appt?.status === "cancelled" && <button onClick={() => handleDelete(detailsModal.appt.id)} className="w-full px-4 py-2 bg-red-700 rounded text-white">Delete</button>}
                    <button
                      onClick={() => {
                        setDetailsModal({
                          open: false,
                          appt: null,
                          paymentHistory: [],
                          loadingPayments: false,
                        });
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full bg-slate-100 text-slate-700 py-3 rounded-lg hover:bg-slate-200 transition"
                    >
                      Back to List
                    </button>
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs text-slate-500">Appointment ID</p>
                  <div className="text-sm text-slate-700">{detailsModal.appt?.id}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL — PREMIUM Calendar UI */}
      {reschedule.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 transform transition-all animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reschedule Appointment</h3>
              <div className="text-sm text-slate-500">Select a new upcoming date</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-2">Choose Date</p>

                <div className="bg-sky-50 p-3 rounded-lg">
                  <CalendarUI
                    selectedDate={rescheduleDate}
                    onSelect={(d) => setRescheduleDate(d)}
                    minDate={todayISO}
                    maxMonthsAhead={6} // allow up to 6 months ahead
                  />
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  Selected: <span className="font-medium text-slate-800">{rescheduleDate || "None"}</span>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-2">Quick actions</p>
                <div className="flex flex-col gap-3">
                  {/* QUICK ACTIONS FIXED */}
                  <button
                    onClick={() => {
                      const iso = new Date().toISOString().split("T")[0];
                      setRescheduleDate(iso);
                    }}
                    className="px-4 py-2 rounded bg-indigo-50 border text-indigo-700"
                  >
                    Today
                  </button>

                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      const iso = d.toISOString().split("T")[0];
                      setRescheduleDate(iso);
                    }}
                    className="px-4 py-2 rounded bg-white border"
                  >
                    Tomorrow
                  </button>

                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 7);
                      const iso = d.toISOString().split("T")[0];
                      setRescheduleDate(iso);
                    }}
                    className="px-4 py-2 rounded bg-white border"
                  >
                    +7 days
                  </button>

                  <div className="mt-4">
                    <button onClick={() => setReschedule({ open: false, id: null, date: "" })} className="px-4 py-2 rounded border mr-2">Cancel</button>
                    <button onClick={submitReschedule} className="px-4 py-2 rounded bg-indigo-600 text-white">Save</button>
                  </div>
                </div>
              </div>
            </div>

            {/* hint */}
            <div className="mt-4 text-xs text-slate-500">
              <span className="font-medium">Note:</span> Past dates are disabled. You can only reschedule to upcoming dates.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- helper components & calendar ---------------- */

function SidebarCard({ icon, title, subtitle, href }) {
  return (
    <Link href={href || "#"} className="block">
      <div className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:scale-[1.01] transition transform border">
        <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-700">{icon}</div>
        <div className="flex-1">
          <div className="font-semibold text-sm text-slate-800">{title}</div>
          <div className="text-xs text-slate-500">{subtitle}</div>
        </div>
        <div className="text-slate-400"><FaChevronRight /></div>
      </div>
    </Link>
  );
}

function StatusBadge({ status, paid }) {
  let base = "px-2 py-0.5 rounded text-xs font-medium ";
  if (status === "pending") return <span className={base + "bg-yellow-100 text-yellow-800"}>Pending</span>;
  if (status === "awaiting_registration") return <span className={base + "bg-indigo-100 text-indigo-800"}>Awaiting Registration</span>;
  if (status === "confirmed") return <span className={base + "bg-green-100 text-green-800"}>Confirmed</span>;
  if (status === "cancelled") return <span className={base + "bg-rose-100 text-rose-800"}>Cancelled</span>;
  if (status === "completed") return <span className={base + "bg-teal-100 text-teal-800"}>Completed</span>;
  return <span className={base + "bg-slate-100 text-slate-700"}>{status}</span>;
}

/* ---------------- CalendarUI component (self-contained) ----------------
 Simple, fast calendar view:
 - shows month grid
 - disables past dates
 - allows next/prev month navigation
 - restricts to maxMonthsAhead
 - returns selected date as YYYY-MM-DD
 - lightweight, no external libs required
------------------------------------------------------------------------- */

function CalendarUI({ selectedDate, onSelect, minDate = null, maxMonthsAhead = 6 }) {
  const today = new Date();
  const minISO = minDate || today.toISOString().split("T")[0];

  // parse selected date
  const initialDate = selectedDate ? new Date(selectedDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-index
  const [selectedISO, setSelectedISO] = useState(selectedDate || null);

  useEffect(() => {
    // if parent controlled selectedDate changes, reflect
    if (selectedDate) {
      setSelectedISO(selectedDate);
      const d = new Date(selectedDate);
      if (!isNaN(d)) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // helper: first day index, total days
  function monthInfo(y, m) {
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { firstWeekDay: first.getDay(), daysInMonth: last.getDate() };
  }

  // check month boundary vs min/max
  function monthWithinLimit(y, m) {
    const viewStart = new Date(y, m, 1);
    const min = new Date(minISO + "T00:00:00");
    const max = new Date();
    max.setMonth(max.getMonth() + maxMonthsAhead);
    max.setHours(23, 59, 59, 999);
    return viewStart <= max;
  }

  function prevMonth() {
    const nm = viewMonth - 1;
    if (nm < 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth(nm);
    }
  }
  function nextMonth() {
    // prevent navigating beyond maxMonthsAhead
    const candidate = new Date(viewYear, viewMonth + 1, 1);
    const max = new Date();
    max.setMonth(max.getMonth() + maxMonthsAhead);
    max.setDate(1);
    if (candidate > max) return;
    const nm = viewMonth + 1;
    if (nm > 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth(nm);
    }
  }

  function isoDate(y, m, d) {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  }

  function isDisabled(y, m, d) {
    const iso = isoDate(y, m, d);
    return iso < minISO;
  }

  const { firstWeekDay, daysInMonth } = monthInfo(viewYear, viewMonth);

  const monthNames = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="rounded-md p-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded hover:bg-slate-100"><FaChevronLeft /></button>
          <div className="text-sm font-semibold">{monthNames[viewMonth]} {viewYear}</div>
          <button onClick={nextMonth} className="p-2 rounded hover:bg-slate-100"><FaNext /></button>
        </div>
        <div className="text-xs text-slate-500">
          <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }} className="px-2 py-1 rounded bg-white border">Today</button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center text-slate-500 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* blank cells for firstWeekDay */}
        {Array.from({ length: firstWeekDay }).map((_, idx) => <div key={"b" + idx} className="h-10"></div>)}

        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const iso = isoDate(viewYear, viewMonth, day);
          const disabled = isDisabled(viewYear, viewMonth, day);
          const selected = selectedISO === iso;
          return (
            <button
              key={iso}
              onClick={() => {
                if (disabled) return;
                setSelectedISO(iso);
                onSelect(iso);
              }}
              className={`h-10 flex items-center justify-center rounded-md transition ${disabled ? "text-slate-300 cursor-not-allowed bg-transparent" : "hover:bg-indigo-50"
                } ${selected ? "bg-indigo-600 text-white shadow-md" : "bg-white"}`}
            >
              <span className="text-sm">{day}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* small helpers */
function addDays(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
