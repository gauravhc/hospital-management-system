"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/services/api";

export default function LowStockAlerts() {
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet(process.env.NEXT_PUBLIC_INVENTORY_ALERTS_LOW_API)
      .then((data) => {
        setLowStock(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, []);

  if (loading) return <p className="p-6 text-center">Loading low stock alerts…</p>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-red-600">⚠ Low Stock Alerts</h1>

      {lowStock.length === 0 ? (
        <p className="text-center text-green-600 font-medium">
          Everything is sufficiently stocked ✔
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lowStock.map((s) => (
            <div
              key={s.StockID}
              className="p-4 border border-red-400 bg-red-50 rounded shadow"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-red-700">
                  {s.InventoryItem?.name || "Unknown Item"}
                </h2>

                <span className="px-2 py-1 text-xs rounded bg-red-600 text-white">
                  LOW STOCK
                </span>
              </div>

              <p className="mt-2 text-sm">
                <b>Batch:</b> {s.BatchLotCode}
              </p>

              <p className="text-sm">
                <b>Quantity Left:</b> {s.QuantityOnHand}
              </p>

              <p className="text-sm">
                <b>Minimum Required:</b> {s.MinimumStockLevel}
              </p>

              <p className="text-sm">
                <b>Status:</b> {s.Status}
              </p>

              <p className="text-sm">
                <b>Expiry:</b>{" "}
                {s.ExpirationDate
                  ? new Date(s.ExpirationDate).toLocaleDateString()
                  : "N/A"}
              </p>

              <Link
                href={`/inventory/update/${s.StockID}`}
                className="mt-3 inline-block px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update Stock
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
