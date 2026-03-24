// InventoryAnalyticsProWithDrawerTheme.jsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart, Area, Line, CartesianGrid, XAxis, YAxis, Tooltip,
  BarChart, Bar, Cell, PieChart, Pie, Legend,
  ComposedChart, ReferenceLine,
} from "recharts";
import { apiGet } from "@/services/api";
import { API_URL } from "@/services/api"; // Keeping API_URL if used elsewhere or remove it if not needed. It was imported from config/api before which might be wrong based on services/api exists. 

/**
 * InventoryAnalyticsProWithDrawerTheme.jsx
 * - Same data logic & API calls as before, UI updated with a modern color theme
 * - Palette: Indigo (primary), Teal (accent), Warm Orange (highlight), Soft neutrals
 * - Uses Tailwind classes — keep Tailwind in your project for styles to apply
 */

// theme colors (for convenience in JSX)
const THEME = {
  primary: "#4f46e5",    // indigo
  accent: "#06b6d4",     // teal
  highlight: "#f59e0b",  // warm orange
  success: "#10b981",    // green
  danger: "#ef4444",     // red
  surface: "#ffffff",
  muted: "#6b7280",
  pageBgStart: "#fbfbff",
  pageBgEnd: "#f1f5f9",
};

const COLORS = [THEME.primary, THEME.accent, THEME.danger, THEME.highlight, THEME.success, "#a78bfa", "#f97316", "#60a5fa"];

