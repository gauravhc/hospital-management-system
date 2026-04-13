"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/services/api";

export default function AddStockBatch() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({
    itemId: "",
    quantityToAdd: "",
    supplier: "",
    unitCost: "",
    reorderLevel: "",
    receivedDate: "",
    note: "",
  });

  useEffect(() => {
    const loadItems = async () => {
      setLoading(true);
      try {
        const data = await apiGet("/api/inventory/items");
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setItems(list);
      } catch (err) {
        console.error("Error loading items:", err);
        setItems([]);
        setFeedback(err?.message || "Unable to load inventory items.");
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(form.itemId)) || null,
    [items, form.itemId]
  );

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback("");

    if (!selectedItem) {
      setFeedback("Select an inventory item first.");
      return;
    }

    const addedQty = Math.max(0, Number(form.quantityToAdd || 0));
    if (!addedQty) {
      setFeedback("Enter a quantity to add.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        item_id: selectedItem.id,
        batch_code: `BATCH-${Date.now()}`,
        quantity_added: addedQty,
        supplier_name: form.supplier || selectedItem.supplier_name || null,
        received_date: form.receivedDate || null,
        unit_cost: form.unitCost !== "" ? Number(form.unitCost) : Number(selectedItem.unit_cost || 0),
        minimum_level: form.reorderLevel !== "" ? Number(form.reorderLevel) : Number(selectedItem.reorder_level || 0),
        note: form.note || null,
      };

      await apiPost("/api/inventory/batches", payload);
      setFeedback("Stock batch recorded successfully.");

      const refreshed = await apiGet("/api/inventory/items");
      const list = Array.isArray(refreshed?.data) ? refreshed.data : Array.isArray(refreshed) ? refreshed : [];
      setItems(list);
      setForm({
        itemId: "",
        quantityToAdd: "",
        supplier: "",
        unitCost: "",
        reorderLevel: "",
        receivedDate: "",
        note: "",
      });
    } catch (error) {
      console.error("Add stock error:", error);
      setFeedback(error?.message || "Failed to update stock.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto mt-6 max-w-3xl rounded-2xl bg-white p-6 shadow">
      <h1 className="text-center text-3xl font-bold text-purple-700">Add Stock</h1>
      <p className="mt-2 text-center text-sm text-slate-500">
        Select an existing inventory item and record a received stock batch against it.
      </p>

      {feedback ? (
        <div
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            feedback.toLowerCase().includes("success")
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          {feedback}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-6 text-center">Loading items...</p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="mb-1 block font-semibold">Select Item</label>
            <select
              name="itemId"
              required
              className="w-full rounded border p-2"
              value={form.itemId}
              onChange={handleChange}
            >
              <option value="">-- Select Item --</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku || item.id}) - Current stock: {item.quantity || 0}
                </option>
              ))}
            </select>
          </div>

          {selectedItem ? (
            <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current quantity</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedItem.quantity || 0}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current reorder level</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedItem.reorder_level || 0}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Current unit cost</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedItem.unit_cost || 0}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Supplier</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{selectedItem.supplier_name || "--"}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block font-semibold">Quantity to add</label>
              <input
                type="number"
                name="quantityToAdd"
                min="1"
                placeholder="Enter quantity"
                className="w-full rounded border p-2"
                value={form.quantityToAdd}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Supplier</label>
              <input
                type="text"
                name="supplier"
                placeholder="Optional supplier override"
                className="w-full rounded border p-2"
                value={form.supplier}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Unit cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                name="unitCost"
                placeholder="Optional updated unit cost"
                className="w-full rounded border p-2"
                value={form.unitCost}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Reorder level</label>
              <input
                type="number"
                min="0"
                name="reorderLevel"
                placeholder="Optional updated reorder level"
                className="w-full rounded border p-2"
                value={form.reorderLevel}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Received date</label>
              <input
                type="date"
                name="receivedDate"
                className="w-full rounded border p-2"
                value={form.receivedDate}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold">Notes</label>
              <input
                type="text"
                name="note"
                placeholder="Optional receipt note"
                className="w-full rounded border p-2"
                value={form.note}
                onChange={handleChange}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-purple-700 py-3 text-lg text-white hover:bg-purple-800 disabled:bg-purple-300"
          >
            {submitting ? "Recording..." : "Add Stock Batch"}
          </button>
        </form>
      )}
    </div>
  );
}
