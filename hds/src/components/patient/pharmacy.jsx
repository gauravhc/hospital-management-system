"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock3, FileCheck2, PackageX, Pill } from "lucide-react";
import { apiGet } from "@/services/api";
import backendUrl from "@/lib/backendUrl";

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.10),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";

const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const normalizeStatus = (value) => {
  const raw = String(value || "pending").trim().toLowerCase();
  if (!raw || raw === "active") return "Pending";
  if (raw === "dispensed" || raw === "completed" || raw === "available") return "Completed";
  if (raw === "no_stock" || raw === "out_of_stock") return "Out of Stock";
  return raw.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const statusTone = (value) => {
  const raw = String(value || "pending").trim().toLowerCase();
  if (["dispensed", "completed", "available"].includes(raw)) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (["no_stock", "out_of_stock"].includes(raw)) {
    return "bg-rose-100 text-rose-700";
  }
  return "bg-amber-100 text-amber-700";
};

const statusIcon = (value) => {
  const raw = String(value || "pending").trim().toLowerCase();
  if (["dispensed", "completed", "available"].includes(raw)) {
    return <FileCheck2 className="h-4 w-4" />;
  }
  if (["no_stock", "out_of_stock"].includes(raw)) {
    return <PackageX className="h-4 w-4" />;
  }
  return <Clock3 className="h-4 w-4" />;
};

const formatDate = (value) => {
  if (!value) return "Recently added";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function PatientPharmacyPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    const loadPrescriptions = async () => {
      setLoading(true);
      setError("");

      try {
        const profileResponse = await apiGet("/api/patients/profile");
        const patientId =
          profileResponse?.id ||
          profileResponse?.data?.id ||
          profileResponse?.patient_id ||
          profileResponse?.data?.patient_id;

        if (!patientId) {
          throw new Error("Patient profile not found.");
        }

        const prescriptionResponse = await apiGet(`/api/pharmacy/prescriptions/${patientId}`);
        const rows = Array.isArray(prescriptionResponse?.data) ? prescriptionResponse.data : [];

        const grouped = [];
        const byId = new Map();

        rows.forEach((row, index) => {
          const key = String(row?.id || `prescription-${index}`);
          if (!byId.has(key)) {
            const entry = {
              id: key,
              patient_id: row?.patient_id || patientId,
              notes: row?.notes || "",
              image_url: row?.image_url || "",
              created_at: row?.created_at || null,
              status: row?.status || "pending",
              items: [],
            };
            byId.set(key, entry);
            grouped.push(entry);
          }

          const target = byId.get(key);
          if (row?.item_id || row?.medicine_name || row?.medicine_id) {
            target.items.push({
              item_id: row?.item_id || `${key}-${target.items.length}`,
              medicine_id: row?.medicine_id || null,
              medicine_name: row?.medicine_name || `Medicine #${row?.medicine_id || "--"}`,
              quantity: Number(row?.quantity || 1),
              dosage: row?.dosage || "",
              frequency: row?.frequency || "",
              duration: row?.duration || "",
              notes: row?.item_notes || "",
              stock_quantity: row?.stock_quantity,
            });
          }
        });

        setPrescriptions(grouped);
      } catch (err) {
        console.error("Patient pharmacy load error:", err);
        setPrescriptions([]);
        setError(err?.message || "Failed to load pharmacy requests.");
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, []);

  const summary = useMemo(() => {
    return {
      total: prescriptions.length,
      pending: prescriptions.filter((entry) => !["completed", "dispensed", "available"].includes(String(entry?.status || "").toLowerCase())).length,
      completed: prescriptions.filter((entry) => ["completed", "dispensed", "available"].includes(String(entry?.status || "").toLowerCase())).length,
    };
  }, [prescriptions]);

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-6xl space-y-6 px-6 py-8">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Patient Pharmacy</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Prescription requests</h1>
          <p className="mt-3 max-w-2xl text-sm text-sky-50 md:text-base">
            Review the medicine list your doctor has sent to the pharmacy and track whether it is still pending or already completed.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className={surfaceCard}>
            <p className="text-sm text-slate-500">Total requests</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-[28px] border border-amber-100 bg-amber-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(245,158,11,0.45)]">
            <p className="text-sm text-amber-700">Pending</p>
            <p className="mt-3 text-3xl font-bold text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/95 p-6 shadow-[0_16px_40px_-28px_rgba(16,185,129,0.45)]">
            <p className="text-sm text-emerald-700">Completed</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{summary.completed}</p>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Doctor-sent prescriptions</h2>
              <p className="text-sm text-slate-500">These requests are sent from the doctor side and shared with the pharmacy team.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${prescriptions.length} request(s)`}
            </span>
          </div>

          {error ? (
            <div className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
          ) : null}

          <div className="mt-5 space-y-4">
            {!loading && prescriptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-10 text-center text-sm text-slate-500">
                No doctor-sent pharmacy requests yet.
              </div>
            ) : null}

            {prescriptions.map((entry) => (
              <article key={entry.id} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900">
                      <Pill className="h-4 w-4 text-sky-600" />
                      <p className="font-semibold">Prescription #{entry.id}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">Created on {formatDate(entry.created_at)}</p>
                    {entry.notes ? <p className="mt-3 text-sm text-slate-600">Notes: {entry.notes}</p> : null}
                    {entry.image_url ? (
                      <a
                        href={backendUrl(entry.image_url)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-semibold text-sky-700 underline underline-offset-2"
                      >
                        Open prescription file
                      </a>
                    ) : null}
                  </div>

                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusTone(entry.status)}`}>
                    {statusIcon(entry.status)}
                    {normalizeStatus(entry.status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {entry.items.length ? (
                    entry.items.map((item) => (
                      <div key={item.item_id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="font-semibold text-slate-900">{item.medicine_name}</p>
                        <p className="mt-1 text-sm text-slate-500">Quantity: {item.quantity}</p>
                        {item.dosage ? <p className="mt-1 text-sm text-slate-500">Dosage: {item.dosage}</p> : null}
                        {item.frequency ? <p className="mt-1 text-sm text-slate-500">Frequency: {item.frequency}</p> : null}
                        {item.duration ? <p className="mt-1 text-sm text-slate-500">Duration: {item.duration}</p> : null}
                        {item.notes ? <p className="mt-2 text-sm text-slate-600">Instruction: {item.notes}</p> : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-sm text-slate-500">
                      No medicine items were attached to this prescription.
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
