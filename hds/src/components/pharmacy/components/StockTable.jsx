"use client";

import formatCurrency from "@/utils/formatCurrency";

const rowTone = {
  expired: "bg-rose-50/90",
  low: "bg-amber-50/90",
  expiring: "bg-orange-50/90",
  normal: "bg-white",
};

const badgeTone = {
  expired: "bg-rose-100 text-rose-700",
  low: "bg-amber-100 text-amber-700",
  expiring: "bg-orange-100 text-orange-700",
  normal: "bg-emerald-100 text-emerald-700",
};

export default function StockTable({
  medicines,
  reorderDrafts,
  onReorderDraftChange,
  onReorderSave,
  onQuickAdjust,
  onEdit,
  onDelete,
  loadingActionId,
  getStatusMeta,
}) {
  if (!medicines.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-12 text-center text-sm text-slate-500">
        No medicines matched the current search or filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1100px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <th className="px-4 py-3 font-semibold">Name</th>
            <th className="px-4 py-3 font-semibold">Batch</th>
            <th className="px-4 py-3 font-semibold">Quantity</th>
            <th className="px-4 py-3 font-semibold">Price</th>
            <th className="px-4 py-3 font-semibold">Expiry date</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Reorder level</th>
            <th className="px-4 py-3 font-semibold">Quick actions</th>
          </tr>
        </thead>
        <tbody>
          {medicines.map((medicine) => {
            const id = medicine._id || medicine.id;
            const meta = getStatusMeta(medicine);
            const quantity = Number(medicine.quantity ?? medicine.stock_quantity ?? 0);
            const expiryDate = medicine.expiryDate || medicine.expiry_date || null;
            const reorderValue = reorderDrafts[id] ?? medicine.reorderLevel ?? medicine.reorder_level ?? 0;

            return (
              <tr key={id} className={`border-b border-slate-100 align-top ${rowTone[meta.tone] || rowTone.normal}`}>
                <td className="px-4 py-4">
                  <div className="font-semibold text-slate-900">{medicine.name || "--"}</div>
                  {medicine.supplier || medicine.category ? (
                    <div className="mt-1 text-xs text-slate-500">{medicine.supplier || medicine.category}</div>
                  ) : null}
                </td>
                <td className="px-4 py-4 font-medium text-slate-700">{medicine.batchNumber || medicine.sku || "--"}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span className="min-w-10 font-semibold text-slate-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(medicine, -1)}
                      disabled={loadingActionId === `stock-${id}` || quantity <= 0}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onQuickAdjust(medicine, 1)}
                      disabled={loadingActionId === `stock-${id}`}
                      className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
                    >
                      +1
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {formatCurrency(medicine.price ?? medicine.unit_price ?? 0)}
                </td>
                <td className="px-4 py-4 text-slate-700">
                  {expiryDate ? new Date(expiryDate).toLocaleDateString("en-IN") : "--"}
                </td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeTone[meta.tone] || badgeTone.normal}`}>
                    {meta.label}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={reorderValue}
                      onChange={(e) => onReorderDraftChange(id, e.target.value)}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => onReorderSave(medicine)}
                      disabled={loadingActionId === `reorder-${id}`}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(medicine)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(medicine)}
                      className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
