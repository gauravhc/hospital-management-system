"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import Link from "next/link";
import { apiGet } from "@/services/api";

const COLORS = ["#2563eb", "#0f766e", "#f59e0b", "#dc2626", "#7c3aed", "#16a34a"];
const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const pageShell =
  "min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.08),_transparent_32%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] p-4 md:p-6";
const pageContent = "mx-auto w-full max-w-7xl space-y-6";
const surfaceCard =
  "rounded-[28px] border border-white/70 bg-white/95 p-4 sm:p-6 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.28)] backdrop-blur";

export default function InventoryAnalytics() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setFeedback("");
      try {
        const [itemsRes, lowStockRes, batchesRes] = await Promise.all([
          apiGet("/api/inventory/items"),
          apiGet("/api/inventory/low-stock"),
          apiGet("/api/inventory/batches"),
        ]);

        setItems(Array.isArray(itemsRes?.data) ? itemsRes.data : Array.isArray(itemsRes) ? itemsRes : []);
        setLowStock(
          Array.isArray(lowStockRes?.data) ? lowStockRes.data : Array.isArray(lowStockRes) ? lowStockRes : []
        );
        setBatches(
          Array.isArray(batchesRes?.data) ? batchesRes.data : Array.isArray(batchesRes) ? batchesRes : []
        );
      } catch (error) {
        console.error("Inventory analytics load error:", error);
        setItems([]);
        setLowStock([]);
        setBatches([]);
        setFeedback(error?.message || "Unable to load inventory analytics.");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  const metrics = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const totalValue = items.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
      0
    );
    const recentBatchQty = batches.reduce((sum, batch) => sum + Number(batch.quantity_added || 0), 0);

    return {
      totalItems,
      totalUnits,
      totalValue,
      lowStockCount: lowStock.length,
      batchCount: batches.length,
      recentBatchQty,
    };
  }, [items, lowStock, batches]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const category = item.category || "Uncategorized";
      const value = Number(item.quantity || 0) * Number(item.unit_cost || 0);
      map.set(category, (map.get(category) || 0) + value);
    });

    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [items]);

  const topValueItems = useMemo(() => {
    return items
      .map((item) => ({
        name: item.name || "Inventory item",
        value: Number(item.quantity || 0) * Number(item.unit_cost || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const reorderRiskRows = useMemo(() => {
    return items
      .map((item) => ({
        name: item.name || "Inventory item",
        quantity: Number(item.quantity || 0),
        reorder: Number(item.reorder_level || 0),
      }))
      .filter((item) => item.reorder > 0)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 8);
  }, [items]);

  const batchTimeline = useMemo(() => {
    const grouped = new Map();

    batches.forEach((batch) => {
      const rawDate = batch.received_date || batch.created_at;
      const label = rawDate ? String(rawDate).slice(0, 10) : "Unknown";
      grouped.set(label, (grouped.get(label) || 0) + Number(batch.quantity_added || 0));
    });

    return Array.from(grouped.entries())
      .map(([date, quantity]) => ({ date, quantity }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [batches]);

  return (
    <div className={pageShell}>
      <div className={pageContent}>
        <section className="rounded-[32px] bg-gradient-to-r from-slate-900 via-blue-800 to-cyan-700 px-6 py-7 text-white shadow-[0_24px_60px_-28px_rgba(37,99,235,0.45)] md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-100">Inventory Insights</p>
              <h1 className="mt-2 text-3xl font-bold md:text-4xl">Analytics dashboard</h1>
              <p className="mt-3 text-sm text-blue-50 md:text-base">
                Review inventory value, category distribution, stock risk, and recent batch movement from the current live inventory data.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/inventory/allstocks"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                View stock batches
              </Link>
              <Link
                href="/inventory/manageitems"
                className="rounded-2xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/25"
              >
                Manage items
              </Link>
            </div>
          </div>
        </section>

        {feedback ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {feedback}
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="Tracked items" value={metrics.totalItems} tone="slate" />
          <MetricCard label="Total units" value={metrics.totalUnits} tone="blue" />
          <MetricCard label="Stock value" value={formatCurrency(metrics.totalValue)} tone="emerald" />
          <MetricCard label="Low stock" value={metrics.lowStockCount} tone="amber" />
          <MetricCard label="Batch entries" value={metrics.batchCount} tone="violet" />
          <MetricCard label="Units received" value={metrics.recentBatchQty} tone="cyan" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Inventory value by category</h2>
                <p className="text-sm text-slate-500">Value is calculated from current quantity multiplied by unit cost.</p>
              </div>
            </div>

            <div className="mt-5 h-[320px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
              ) : categoryBreakdown.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                  No category data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={100} innerRadius={52}>
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Recent batch movement</h2>
                <p className="text-sm text-slate-500">Quantity received per stock batch entry date.</p>
              </div>
            </div>

            <div className="mt-5 h-[320px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
              ) : batchTimeline.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                  No stock batch history available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={batchTimeline}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="quantity" stroke="#2563eb" strokeWidth={3} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className={surfaceCard}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Top items by inventory value</h2>
                <p className="text-sm text-slate-500">Most valuable items based on current stock holding.</p>
              </div>
            </div>

            <div className="mt-5 h-[340px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">Loading chart...</div>
              ) : topValueItems.length === 0 ? (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500">
                  No item value data available yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topValueItems}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" angle={-20} textAnchor="end" height={70} interval={0} />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {topValueItems.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Reorder watch</h2>
              <div className="mt-5 space-y-3">
                {reorderRiskRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500">
                    No reorder-risk items right now.
                  </div>
                ) : (
                  reorderRiskRows.map((row) => (
                    <div key={row.name} className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{row.name}</p>
                          <p className="mt-1 text-xs text-slate-500">Reorder level: {row.reorder}</p>
                        </div>
                        <p className="text-sm font-semibold text-amber-800">{row.quantity} left</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={surfaceCard}>
              <h2 className="text-xl font-semibold text-slate-900">Attention needed</h2>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Low-stock watch</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {metrics.lowStockCount > 0
                      ? `${metrics.lowStockCount} item(s) are already at or below reorder level.`
                      : "No low-stock items need immediate action right now."}
                  </p>
                </div>

                <div className="rounded-2xl border border-cyan-200 bg-cyan-50/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Latest batch activity</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {batches.length > 0
                      ? `${batches[0]?.item_name || "A stock item"} was the latest received batch entry.`
                      : "No stock batches have been recorded yet."}
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-200 bg-violet-50/90 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Highest value category</p>
                  <p className="mt-2 text-sm text-slate-700">
                    {categoryBreakdown.length > 0
                      ? `${categoryBreakdown[0]?.name || "Uncategorized"} currently carries the highest inventory value.`
                      : "Category value trends will appear once inventory data grows."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  const toneMap = {
    slate: "border-slate-200 bg-white text-slate-900",
    blue: "border-blue-100 bg-blue-50/95 text-blue-900",
    emerald: "border-emerald-100 bg-emerald-50/95 text-emerald-900",
    amber: "border-amber-100 bg-amber-50/95 text-amber-900",
    violet: "border-violet-100 bg-violet-50/95 text-violet-900",
    cyan: "border-cyan-100 bg-cyan-50/95 text-cyan-900",
  };

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.18)] ${toneMap[tone] || toneMap.slate}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
