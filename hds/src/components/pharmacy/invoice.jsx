'use client';

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SearchBar from "./components/SearchBar";
import MedicineList from "./components/MedicineList";
import BatchModal from "./components/BatchModal";
import CartPanel from "./components/CartPanel";
import InvoiceSummary from "./components/InvoiceSummary";
import PaymentModal from "./components/PaymentModal";
import formatCurrency from "@/utils/formatCurrency";
import { apiGet, apiPost, API_URL } from "@/services/api";

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function PharmacyInvoice() {
  const [query, setQuery] = useState("");
  const [medicines, setMedicines] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [cart, setCart] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [gstPercent, setGstPercent] = useState("0");
  const [invoiceResult, setInvoiceResult] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const loadPageData = async () => {
    setLoading(true);
    try {
      const [medicinesRes, ordersRes, patientsRes, lowStockRes] = await Promise.all([
        apiGet("/api/pharmacy/medicines"),
        apiGet("/api/pharmacy/orders"),
        apiGet("/api/patients/all"),
        apiGet("/api/inventory/low-stock"),
      ]);

      setMedicines(Array.isArray(medicinesRes?.data) ? medicinesRes.data : []);
      setRecentOrders(Array.isArray(ordersRes?.data) ? ordersRes.data : []);
      setPatients(
        Array.isArray(patientsRes?.patients)
          ? patientsRes.patients
          : Array.isArray(patientsRes?.data)
          ? patientsRes.data
          : Array.isArray(patientsRes)
          ? patientsRes
          : []
      );
      setLowStockItems(Array.isArray(lowStockRes?.data) ? lowStockRes.data : []);
    } catch (error) {
      console.error("Failed to load pharmacy invoice page", error);
      setMedicines([]);
      setRecentOrders([]);
      setPatients([]);
      setLowStockItems([]);
      setFeedback({ type: "error", text: error?.message || "Unable to load pharmacy records." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPageData();
  }, []);

  useEffect(() => {
    const loadPrescription = async () => {
      if (!selectedPatientId) {
        setPrescriptions([]);
        setSelectedPrescriptionId("");
        return;
      }

      try {
        const response = await apiGet(`/api/pharmacy/prescriptions/${selectedPatientId}`);
        const rows = Array.isArray(response?.data) ? response.data : [];
        const grouped = rows.reduce((acc, row) => {
          const key = String(row.id);
          if (!acc[key]) {
            acc[key] = {
              id: row.id,
              notes: row.notes || "",
              image_url: row.image_url || null,
              created_at: row.created_at || null,
              items: [],
            };
          }
          if (row.medicine_id) {
            acc[key].items.push({
              medicine_id: row.medicine_id,
              medicine_name: row.medicine_name || `Medicine #${row.medicine_id}`,
              quantity: Number(row.quantity || 1),
              expiry_date: row.expiry_date || null,
              stock_quantity: Number(row.stock_quantity || 0),
            });
          }
          return acc;
        }, {});

        const nextPrescriptions = Object.values(grouped);
        setPrescriptions(nextPrescriptions);
        setSelectedPrescriptionId(nextPrescriptions[0]?.id ? String(nextPrescriptions[0].id) : "");
      } catch (error) {
        setPrescriptions([]);
        setSelectedPrescriptionId("");
      }
    };

    loadPrescription();
  }, [selectedPatientId]);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const normalized = medicines.map((medicine) => ({
      ...medicine,
      total_stock: Number(medicine?.stock_quantity || 0),
      selling_price: Number(medicine?.unit_price || 0),
      generic_name: medicine?.category || medicine?.generic_name || "",
      isExpired: medicine?.expiry_date ? new Date(medicine.expiry_date) < new Date(new Date().toDateString()) : false,
    }));

    if (!term) return normalized;

    return normalized.filter((medicine) =>
      [
        medicine?.name,
        medicine?.sku,
        medicine?.category,
        medicine?.generic_name,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [medicines, query]);

  const recentItems = useMemo(() => {
    return recentOrders.slice(0, 8).map((order, index) => ({
      id: order?.id || index,
      description: order?.medicine_name || "Recorded pharmacy order",
      quantity: Number(order?.quantity || 0),
      lineTotal: Number(order?.total_amount || 0),
      createdAt: order?.created_at || order?.order_date || null,
    }));
  }, [recentOrders]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => String(patient?.id || "") === String(selectedPatientId || "")) || null,
    [patients, selectedPatientId]
  );

  const selectedPrescription = useMemo(
    () => prescriptions.find((entry) => String(entry.id) === String(selectedPrescriptionId)) || null,
    [prescriptions, selectedPrescriptionId]
  );

  const searchMedicines = (value) => {
    setQuery(value);
  };

  const openBatchModal = (medicine) => {
    if (medicine?.isExpired) {
      setFeedback({ type: "error", text: `${medicine.name} is expired and cannot be dispensed.` });
      return;
    }

    if (Number(medicine?.stock_quantity || 0) <= 0) {
      setFeedback({ type: "error", text: `${medicine.name} is out of stock.` });
      return;
    }

    setSelectedMedicine(medicine);
    setBatches([
      {
        id: medicine.id,
        batch_no: medicine.sku || `MED-${medicine.id}`,
        selling_price: Number(medicine.unit_price || 0),
        expiry_date: medicine.expiry_date || null,
        quantity: Number(medicine.stock_quantity || 0),
        isExpired: Boolean(medicine.isExpired),
      },
    ]);
    setShowBatchModal(true);
  };

  const addToCart = (medicine, batch, qty) => {
    if (!medicine || !batch) return;

    const quantity = Math.max(1, Number(qty || 1));
    if (batch.isExpired) {
      setFeedback({ type: "error", text: `${medicine.name} is expired and cannot be dispensed.` });
      return;
    }
    if (Number(batch.quantity || 0) < quantity) {
      setFeedback({ type: "error", text: `${medicine.name} has insufficient stock.` });
      return;
    }
    const item = {
      id: medicine.id,
      name: medicine.name,
      batch_no: batch.batch_no,
      qty: quantity,
      unitPrice: Number(batch.selling_price || medicine.unit_price || 0),
      gst: 0,
      availableStock: Number(batch.quantity || medicine.stock_quantity || 0),
      expiry_date: batch.expiry_date || medicine.expiry_date || null,
    };

    setCart((current) => {
      const existing = current.find((entry) => entry.id === item.id && entry.batch_no === item.batch_no);
      if (!existing) return [...current, item];

      return current.map((entry) =>
        entry.id === item.id && entry.batch_no === item.batch_no
          ? { ...entry, qty: entry.qty + quantity }
          : entry
      );
    });

    setShowBatchModal(false);
    setFeedback(null);
  };

  const importPrescriptionToCart = () => {
    if (!selectedPrescription) {
      setFeedback({ type: "error", text: "No prescription available for this patient." });
      return;
    }

    const nextItems = [];
    const issues = [];

    selectedPrescription.items.forEach((item) => {
      const medicine = medicines.find((entry) => String(entry.id) === String(item.medicine_id));
      if (!medicine) {
        issues.push(`${item.medicine_name} not found in inventory`);
        return;
      }
      const expired = medicine.expiry_date ? new Date(medicine.expiry_date) < new Date(new Date().toDateString()) : false;
      if (expired) {
        issues.push(`${medicine.name} is expired`);
        return;
      }
      if (Number(medicine.stock_quantity || 0) < Number(item.quantity || 0)) {
        issues.push(`${medicine.name} has insufficient stock`);
        return;
      }
      nextItems.push({
        id: medicine.id,
        name: medicine.name,
        batch_no: medicine.sku || `MED-${medicine.id}`,
        qty: Number(item.quantity || 1),
        unitPrice: Number(medicine.unit_price || 0),
        gst: 0,
        availableStock: Number(medicine.stock_quantity || 0),
        expiry_date: medicine.expiry_date || null,
      });
    });

    if (issues.length) {
      setFeedback({ type: "error", text: issues[0] });
      return;
    }

    setCart(nextItems);
    setFeedback({ type: "success", text: "Prescription imported into the dispense cart." });
  };

  const beginCheckout = () => {
    if (!cart.length) {
      setFeedback({ type: "error", text: "Add at least one medicine before checkout." });
      return;
    }
    if (!selectedPatientId) {
      setFeedback({ type: "error", text: "Select a patient before recording the pharmacy order." });
      return;
    }
    if (cart.some((item) => item.expiry_date && new Date(item.expiry_date) < new Date(new Date().toDateString()))) {
      setFeedback({ type: "error", text: "Expired medicines cannot be dispensed." });
      return;
    }
    if (cart.some((item) => Number(item.availableStock || 0) < Number(item.qty || 0))) {
      setFeedback({ type: "error", text: "One or more medicines have insufficient stock." });
      return;
    }
    setShowPaymentModal(true);
  };

  const handlePayment = async (method) => {
    setShowPaymentModal(false);
    setFeedback(null);

    try {
      const response = await apiPost("/api/pharmacy/orders", {
        patient_id: selectedPatientId,
        prescription_id: selectedPrescriptionId || null,
        items: cart.map((item) => ({
          medicine_id: item.id,
          quantity: item.qty,
        })),
        payment_method: method,
        discount_amount: Number(discountAmount || 0),
        gst_percent: Number(gstPercent || 0),
      });

      setInvoiceResult(response?.data || response || null);
      setFeedback({ type: "success", text: "Pharmacy order recorded successfully." });
      setCart([]);
      await loadPageData();
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", text: error?.message || "Unable to save pharmacy order." });
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const discountValue = Math.max(0, Number(discountAmount || 0));
  const taxableBase = Math.max(subtotal - discountValue, 0);
  const taxAmount = (taxableBase * Math.max(0, Number(gstPercent || 0))) / 100;
  const orderTotal = taxableBase + taxAmount;

  return (
    <div className={pageShell}>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-cyan-800 to-sky-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(14,165,233,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">Pharmacy Billing</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Dispense and record medicines</h1>
              <p className="mt-3 text-sm text-cyan-50 md:text-base">
                Search medicines, add them to the dispense cart, and record pharmacy orders against the current stock.
              </p>
            </div>
            <div className="rounded-2xl bg-white/12 px-4 py-3 text-sm text-cyan-50">
              {loading ? "Loading pharmacy records..." : `${medicines.length} medicines available`}
            </div>
          </div>
        </section>

        {feedback ? (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm ${
              feedback.type === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.text}
          </section>
        ) : null}

        <section className="space-y-6">
          <div className={surfaceCard}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Step 1</p>
                <h2 className="text-xl font-semibold text-slate-900">Select patient</h2>
                <p className="mt-1 text-sm text-slate-500">Choose the patient first so this dispense record is saved against the right patient history.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {patients.length} patient(s)
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.95fr]">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Patient</label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-500"
                >
                  <option value="">Select patient</option>
                  {patients.map((patient) => (
                    <option
                      key={patient?.id}
                      value={patient?.id}
                    >
                      {(patient?.name || patient?.full_name || "Patient")} ({patient?.patient_id || patient?.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Selected patient</p>
                {selectedPatient ? (
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p className="text-lg font-semibold text-slate-900">
                      {selectedPatient.name || selectedPatient.full_name || "Patient"}
                    </p>
                    <p>Patient ID: {selectedPatient.patient_id || selectedPatient.id || "--"}</p>
                    <p>Mobile: {selectedPatient.mobile || selectedPatient.phone || "--"}</p>
                    <p>Email: {selectedPatient.email || "--"}</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Choose a patient to connect this dispense record to the patient history.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prescription fetch</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Load a structured patient prescription into the dispense cart when available.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {prescriptions.length} prescription(s)
                </span>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                <select
                  value={selectedPrescriptionId}
                  onChange={(e) => setSelectedPrescriptionId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-cyan-500"
                >
                  <option value="">Select prescription</option>
                  {prescriptions.map((prescription) => (
                    <option key={prescription.id} value={prescription.id}>
                      Prescription #{prescription.id} - {prescription.items.length} item(s)
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={importPrescriptionToCart}
                  disabled={!selectedPrescription}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Import Prescription
                </button>
              </div>

              {selectedPrescription ? (
                <div className="mt-4 space-y-2 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                  {selectedPrescription.image_url ? (
                    <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Prescription image</p>
                      <a
                        href={`${API_URL}${selectedPrescription.image_url}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 block"
                      >
                        <img
                          src={`${API_URL}${selectedPrescription.image_url}`}
                          alt="Prescription"
                          className="max-h-72 w-full rounded-2xl object-contain"
                        />
                      </a>
                    </div>
                  ) : null}
                  {selectedPrescription.items.map((item) => (
                    <div key={`${selectedPrescription.id}-${item.medicine_id}`} className="flex items-center justify-between gap-4">
                      <span>{item.medicine_name}</span>
                      <span>
                        Qty: {item.quantity} · Stock: {item.stock_quantity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={surfaceCard}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Step 2</p>
            <h2 className="text-xl font-semibold text-slate-900">Search medicine</h2>
            <p className="mt-1 text-sm text-slate-500">Search by medicine name, SKU, or category, then open the medicine to choose quantity.</p>
            <div className="mt-4">
              <SearchBar onSearch={searchMedicines} />
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Step 3</p>
                <h2 className="text-xl font-semibold text-slate-900">Medicine results</h2>
                <p className="text-sm text-slate-500">Select a medicine, confirm quantity, and add it to the dispense cart.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {results.length} result(s)
              </span>
            </div>
            <div className="mt-5">
              <MedicineList results={results} onSelect={openBatchModal} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className={surfaceCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Step 4</p>
              <h2 className="text-xl font-semibold text-slate-900">Dispense cart</h2>
              <p className="mt-1 text-sm text-slate-500">Review the medicines you plan to issue. Remove anything incorrect before checkout.</p>
              <div className="mt-5">
                <CartPanel cart={cart} setCart={setCart} />
              </div>
            </div>

            <div className="space-y-6">
              <div className={surfaceCard}>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Step 5</p>
                <div className="mb-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>Discount amount</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700">
                    <span>GST %</span>
                    <input
                      type="number"
                      min="0"
                      value={gstPercent}
                      onChange={(e) => setGstPercent(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
                    />
                  </label>
                </div>
                <InvoiceSummary
                  cart={cart}
                  totals={{
                    subtotal,
                    discountAmount: discountValue,
                    taxAmount,
                    totalAmount: orderTotal,
                  }}
                  onComplete={beginCheckout}
                />
                <p className="mt-4 text-sm text-slate-500">
                  Click <span className="font-semibold text-slate-700">Checkout</span> to choose payment method and record the dispense.
                </p>
              </div>

              <div className={surfaceCard}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Recent recorded orders</h3>
                    <p className="text-sm text-slate-500">Latest pharmacy entries from the current database.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {recentItems.length} item(s)
                  </span>
                </div>

                {recentItems.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    No pharmacy orders recorded yet.
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                          <th className="px-4 py-3 font-semibold">Medicine</th>
                          <th className="px-4 py-3 font-semibold">Qty</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentItems.map((item) => (
                          <tr key={item.id} className="border-b border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-900">{item.description}</td>
                            <td className="px-4 py-3 text-slate-700">{item.quantity}</td>
                            <td className="px-4 py-3 text-slate-700">{formatCurrency(item.lineTotal)}</td>
                            <td className="px-4 py-3 text-slate-500">
                              {item.createdAt ? new Date(item.createdAt).toLocaleDateString("en-IN") : "--"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            <p className="text-sm text-slate-500">Cart items</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{cart.length}</p>
          </div>
          <div className="rounded-[24px] border border-cyan-100 bg-cyan-50/95 p-5 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.28)]">
            <p className="text-sm text-cyan-700">Current order total</p>
            <p className="mt-2 text-3xl font-bold text-cyan-900">{formatCurrency(orderTotal)}</p>
          </div>
          <div className="rounded-[24px] border border-amber-100 bg-amber-50/95 p-5 shadow-[0_18px_50px_-24px_rgba(245,158,11,0.28)]">
            <p className="text-sm text-amber-700">Low stock medicines</p>
            <p className="mt-2 text-3xl font-bold text-amber-900">{lowStockItems.length}</p>
          </div>
        </section>

        <section className="rounded-[24px] border border-sky-100 bg-sky-50/90 p-5 text-sm text-sky-900 shadow-[0_18px_50px_-24px_rgba(14,165,233,0.18)]">
          <p className="font-semibold">How to use this page</p>
          <p className="mt-2">
            Select a patient, optionally fetch a prescription, review stock and expiry, add medicines, apply discount and GST, then checkout to save the dispense and generate an invoice.
          </p>
        </section>

        <section className={surfaceCard}>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Inventory handoff</h2>
              <p className="mt-1 text-sm text-slate-500">This dispense screen now reflects live low-stock items from inventory so the pharmacist can catch supply risk while issuing medicines.</p>
            </div>
            <Link
              href="/inventory"
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Open inventory
            </Link>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
              No low-stock alerts from inventory right now.
            </div>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lowStockItems.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.name || "Inventory item"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        SKU: {item.sku || "--"} · Category: {item.category || "--"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700">
                      {item.quantity || 0} left
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-amber-800">
                    Reorder level: {item.reorder_level || 0} {item.unit || "unit(s)"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-white/70 bg-white/95 p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)]">
            <p className="text-sm text-slate-500">Attached patient</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {selectedPatient ? selectedPatient.name || selectedPatient.full_name || "Patient selected" : "Not selected"}
            </p>
          </div>
        </section>

        {invoiceResult?.invoice ? (
          <section className={surfaceCard}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Invoice preview</h2>
                <p className="text-sm text-slate-500">Clean invoice summary from the latest pharmacist checkout.</p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                {invoiceResult.invoice.invoice_number}
              </span>
            </div>

            <div className="mt-5 space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Patient ID</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{invoiceResult.invoice.patient_id || "--"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Method</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-slate-900">{invoiceResult.invoice.payment_method || "--"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Issued At</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {invoiceResult.invoice.issued_at ? new Date(invoiceResult.invoice.issued_at).toLocaleString("en-IN") : "--"}
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Grand Total</p>
                  <p className="mt-2 text-lg font-bold text-emerald-900">{formatCurrency(invoiceResult.invoice.total_amount || 0)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3 font-semibold">Medicine</th>
                      <th className="px-4 py-3 font-semibold">Qty</th>
                      <th className="px-4 py-3 font-semibold">Unit Price</th>
                      <th className="px-4 py-3 font-semibold">Expiry</th>
                      <th className="px-4 py-3 font-semibold">Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoiceResult.invoice.items || []).map((item, index) => (
                      <tr key={`${item.medicine_id || "medicine"}-${index}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.medicine_name || "Medicine"}</td>
                        <td className="px-4 py-3 text-slate-700">{item.quantity || 0}</td>
                        <td className="px-4 py-3 text-slate-700">{formatCurrency(item.unit_price || 0)}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString("en-IN") : "--"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{formatCurrency(item.line_total || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Subtotal</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(invoiceResult.invoice.subtotal || 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Discount</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(invoiceResult.invoice.discount_amount || 0)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Tax</p>
                  <p className="mt-2 text-xl font-semibold text-slate-900">{formatCurrency(invoiceResult.invoice.tax_amount || 0)}</p>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {showBatchModal ? (
        <BatchModal
          medicine={selectedMedicine}
          batches={batches}
          onAdd={addToCart}
          onClose={() => setShowBatchModal(false)}
        />
      ) : null}

      {showPaymentModal ? (
        <PaymentModal total={orderTotal} onPay={handlePayment} onClose={() => setShowPaymentModal(false)} />
      ) : null}
    </div>
  );
}
