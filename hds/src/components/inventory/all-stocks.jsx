"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/services/api";

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

export default function ViewStockPage() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const loadBatches = async () => {
      setLoading(true);
      setFeedback("");
      try {
        const response = await apiGet("/api/inventory/batches");
        const list = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
          ? response
          : [];
        setBatches(list);
      } catch (error) {
        console.error("Batch load error:", error);
        setBatches([]);
        setFeedback(error?.message || "Unable to load stock batches.");
      } finally {
        setLoading(false);
      }
    };

    loadBatches();
  }, []);

  const visibleBatches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return batches;

    return batches.filter((batch) =>
      [
        batch?.item_name,
        batch?.item_sku,
        batch?.batch_code,
        batch?.supplier_name,
        batch?.location,
        batch?.shelf,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [batches, search]);

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock batch history</h1>
          <p className="mt-1 text-sm text-slate-500">Review each received stock batch along with current inventory quantity.</p>
        </div>

        <div className="w-full md:max-w-sm">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search item, batch code, supplier, location"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>
      </div>

      {feedback ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {feedback}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-slate-600">
              <th className="p-3 font-semibold">Item</th>
              <th className="p-3 font-semibold">Batch Code</th>
              <th className="p-3 font-semibold">Qty Added</th>
              <th className="p-3 font-semibold">Current Qty</th>
              <th className="p-3 font-semibold">Unit Cost</th>
              <th className="p-3 font-semibold">Supplier</th>
              <th className="p-3 font-semibold">Received</th>
              <th className="p-3 font-semibold">Expiry</th>
              <th className="p-3 font-semibold">Location</th>
              <th className="p-3 font-semibold">Shelf</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" className="p-5 text-center text-slate-500">
                  Loading stock batches...
                </td>
              </tr>
            ) : visibleBatches.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-5 text-center text-slate-500">
                  No stock batches recorded yet.
                </td>
              </tr>
            ) : (
              visibleBatches.map((batch, index) => (
                <tr
                  key={batch?.id || `${batch?.item_id || "item"}-${batch?.batch_code || "batch"}-${index}`}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{batch?.item_name || "Inventory item"}</div>
                    <div className="text-xs text-slate-500">{batch?.item_sku || "--"}</div>
                  </td>
                  <td className="p-3 text-slate-600">{batch?.batch_code || "--"}</td>
                  <td className="p-3 font-semibold text-slate-900">{batch?.quantity_added || 0}</td>
                  <td className="p-3 text-slate-600">{batch?.current_quantity || 0}</td>
                  <td className="p-3 text-slate-600">{formatCurrency(batch?.unit_cost || 0)}</td>
                  <td className="p-3 text-slate-600">{batch?.supplier_name || "--"}</td>
                  <td className="p-3 text-slate-600">{batch?.received_date || "--"}</td>
                  <td className="p-3 text-slate-600">{batch?.expiry_date || "--"}</td>
                  <td className="p-3 text-slate-600">{batch?.location || "--"}</td>
                  <td className="p-3 text-slate-600">{batch?.shelf || "--"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
