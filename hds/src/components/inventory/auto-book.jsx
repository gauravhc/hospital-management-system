"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";

export default function AutoBookPage() {
  const [lowItems, setLowItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState({});

  const loadLow = async () => {
    setLoading(true);
    try {
      const data = await apiGet(process.env.NEXT_PUBLIC_INVENTORY_SETTINGS_LOW_API);
      const list = Array.isArray(data) ? data : data?.data || data || [];
      setLowItems(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("load low items", err);
      setLowItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLow();
  }, []);

  const runAutoBook = async () => {
    if (!confirm("Auto-book low stock items? This will create booking records.")) return;
    setRunning(true);
    try {
      const data = await apiPost(process.env.NEXT_PUBLIC_INVENTORY_SETTINGS_AUTOBOOK_API);
      alert(`Auto-booked ${data.count} items`);
      await loadLow();
    } catch (err) {
      console.error("Auto book", err);
      alert(err.message || "Auto-book failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Auto Book Low Stocks</h1>
            <p className="mt-2 text-slate-600">Review low-stock items and run auto-booking to create procurement bookings.</p>
          </div>

          <div className="shrink-0">
            <button
              onClick={runAutoBook}
              disabled={running}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-5 py-3 rounded-lg shadow-md hover:opacity-95 disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">{running ? 'Running…' : 'Run Auto-Book'}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-lg bg-white/60 p-6 shadow-sm">Loading low-stock items…</div>
        ) : (
          <div className="space-y-4">
            {lowItems.length === 0 && (
              <div className="rounded-lg bg-white p-6 shadow-sm text-slate-600">No low-stock items found.</div>
            )}

            {lowItems.map((it, idx) => {
              const suggested = Math.max(0, (it.threshold || 0) * 2 - (it.totalQty || 0));
              return (
                <div key={idx} className="rounded-lg bg-white shadow-md overflow-hidden">
                  <div className="p-5 flex items-start justify-between gap-4">
                    <div className="flex gap-4 items-start">
                      <div className="flex-none mt-1">
                        <div className="h-12 w-12 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">{(it.name || '').charAt(0) || '?'}</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-slate-900">{it.name || it.ItemName || `Item ${it.ItemID}`}</div>
                        <div className="mt-1 text-sm text-slate-500">ID: <span className="font-mono">{it.ItemID}</span></div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded-full text-slate-700">{it.category || 'Uncategorized'}</span>
                          <span className="text-xs px-2 py-1 bg-emerald-50 rounded-full text-emerald-700">Quantity: {it.totalQty ?? '-'}</span>
                          <span className="text-xs px-2 py-1 bg-amber-50 rounded-full text-amber-700">Threshold: {it.threshold ?? '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-2 rounded-full bg-gradient-to-r from-rose-50 to-rose-100 text-rose-700 font-semibold">Suggested: {suggested}</div>
                      <button onClick={() => setExpanded((s) => ({ ...s, [idx]: !s[idx] }))} className="text-sm text-indigo-600 underline">
                        {expanded[idx] ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  </div>

                  {expanded[idx] && (
                    <div className="border-t bg-slate-50 p-4">
                      <table className="w-full text-sm">
                        <tbody>
                          {Object.entries(it).map(([k, v]) => (
                            <tr key={k} className="border-b last:border-b-0">
                              <td className="py-2 text-slate-600 w-40 font-medium">{k}</td>
                              <td className="py-2 text-slate-800 break-words">{String(v)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
