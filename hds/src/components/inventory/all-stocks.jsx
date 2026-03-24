"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";

export default function ViewStockPage() {
  const [stock, setStock] = useState([]);

  useEffect(() => {
    apiGet(process.env.NEXT_PUBLIC_INVENTORY_STOCK_API)
      .then((data) => {
        // backend may return raw array or { data: [...] }
        const list = Array.isArray(data) ? data : data?.data || [];
        console.log("[ViewStock] fetched stock:", list);
        setStock(Array.isArray(list) ? list : []);
      })
      .catch((err) => console.error("Stock load error:", err));
  }, []);

  const formatDate = (d) => new Date(d).toLocaleDateString();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6 text-center">All Stock Batches</h1>

      <div className="bg-white shadow-lg rounded-xl p-6 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="p-3">Item</th>
              <th className="p-3">Batch</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Min Level</th>
              <th className="p-3">Expiry</th>
              <th className="p-3">Supplier</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {(!Array.isArray(stock) || stock.length === 0) ? (
              <tr>
                <td colSpan="7" className="p-5 text-center text-gray-600">
                  No stock batches yet
                </td>
              </tr>
            ) : (
              stock.map((s) => {
                const expired =
                  s.ExpirationDate && new Date(s.ExpirationDate) < new Date();

                const low = s.QuantityOnHand <= s.MinimumStockLevel;

                return (
                  <tr key={s.StockID} className="border-b hover:bg-gray-50">
                    <td className="p-3">{s.InventoryItem?.name}</td>
                    <td className="p-3">{s.BatchLotCode}</td>
                    <td className="p-3 font-semibold">{s.QuantityOnHand}</td>
                    <td className="p-3">{s.MinimumStockLevel}</td>
                    <td className={`p-3 ${expired ? "text-red-600 font-bold" : ""}`}>
                      {formatDate(s.ExpirationDate)}
                    </td>
                    <td className="p-3">
                      {/* Prefer SupplierName/Email from stock record, fallback to InventoryItem.supplier */}
                      <div className="font-medium">{s.SupplierName || s.InventoryItem?.supplier || s.SupplierID}</div>
                      {s.SupplierEmail && <div className="text-xs text-gray-600">{s.SupplierEmail}</div>}
                    </td>
                    <td
                      className={`p-3 font-bold ${expired
                        ? "text-red-600"
                        : low
                          ? "text-yellow-600"
                          : "text-green-600"
                        }`}
                    >
                      {expired ? "Expired" : low ? "Low Stock" : "Available"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