// currency formatter (INR)
const formatCurrency = (v) =>
  `₹${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function movingAverage(data = [], key = "total", window = 3) {
  if (!Array.isArray(data) || data.length === 0) return [];
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - (window - 1)), i + 1);
    const sum = slice.reduce((s, r) => s + Number(r[key] || 0), 0);
    return { ...d, ma: Number((sum / slice.length).toFixed(2)) };
  });
}

function computeABC(items = []) {
  const rows = (items || []).slice().map(r => ({ name: r.itemName || r.name || "Unknown", annualValue: Number(r.annualValue || r.value || 0) }));
  const total = rows.reduce((s, r) => s + r.annualValue, 0) || 1;
  const sorted = rows.sort((a, b) => b.annualValue - a.annualValue);
  let cum = 0;
  const summary = sorted.map((r) => {
    cum += r.annualValue;
    const pct = (r.annualValue / total) * 100;
    const cumPct = (cum / total) * 100;
    return { ...r, pct, cumPct };
  });
  const A = summary.filter(s => s.cumPct <= 80);
  const B = summary.filter(s => s.cumPct > 80 && s.cumPct <= 95);
  const C = summary.filter(s => s.cumPct > 95);
  return { A, B, C, summary, total };
}

function aggregateTopN(rows = [], topN = 6) {
  if (!Array.isArray(rows)) return [];
  const sorted = rows.slice().sort((a, b) => (b.value || 0) - (a.value || 0));
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const othersValue = rest.reduce((s, r) => s + (Number(r.value) || 0), 0);
  const result = top.map(r => ({ name: r.itemName || r.item || r.name || "Unknown", value: Number(r.value) || 0 }));
  if (othersValue > 0) result.push({ name: "Others", value: othersValue });
  return result;
}

/* ----- AccordionSection component (unchanged functionality) ----- */
function AccordionSection({ id, title, count = 0, color = "text-gray-700", items = [], formatCurrency }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!open) return [];
    if (!q) return items;
    const qq = q.trim().toLowerCase();
    return items.filter(it => (it.name || it.itemName || "").toLowerCase().includes(qq));
  }, [open, q, items]);

  return (
    <div className="border border-gray-100 rounded bg-white/80">
      <button
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <div>
          <div className="flex items-baseline gap-3">
            <span className={`text-sm font-medium ${color}`}>{title}</span>
            <span className="text-xs text-gray-500">· {count} items</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Click to {open ? "collapse" : "expand"}</div>
        </div>

        <div className="flex items-center gap-3">
          <svg className={`w-5 h-5 transform transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </div>
      </button>

      <div id={id} role="region" aria-labelledby={id} className={`px-4 pb-4 ${open ? "block" : "hidden"}`}>
        <div className="mt-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search items..."
            className="w-full border rounded px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <div className="mt-3 max-h-48 overflow-auto pr-2">
          {filtered.length === 0 ? (
            <div className="text-sm text-gray-500">
              {q ? "No items match your search." : "No items to display."}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((item, idx) => (
                <li key={`${id}-${idx}`} className="flex items-center justify-between text-sm">
                  <div className="truncate pr-4">
                    <div className="font-medium text-gray-800">{item.name || item.itemName || item.item || "Unnamed Item"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.extraInfo ? item.extraInfo : ""}</div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-sm font-semibold text-gray-900">{formatCurrency(item.annualValue || item.value || 0)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----- ABC Drawer Component (themed) ----- */
function ABCDrawer({ open, onClose, abc, formatCurrency }) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      {/* drawer */}
      <aside
        className={`fixed right-0 top-0 h-full w-full sm:w-[480px] bg-gradient-to-b from-white to-gray-50 shadow-2xl transform transition-transform z-50
          ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "#eef2ff" }}>
          <h2 className="text-lg font-semibold" style={{ color: THEME.primary }}>ABC Classification</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded hover:bg-gray-100">
            ✕
          </button>
        </div>

        <div className="p-4 overflow-auto h-[calc(100%-64px)]">
          <div className="mb-3 text-sm text-gray-600">
            <strong className="text-green-700">A:</strong> {abc.A.length} · <strong className="text-yellow-700">B:</strong> {abc.B.length} · <strong className="text-blue-700">C:</strong> {abc.C.length}
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-green-700 mb-2">A Items (High Value)</h3>
              <div className="border rounded p-2 max-h-48 overflow-auto bg-white shadow-sm">
                <AccordionSection id="drawer-A" title="" count={abc.A.length} color="text-green-700" items={abc.A} formatCurrency={formatCurrency} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-yellow-700 mb-2">B Items (Medium Value)</h3>
              <div className="border rounded p-2 max-h-48 overflow-auto bg-white shadow-sm">
                <AccordionSection id="drawer-B" title="" count={abc.B.length} color="text-yellow-700" items={abc.B} formatCurrency={formatCurrency} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-blue-700 mb-2">C Items (Low Value)</h3>
              <div className="border rounded p-2 max-h-48 overflow-auto bg-white shadow-sm">
                <AccordionSection id="drawer-C" title="" count={abc.C.length} color="text-blue-700" items={abc.C} formatCurrency={formatCurrency} />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ----- Main Dashboard Component (themed) ----- */
export default function InventoryAnalyticsProWithDrawerTheme() {
  const [monthlyRaw, setMonthlyRaw] = useState([]);
  const [topRaw, setTopRaw] = useState([]);
  const [stockValue, setStockValue] = useState({ rows: [], total: 0 });
  const [expiryRaw, setExpiryRaw] = useState([]);
  const [itemsRaw, setItemsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  // UI state
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function fetchAll() {
      setLoading(true); setError("");
      try {
        const endpoints = [
          { k: "monthly", u: process.env.NEXT_PUBLIC_INVENTORY_ANALYTICS_MONTHLY_API },
          { k: "top", u: process.env.NEXT_PUBLIC_INVENTORY_ANALYTICS_TOP_API, params: { limit: 50 } },
          { k: "value", u: process.env.NEXT_PUBLIC_INVENTORY_ANALYTICS_VALUE_API },
          { k: "expiry", u: process.env.NEXT_PUBLIC_INVENTORY_ANALYTICS_EXPIRY_API, params: { days: 90 } },
          { k: "items", u: process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API },
        ];
        const results = {};
        for (const ep of endpoints) {
          try {
            const data = await apiGet(ep.u, ep.params || {});
            results[ep.k] = data;
          } catch (e) {
            console.warn("Fetch error", ep.u, e);
            results[ep.k] = null;
          }
        }

        if (!mounted) return;
        setMonthlyRaw(Array.isArray(results.monthly) ? results.monthly : []);
        setTopRaw(Array.isArray(results.top) ? results.top : []);
        setStockValue(results.value && results.value.rows ? { rows: results.value.rows, total: results.value.total || 0 } : { rows: [], total: 0 });
        setExpiryRaw(Array.isArray(results.expiry) ? results.expiry : []);
        setItemsRaw(Array.isArray(results.items) ? results.items : []);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Failed to load analytics.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAll();
    return () => { mounted = false; };
  }, []);

  const monthly = useMemo(() => {
    const arr = (monthlyRaw || []).map(r => ({
      month: r.month || r.label || r.name || "",
      total: Number(r.total || r.value || 0),
    }));
    const hasIso = arr.every(a => /^\d{4}-\d{2}/.test(a.month));
    const sorted = hasIso ? arr.slice().sort((a, b) => a.month.localeCompare(b.month)) : arr;
    return movingAverage(sorted, "total", 3);
  }, [monthlyRaw]);

  const topItems = useMemo(() => {
    return (topRaw || []).map(r => ({
      itemId: r.itemId ?? r.id ?? null,
      name: r.medicineName || r.itemName || r.name || `#${r.itemId ?? r.id ?? "?"}`,
      value: Number(r.totalSold ?? r.total ?? r.value ?? 0),
    })).sort((a, b) => b.value - a.value);
  }, [topRaw]);

  const abc = useMemo(() => {
    const rows = (stockValue.rows || []).map(r => ({ itemName: r.itemName || r.name || `#${r.itemId}`, annualValue: Number(r.value || 0) * 12 }));
    if (rows.length === 0 && topItems.length > 0) {
      return computeABC(topItems.map(t => ({ itemName: t.name, annualValue: t.value * 12 })));
    }
    return computeABC(rows);
  }, [stockValue.rows, topItems]);

  const fastSlow = useMemo(() => {
    const rows = (topItems || []).map(t => ({ name: t.name, velocity: Number(t.value || 0) }));
    if (rows.length === 0) return { fast: [], slow: [], moderate: [], rows: [] };
    const sorted = rows.slice().sort((a, b) => b.velocity - a.velocity);
    const n = sorted.length;
    const fastCount = Math.max(1, Math.round(n * 0.2));
    const moderateCount = Math.round(n * 0.3);
    const fast = sorted.slice(0, fastCount);
    const moderate = sorted.slice(fastCount, fastCount + moderateCount);
    const slow = sorted.slice(fastCount + moderateCount);
    return { fast, moderate, slow, rows: sorted };
  }, [topItems]);

  const expiryBuckets = useMemo(() => {
    const buckets = { d7: 0, d30: 0, d60: 0, later: 0, rows: [] };
    (expiryRaw || []).forEach(b => {
      const expiryDate = b.ExpirationDate ?? b.expiryDate ?? b.expiration_date ?? b.expiry;
      const qty = Number(b.QuantityOnHand ?? b.qty ?? b.quantity ?? 0);
      let daysLeft = null;
      if (expiryDate) {
        try {
          daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        } catch { daysLeft = null; }
      }
      const row = { itemName: b.itemName || b.name || "Unknown", qty, daysLeft: daysLeft ?? 999 };
      buckets.rows.push(row);
      if (daysLeft <= 7) buckets.d7 += qty;
      else if (daysLeft <= 30) buckets.d30 += qty;
      else if (daysLeft <= 60) buckets.d60 += qty;
      else buckets.later += qty;
    });
    return buckets;
  }, [expiryRaw]);

  const stockOut = useMemo(() => {
    const rows = (itemsRaw || []).map(i => ({
      id: i.id ?? i.itemId ?? null,
      name: i.name ?? i.ItemName ?? i.itemName ?? `#${i.id ?? "?"}`,
      qty: Number(i.qtyOnHand ?? i.quantity ?? i.QuantityOnHand ?? i.stock ?? 0),
      reorder: Number(i.reorderLevel ?? i.reorderQty ?? i.reorder_level ?? 0),
    }));
    const atRisk = rows.filter(r => {
      if (r.reorder === 0) return false;
      return r.qty <= r.reorder;
    });
    return { totalItems: rows.length, atRiskCount: atRisk.length, atRiskRows: atRisk };
  }, [itemsRaw]);

  const categoryBreakdown = useMemo(() => {
    const idToCat = {};
    (itemsRaw || []).forEach(it => {
      const id = it.id ?? it.itemId ?? null;
      const cat = it.category ?? it.Category ?? "Uncategorized";
      if (id != null) idToCat[id] = cat;
    });
    const agg = {};
    (stockValue.rows || []).forEach(r => {
      const id = r.itemId ?? r.id ?? null;
      const cat = id != null ? (idToCat[id] || "Uncategorized") : (r.category || r.Category || "Uncategorized");
      agg[cat] = (agg[cat] || 0) + Number(r.value || 0);
    });
    const out = Object.entries(agg).map(([category, value]) => ({ category, value }));
    out.sort((a, b) => b.value - a.value);
    const top = out.slice(0, 6);
    const rest = out.slice(6);
    const others = rest.reduce((s, r) => s + r.value, 0);
    if (others > 0) top.push({ category: "Others", value: others });
    return top;
  }, [stockValue.rows, itemsRaw]);

  const handleExport = () => {
    const base = API_URL || "";
    setExporting(true);
    try {
      window.open(`${base}/api/analytics/export`, "_blank");
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setExporting(false), 600);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${THEME.pageBgStart}, ${THEME.pageBgEnd})` }}>
        <div className="p-6 max-w-6xl mx-auto">
          <div className="animate-pulse h-8 w-72 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-40 bg-white/60 rounded shadow animate-pulse" />
            <div className="h-40 bg-white/60 rounded shadow animate-pulse" />
            <div className="h-40 bg-white/60 rounded shadow animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">{error}</div>;
  }

  // helper: KPI card wrapper with colored accent
  const KpiCard = ({ accent, title, value, subtitle }) => (
    <div className="flex items-stretch bg-white rounded-lg shadow-md overflow-hidden">
      <div style={{ width: 6, background: accent }} />
      <div className="p-4 flex-1">
        <div className="text-xs text-gray-500">{title}</div>
        <div className="text-2xl font-bold mt-1 text-gray-900">{value}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(180deg, ${THEME.pageBgStart}, ${THEME.pageBgEnd})` }}>
      {/* Sticky header with Export & ABC button */}
      <div className="sticky top-0 z-30" style={{ backdropFilter: "blur(6px)" }}>
        <div style={{ background: `linear-gradient(90deg, rgba(79,70,229,0.06), rgba(6,182,212,0.02))` }} className="border-b">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ background: `${THEME.primary}22` }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={THEME.primary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /></svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold" style={{ color: THEME.primary }}>Inventory Analytics — Pro</h1>
                  <p className="text-sm text-gray-600">Focused charts: ABC, expiry timeline, fast/slow movers, category value.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setDrawerOpen(true)}
                className="px-3 py-2 rounded bg-white border text-sm hover:shadow"
                title="Open ABC panel"
              >
                <span className="font-medium" style={{ color: THEME.primary }}>ABC</span>
              </button>

              <button
                onClick={handleExport}
                className="px-4 py-2 rounded bg-gradient-to-r from-indigo-600 to-teal-500 text-white text-sm hover:opacity-95"
              >
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard accent={THEME.primary} title="Total stock value" value={formatCurrency(stockValue.total || 0)} subtitle="Snapshot" />
          <KpiCard accent={THEME.accent} title="Items tracked" value={itemsRaw.length} subtitle="Inventory items" />
          <KpiCard accent={THEME.highlight} title="Batches expiring ≤30 days" value={expiryBuckets.d30} subtitle="Qty" />
          <KpiCard accent={THEME.danger} title="Stock-out risk" value={`${stockOut.atRiskCount}/${stockOut.totalItems}`} subtitle="Below reorder level" />
        </div>

        {/* Row with 3 columns: consumption, category, compact ABC summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1 - Monthly consumption */}
          <div className="bg-white rounded-lg shadow-md p-4" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Monthly consumption</h3>
              <div className="text-xs text-gray-500">with 3-month moving avg</div>
            </div>
            <div style={{ height: 260 }} className="mt-3">
              <ResponsiveContainer>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="maGradTheme" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.primary} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={THEME.primary} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#edf2ff" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#374151' }} />
                  <YAxis tick={{ fill: '#374151' }} />
                  <Tooltip wrapperStyle={{ borderRadius: 8 }} />
                  <Area type="monotone" dataKey="total" stroke={THEME.primary} fill="url(#maGradTheme)" fillOpacity={1} />
                  <Line type="monotone" dataKey="ma" stroke={THEME.danger} strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Column 2 - Category breakdown */}
          <div className="bg-white rounded-lg shadow-md p-4" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Stock value by category</h3>
              <div className="text-xs text-gray-500">top categories</div>
            </div>
            <div style={{ height: 260 }} className="mt-3">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="category" outerRadius={80} innerRadius={40} labelLine={false} label={false}>
                    {categoryBreakdown.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Column 3 - Compact ABC summary (button opens drawer) */}
          <div className="bg-white rounded-lg shadow-md p-4 flex flex-col justify-between" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-gray-800">ABC Classification</h3>
                <div className="text-xs text-gray-500">value-based</div>
              </div>

              <div style={{ height: 120 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={[
                      { group: "A", value: abc.A.reduce((s, r) => s + (r.annualValue || 0), 0) },
                      { group: "B", value: abc.B.reduce((s, r) => s + (r.annualValue || 0), 0) },
                      { group: "C", value: abc.C.reduce((s, r) => s + (r.annualValue || 0), 0) },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf2ff" />
                    <XAxis dataKey="group" tick={{ fill: '#374151' }} />
                    <YAxis tick={{ fill: '#374151' }} />
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                    <Bar dataKey="value" fill={THEME.success} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-600 mb-3">
                <strong className="text-green-700">A:</strong> {abc.A.length} · <strong className="text-yellow-700">B:</strong> {abc.B.length} · <strong className="text-blue-700">C:</strong> {abc.C.length}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDrawerOpen(true)} className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-teal-500 text-white rounded text-sm">Open ABC</button>
                <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="px-3 py-2 border rounded text-sm">Top</button>
              </div>
            </div>
          </div>
        </div>

        {/* Next rows: Top items & Fast/Slow movers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 lg:col-span-2" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Top issued items</h3>
              <div className="text-xs text-gray-500">last available window</div>
            </div>
            <div style={{ height: 320 }} className="mt-3">
              <ResponsiveContainer>
                <BarChart data={topItems.slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} tick={{ fill: '#374151' }} />
                  <YAxis tick={{ fill: '#374151' }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {topItems.slice(0, 12).map((entry, i) => <Cell key={`t-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Fast / Slow movers</h3>
              <div className="text-xs text-gray-500">velocity</div>
            </div>
            <div style={{ height: 320 }} className="mt-3">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={[
                  ...fastSlow.fast.map((r) => ({ name: r.name, value: r.velocity, type: "Fast" })),
                  ...fastSlow.moderate.map((r) => ({ name: r.name, value: r.velocity, type: "Moderate" })),
                  ...fastSlow.slow.map((r) => ({ name: r.name, value: r.velocity, type: "Slow" })),
                ].slice(0, 12)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fill: '#374151' }} />
                  <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#374151' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill={THEME.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 text-xs text-gray-500">
              <div><strong>Fast</strong>: top ~20%</div>
              <div><strong>Moderate</strong>: next ~30%</div>
              <div><strong>Slow</strong>: remainder</div>
            </div>
          </div>
        </div>

        {/* Expiry timeline & Stock-out risk */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-4 lg:col-span-2" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Expiry timeline (qty by bucket)</h3>
              <div className="text-xs text-gray-500">buckets: ≤7 / 8–30 / 31–60 / &gt;60 days</div>
            </div>
            <div style={{ height: 260 }} className="mt-3">
              <ResponsiveContainer>
                <ComposedChart
                  data={[
                    { label: "Expiry buckets", d7: expiryBuckets.d7, d30: expiryBuckets.d30, d60: expiryBuckets.d60, later: expiryBuckets.later }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fill: '#374151' }} />
                  <YAxis tick={{ fill: '#374151' }} />
                  <Tooltip />
                  <Bar dataKey="d7" stackId="a" fill={THEME.danger} name="≤7 days" />
                  <Bar dataKey="d30" stackId="a" fill={THEME.highlight} name="8–30 days" />
                  <Bar dataKey="d60" stackId="a" fill={THEME.success} name="31–60 days" />
                  <Bar dataKey="later" stackId="a" fill={THEME.primary} name=">60 days" />
                  <ReferenceLine x="Expiry buckets" stroke="#8884d8" strokeDasharray="3 3" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4" style={{ boxShadow: "0 6px 18px rgba(15,23,42,0.06)" }}>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Stock-out risk</h3>
              <div className="text-xs text-gray-500">items below reorder</div>
            </div>
            <div style={{ height: 220 }} className="mt-3 flex flex-col items-center">
              <div style={{ width: 180, height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "At risk", value: stockOut.atRiskCount },
                        { name: "Safe", value: Math.max(0, stockOut.totalItems - stockOut.atRiskCount) }
                      ]}
                      dataKey="value"
                      innerRadius={46}
                      outerRadius={80}
                      labelLine={false}
                      label={false}
                    >
                      <Cell fill={THEME.danger} />
                      <Cell fill={THEME.success} />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 text-sm">
                <div><strong>{stockOut.atRiskCount}</strong> at risk</div>
                <div className="text-xs text-gray-500">{stockOut.totalItems} items monitored</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer for ABC */}
      <ABCDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} abc={abc} formatCurrency={formatCurrency} />
    </div>
  );
}
