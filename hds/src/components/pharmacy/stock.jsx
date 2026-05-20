"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import ConfirmModal from "./components/ConfirmModal";
import MedicineFormModal from "./components/MedicineFormModal";
import StockTable from "./components/StockTable";
import formatCurrency from "@/utils/formatCurrency";

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

const emptyForm = {
  name: "",
  batchNumber: "",
  quantity: "0",
  price: "0",
  expiryDate: "",
  reorderLevel: "10",
  supplier: "",
};

const mapMedicine = (medicine) => ({
  id: medicine?._id || medicine?.id,
  name: medicine?.name || "",
  batchNumber: medicine?.batchNumber || medicine?.sku || "",
  quantity: String(medicine?.quantity ?? medicine?.stock_quantity ?? 0),
  price: String(medicine?.price ?? medicine?.unit_price ?? 0),
  expiryDate: medicine?.expiryDate || medicine?.expiry_date || "",
  reorderLevel: String(medicine?.reorderLevel ?? medicine?.reorder_level ?? 10),
  supplier: medicine?.supplier || medicine?.category || "",
});

const validateForm = (values) => {
  const errors = {};
  if (!String(values.name || "").trim()) errors.name = "Medicine name is required.";
  if (!String(values.batchNumber || "").trim()) errors.batchNumber = "Batch number is required.";
  if (Number(values.quantity) < 0) errors.quantity = "Quantity cannot be negative.";
  if (Number(values.price) < 0) errors.price = "Price cannot be negative.";
  if (Number(values.reorderLevel) < 0) errors.reorderLevel = "Reorder level cannot be negative.";

  if (!values.expiryDate) {
    errors.expiryDate = "Expiry date is required.";
  } else if (Number.isNaN(new Date(values.expiryDate).getTime())) {
    errors.expiryDate = "Enter a valid expiry date.";
  }

  return errors;
};

const getStatusMeta = (medicine) => {
  const quantity = Number(medicine?.quantity ?? medicine?.stock_quantity ?? 0);
  const reorderLevel = Number(medicine?.reorderLevel ?? medicine?.reorder_level ?? 0);
  const expiryDate = medicine?.expiryDate || medicine?.expiry_date;

  if (expiryDate) {
    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!Number.isNaN(expiry.getTime())) {
      if (expiry < today) return { label: "Expired", tone: "expired" };

      const soon = new Date(today);
      soon.setDate(soon.getDate() + 30);
      if (expiry <= soon) return { label: "Expiring Soon", tone: "expiring" };
    }
  }

  if (quantity < reorderLevel) return { label: "Low Stock", tone: "low" };
  return { label: "Healthy", tone: "normal" };
};

