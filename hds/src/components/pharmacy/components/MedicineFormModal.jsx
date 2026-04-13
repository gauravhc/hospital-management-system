"use client";

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500";

export default function MedicineFormModal({
  open,
  mode = "add",
  values,
  errors = {},
  submitting = false,
  onChange,
  onSubmit,
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Pharmacy Stock</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">
              {mode === "edit" ? "Edit medicine" : "Add medicine"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Record medicine stock carefully so the pharmacist team sees the right quantity, batch, and expiry state.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Medicine name"
              name="name"
              value={values.name}
              error={errors.name}
              onChange={onChange}
            />
            <Field
              label="Batch number"
              name="batchNumber"
              value={values.batchNumber}
              error={errors.batchNumber}
              onChange={onChange}
            />
            <Field
              label="Quantity"
              name="quantity"
              type="number"
              min="0"
              value={values.quantity}
              error={errors.quantity}
              onChange={onChange}
            />
            <Field
              label="Price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={values.price}
              error={errors.price}
              onChange={onChange}
            />
            <Field
              label="Expiry date"
              name="expiryDate"
              type="date"
              value={values.expiryDate}
              error={errors.expiryDate}
              onChange={onChange}
            />
            <Field
              label="Reorder level"
              name="reorderLevel"
              type="number"
              min="0"
              value={values.reorderLevel}
              error={errors.reorderLevel}
              onChange={onChange}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Supplier</label>
            <input
              name="supplier"
              value={values.supplier}
              onChange={onChange}
              placeholder="Optional supplier name"
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
            >
              {submitting ? "Saving..." : mode === "edit" ? "Save changes" : "Add medicine"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, error, ...props }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      <input {...props} className={inputClass} />
      {error ? <p className="mt-2 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
