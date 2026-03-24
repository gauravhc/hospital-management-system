"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";

export default function InventoryDashboard() {
  const [stats, setStats] = useState({
    items: 0,
    batches: 0,
    lowStock: 0,
    expired: 0,
  });

  const loadData = async () => {
    try {
      const [items, stock, low, expired] = await Promise.all([
        apiGet(process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API),
        apiGet(process.env.NEXT_PUBLIC_INVENTORY_STOCK_API),
        apiGet(process.env.NEXT_PUBLIC_INVENTORY_ALERTS_LOW_API),
        apiGet(process.env.NEXT_PUBLIC_INVENTORY_ALERTS_EXPIRED_API),
      ]);

      setStats({
        items: Array.isArray(items) ? items.length : 0,
        batches: Array.isArray(stock) ? stock.length : 0,
        lowStock: Array.isArray(low) ? low.length : 0,
        expired: Array.isArray(expired) ? expired.length : 0,
      });
    } catch (err) {
      console.error("Dashboard Load Error:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="w-full p-4 md:p-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome,</h1>
          <p className="text-gray-500 mt-1">Inventory Management Dashboard</p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

        <Link href="/inventory/manageitems" className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📦</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Manage Items</h2>
          <p className="text-sm text-gray-500 mb-4">Add, edit & view inventory items</p>
          <span className="text-indigo-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Go to items <span>→</span>
          </span>
        </Link>

        <Link href="/inventory/additems" className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-50 rounded-xl text-green-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">➕</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Add Item</h2>
          <p className="text-sm text-gray-500 mb-4">Create new inventory item</p>
          <span className="text-green-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Add new <span>→</span>
          </span>
        </Link>

        <Link href="/inventory/stockbatch" className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-50 rounded-xl text-purple-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🚚</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Add Stock Batch</h2>
          <p className="text-sm text-gray-500 mb-4">Add new stock arrivals</p>
          <span className="text-purple-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Update stock <span>→</span>
          </span>
        </Link>

        <Link href="/inventory/allstocks" className="group p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-gray-50 rounded-xl text-gray-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">📊</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">View All Stock</h2>
          <p className="text-sm text-gray-500 mb-4">Complete stock list</p>
          <span className="text-gray-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            View list <span>→</span>
          </span>
        </Link>

        <Link href="/inventory/low-stocks" className="group p-6 rounded-2xl bg-white border border-yellow-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-yellow-50 rounded-xl text-yellow-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">⚠️</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Low Stock</h2>
          <p className="text-sm text-gray-500 mb-4">Items below minimum level</p>
          <div className="flex items-center justify-between">
            <span className="text-yellow-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Check alerts <span>→</span>
            </span>
            {stats.lowStock > 0 && (
              <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">
                {stats.lowStock} Alerts
              </span>
            )}
          </div>
        </Link>

        <Link href="/inventory/expired-stocks" className="group p-6 rounded-2xl bg-white border border-red-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-red-50 rounded-xl text-red-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🗑️</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Expired Stock</h2>
          <p className="text-sm text-gray-500 mb-4">Expired & unsafe items</p>
          <div className="flex items-center justify-between">
            <span className="text-red-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
              Resolve now <span>→</span>
            </span>
            {stats.expired > 0 && (
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">
                {stats.expired} Alerts
              </span>
            )}
          </div>
        </Link>

        <Link href="/inventory/analytics-dashboard" className="col-span-1 sm:col-span-2 lg:col-span-3 group p-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200 text-white">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-2xl font-bold mb-2">Analytics Dashboard</h2>
              <p className="text-blue-100">Visualize consumption, expiry trends, and stock values through interactive charts.</p>
            </div>
            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:scale-110 transition-transform">
              <span className="text-2xl">📈</span>
            </div>
          </div>
        </Link>

        <Link href="/inventory/auto-book" className="group p-6 rounded-2xl bg-white border border-indigo-100 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
              <span className="text-2xl">🤖</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Auto Book</h2>
          <p className="text-sm text-gray-500 mb-4">Automate bookings for low stock</p>
          <span className="text-indigo-600 text-sm font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
            Configure <span>→</span>
          </span>
        </Link>

      </div>
    </div>
  );
}
