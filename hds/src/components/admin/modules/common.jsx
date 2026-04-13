"use client";

export function ModulePageShell({ title, description, feedback, children, className = "" }) {
  return (
    <div className={`space-y-6 ${className}`.trim()}>
      <div className="rounded-3xl border border-white/40 bg-white/95 p-6 shadow-xl">
        <h1 className="text-3xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{description}</p>
        {feedback ? (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm font-semibold ${
              feedback.type === "error"
                ? "bg-rose-50 text-rose-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {feedback.message}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function SectionCard({ title, description, children, className = "" }) {
  return (
    <section className={`rounded-3xl border border-white/40 bg-white/95 p-6 shadow-lg ${className}`.trim()}>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DataTable({ columns, rows, emptyMessage = "No records found." }) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-500">
            {columns.map((column) => (
              <th key={column.key} className="px-3 py-3 font-semibold">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((row, index) => (
              <tr key={row.id || index} className="border-b border-slate-100">
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-3 align-top text-slate-700">
                    {column.render ? column.render(row) : row[column.key] ?? "--"}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="px-3 py-6 text-center text-slate-500">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TextField({ label, name, value, onChange, type = "text", required = false, placeholder = "" }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400"
        name={name}
        value={value}
        onChange={onChange}
        type={type}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

export function SelectField({ label, name, value, onChange, options, required = false, placeholder = "Select an option" }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400"
        name={name}
        value={value}
        onChange={onChange}
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SubmitButton({ children, busy }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Saving..." : children}
    </button>
  );
}
