"use client";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  const toneClass =
    tone === "danger"
      ? "bg-rose-600 hover:bg-rose-700"
      : "bg-sky-600 hover:bg-sky-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
      <div className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)]">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition ${toneClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
