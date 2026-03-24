"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";
import formatCurrency from "@/utils/formatCurrency";

export default function PharmacyDashboard() {
    const [data, setData] = useState(null);

    const loadDashboard = async () => {
        try {
            const json = await apiGet(process.env.NEXT_PUBLIC_PHARMACY_DASHBOARD_API);
            setData(json);
        } catch (err) {
            console.error("Failed to load pharmacy dashboard", err);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    if (!data) return <div className="p-6">Loading...</div>;

    return (
        <div className="p-6 space-y-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm text-gray-500">Today’s Sales</h3>
                    <h2 className="text-xl font-bold">{formatCurrency(data.todaySales)}</h2>
                </div>

                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm text-gray-500">Total Bills</h3>
                    <h2 className="text-xl font-bold">{data.todayBills}</h2>
                </div>

                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm text-gray-500">Top Medicine</h3>
                    <h2 className="text-lg font-bold">{data.topMedicines[0]?.name}</h2>
                </div>

                <div className="p-4 bg-white rounded-xl shadow">
                    <h3 className="text-sm text-gray-500">Low Stock Alerts</h3>
                    <h2 className="text-xl font-bold">{data.lowStock.length}</h2>
                </div>
            </div>

            {/* Top Medicines */}
            <div className="p-4 bg-white rounded-xl shadow">
                <h3 className="font-semibold mb-3">Top Selling Medicines</h3>
                <ul className="text-sm space-y-1">
                    {data.topMedicines.map((m, i) => (
                        <li key={i} className="flex justify-between">
                            <span>{m.name}</span>
                            <span>{m.qty}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Low Stock List */}
            <div className="p-4 bg-white rounded-xl shadow">
                <h3 className="font-semibold mb-3">Low Stock Alerts</h3>
                <ul className="text-sm space-y-1">
                    {data.lowStock.map((m, i) => (
                        <li key={i} className="flex justify-between text-red-600">
                            <span>{m.name}</span>
                            <span>{m.qty} left</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Recent Invoice List */}
            <div className="p-4 bg-white rounded-xl shadow">
                <h3 className="font-semibold mb-3">Recent Invoices</h3>
                <ul className="text-sm space-y-1">
                    {data.recentInvoices.map((inv, i) => (
                        <li key={i} className="flex justify-between">
                            <span>#{inv.id}</span>
                            <span>{inv.date}</span>
                            <span>{formatCurrency(inv.total)}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