export default function PharmacyStockPage() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("add");
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [reorderDrafts, setReorderDrafts] = useState({});

  const activeHospitalId = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.hospital_id !== undefined && parsed?.hospital_id !== null) {
          return parsed.hospital_id;
        }
        if (parsed?.hospitalId !== undefined && parsed?.hospitalId !== null) {
          return parsed.hospitalId;
        }
      }
    } catch (error) {
      // ignore localStorage parse errors
    }
    const flatHospitalId = localStorage.getItem("hospital_id");
    return flatHospitalId || null;
  }, []);

  const loadMedicines = async (activeSearch = search, activeFilter = filter) => {
    setLoading(true);
    try {
      const response = await apiGet("/api/pharmacy/medicines", {
        search: activeSearch,
        filter: activeFilter,
      });
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
        ? response
        : [];
      setMedicines(list);
      setReorderDrafts(
        list.reduce((acc, item) => {
          const id = item?._id || item?.id;
          acc[id] = String(item?.reorderLevel ?? item?.reorder_level ?? 0);
          return acc;
        }, {})
      );
    } catch (error) {
      console.error("Failed to load pharmacy stock", error);
      setMedicines([]);
      setFeedback({ type: "error", text: error?.message || "Unable to load pharmacy stock." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedicines(search, filter);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, filter]);

  const summary = useMemo(() => {
    const lowStock = medicines.filter((item) => getStatusMeta(item).tone === "low").length;
    const expired = medicines.filter((item) => getStatusMeta(item).tone === "expired").length;
    const expiringSoon = medicines.filter((item) => getStatusMeta(item).tone === "expiring").length;
    const inventoryValue = medicines.reduce((sum, item) => {
      return sum + Number(item?.quantity ?? item?.stock_quantity ?? 0) * Number(item?.price ?? item?.unit_price ?? 0);
    }, 0);

    return {
      total: medicines.length,
      lowStock,
      expired,
      expiringSoon,
      inventoryValue,
    };
  }, [medicines]);

  const openAdd = () => {
    setSelectedMedicine(null);
    setFormMode("add");
    setFormValues(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  };

  const openEdit = (medicine) => {
    setSelectedMedicine(medicine);
    setFormMode("edit");
    setFormValues(mapMedicine(medicine));
    setFormErrors({});
    setFormOpen(true);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateForm(formValues);
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setSubmitting(true);
    setFeedback(null);

    const payload = {
      name: formValues.name.trim(),
      batchNumber: formValues.batchNumber.trim(),
      quantity: Number(formValues.quantity),
      price: Number(formValues.price),
      expiryDate: formValues.expiryDate,
      reorderLevel: Number(formValues.reorderLevel),
      supplier: formValues.supplier.trim(),
      hospital_id: activeHospitalId,
    };

    try {
      if (formMode === "edit" && selectedMedicine) {
        await apiPut(`/api/pharmacy/medicines/${selectedMedicine._id || selectedMedicine.id}`, payload);
        setFeedback({ type: "success", text: "Medicine updated successfully." });
      } else {
        await apiPost("/api/pharmacy/medicines", payload);
        setFeedback({ type: "success", text: "Medicine added successfully." });
      }

      setFormOpen(false);
      await loadMedicines(search, filter);
    } catch (error) {
      setFeedback({ type: "error", text: error?.message || "Unable to save medicine." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoadingId(`delete-${deleteTarget._id || deleteTarget.id}`);
    setFeedback(null);
    try {
      await apiDelete(`/api/pharmacy/medicines/${deleteTarget._id || deleteTarget.id}`);
      setFeedback({ type: "success", text: "Medicine deleted successfully." });
      setDeleteTarget(null);
      await loadMedicines(search, filter);
    } catch (error) {
      setFeedback({ type: "error", text: error?.message || "Unable to delete medicine." });
    } finally {
      setActionLoadingId("");
    }
  };

  const handleQuickAdjust = async (medicine, delta) => {
    const id = medicine?._id || medicine?.id;
    const current = Number(medicine?.quantity ?? medicine?.stock_quantity ?? 0);
    const nextQuantity = Math.max(0, current + delta);
    setActionLoadingId(`stock-${id}`);
    setFeedback(null);
    try {
      await apiPut(`/api/pharmacy/medicines/${id}`, { quantity: nextQuantity });
      setFeedback({ type: "success", text: "Stock updated." });
      await loadMedicines(search, filter);
    } catch (error) {
      setFeedback({ type: "error", text: error?.message || "Unable to update stock." });
    } finally {
      setActionLoadingId("");
    }
  };

  const handleReorderDraftChange = (id, value) => {
    setReorderDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleReorderSave = async (medicine) => {
    const id = medicine?._id || medicine?.id;
    const nextValue = Number(reorderDrafts[id] ?? 0);
    if (nextValue < 0) {
      setFeedback({ type: "error", text: "Reorder level cannot be negative." });
      return;
    }

    setActionLoadingId(`reorder-${id}`);
    setFeedback(null);
    try {
      await apiPut(`/api/pharmacy/medicines/${id}`, { reorderLevel: nextValue });
      setFeedback({ type: "success", text: "Reorder level updated." });
      await loadMedicines(search, filter);
    } catch (error) {
      setFeedback({ type: "error", text: error?.message || "Unable to update reorder level." });
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-sky-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-100">Pharmacy Stock</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Stock management</h1>
              <p className="mt-3 text-sm text-sky-50 md:text-base">
                Maintain medicines, watch expiry risk, and update stock directly from one pharmacist inventory desk.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openAdd}
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Add Medicine
              </button>
              <Link
                href="/pharmacy"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </section>

        {feedback?.text ? (
          <section
            className={`rounded-2xl px-4 py-3 text-sm ${
              feedback.type === "error" ? "border border-rose-200 bg-rose-50 text-rose-700" : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.text}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Medicines" value={summary.total} tone="slate" />
          <MetricCard label="Low stock" value={summary.lowStock} tone="amber" />
          <MetricCard label="Expired" value={summary.expired} tone="rose" />
          <MetricCard label="Expiring soon" value={summary.expiringSoon} tone="orange" />
          <MetricCard label="Inventory value" value={formatCurrency(summary.inventoryValue)} tone="sky" />
        </section>

        <section className={surfaceCard}>
          <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr_0.7fr]">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Search medicine</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by medicine name"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Filter</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              >
                <option value="all">All</option>
                <option value="low-stock">Low Stock</option>
                <option value="expired">Expired</option>
                <option value="expiring-soon">Expiring Soon</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={openAdd}
                className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Add New Medicine
              </button>
            </div>
          </div>
        </section>

        <section className={surfaceCard}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Medicine inventory</h2>
              <p className="text-sm text-slate-500">
                Expired medicines remain visible and clearly marked so the pharmacist team can act safely.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {loading ? "Loading..." : `${medicines.length} medicine(s)`}
            </span>
          </div>

          <div className="mt-5">
            {loading ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
                Loading pharmacy stock...
              </div>
            ) : (
              <StockTable
                medicines={medicines}
                reorderDrafts={reorderDrafts}
                onReorderDraftChange={handleReorderDraftChange}
                onReorderSave={handleReorderSave}
                onQuickAdjust={handleQuickAdjust}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
                loadingActionId={actionLoadingId}
                getStatusMeta={getStatusMeta}
              />
            )}
          </div>
        </section>
      </div>

      <MedicineFormModal
        open={formOpen}
        mode={formMode}
        values={formValues}
        errors={formErrors}
        submitting={submitting}
        onChange={handleFormChange}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete medicine?"
        description={`This will permanently remove ${deleteTarget?.name || "this medicine"} from the pharmacy stock list.`}
        confirmLabel="Delete medicine"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    sky: "border-sky-100 bg-sky-50/95 text-sky-900",
    amber: "border-amber-100 bg-amber-50/95 text-amber-900",
    rose: "border-rose-100 bg-rose-50/95 text-rose-900",
    orange: "border-orange-100 bg-orange-50/95 text-orange-900",
  };

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
