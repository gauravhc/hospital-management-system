"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiDelete } from "@/services/api";

export default function ExpiredStock() {
  const [expired, setExpired] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch expired stock
  useEffect(() => {
    apiGet(process.env.NEXT_PUBLIC_INVENTORY_ALERTS_EXPIRED_API)
      .then((data) => {
        setExpired(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  const deleteBatch = async (id) => {
    if (!confirm("Are you sure you want to delete this expired batch?")) return;

    try {
      const res = await apiDelete(`${process.env.NEXT_PUBLIC_INVENTORY_BASE_API}/${id}`);
      alert(res.message || "Batch deleted");
      setExpired(expired.filter((e) => e.StockID !== id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete");
    }
  };

  const daysExpired = (dateString) => {
    const today = new Date();
    const exp = new Date(dateString);
    const diff = today - exp;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  if (loading) return <p className="p-6 text-center">Loading expired stock…</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-700">
        ❌ Expired Medicines
      </h1>

      {expired.length === 0 ? (
        <p className="text-center text-green-600 font-medium">
          No expired batches found ✔
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {expired.map((s) => (
            <div
              key={s.StockID}
              className="border border-red-500 bg-red-50 p-4 rounded-lg shadow"
            >
              {/* Header */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-red-800">
                  {s.InventoryItem?.name || "Unknown Item"}
                </h2>

                <span className="px-2 py-1 bg-red-700 text-white text-xs rounded">
                  EXPIRED
                </span>
              </div>

              {/* Details */}
              <p className="text-sm mt-2">
                <b>Batch:</b> {s.BatchLotCode}
              </p>

              <p className="text-sm">
                <b>Quantity:</b> {s.QuantityOnHand}
              </p>

              <p className="text-sm">
                <b>Expired On:</b>{" "}
                {new Date(s.ExpirationDate).toLocaleDateString()}
              </p>

              <p className="text-sm text-red-600">
                <b>Expired Since:</b> {daysExpired(s.ExpirationDate)} days
              </p>

              <p className="text-sm">
                <b>Status:</b> {s.Status}
              </p>

              {/* Actions */}
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/inventory/update/${s.StockID}`}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update
                </Link>

                <button
                  onClick={() => deleteBatch(s.StockID)}
                  className="px-3 py-1 bg-red-700 text-white rounded hover:bg-red-800"
                >
                  Delete Batch
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
