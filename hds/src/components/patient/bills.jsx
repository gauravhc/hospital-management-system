"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/services/api";

const PatientBillsPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBills = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiGet("/api/patients/bills");
        const list = Array.isArray(response?.bills) ? response.bills : Array.isArray(response?.data) ? response.data : [];
        setInvoices(list);
      } catch (err) {
        setError(err?.message || "Failed to load bills.");
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen flex flex-col">
      <main
        className="flex-1 px-6 py-8"
        style={{
          backgroundImage: "url('/images/Bg-image.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-6xl mx-auto">
          <header className="mb-6">
            <h2 className="text-3xl font-extrabold text-slate-900">My Bills</h2>
            <p className="text-slate-500">View invoices, pay online, and download receipts.</p>
          </header>

          <section className="bg-white rounded-2xl shadow-xl p-6 border border-slate-100">
            <h4 className="font-semibold mb-4">Invoices</h4>

            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-500">Loading bills...</div>
              ) : error ? (
                <div className="text-sm text-rose-600">{error}</div>
              ) : invoices.length ? (
                invoices.map((inv) => {
                  const status = String(inv.status || inv.payment_status || "pending").toLowerCase();
                  return (
                    <div key={inv.id} className="p-4 border rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-medium">Invoice #{inv.id}</div>
                        <div className="text-sm text-slate-500">{inv.created_at || inv.date || "--"}</div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-slate-800">
                          â‚¹{inv.amount || inv.total_amount || "--"}
                        </div>

                        <div
                          className={`text-sm font-semibold ${
                            status === "paid" ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {inv.status || inv.payment_status || "Pending"}
                        </div>

                        {status === "unpaid" && (
                          <button className="mt-2 px-4 py-1.5 bg-sky-600 text-white rounded-lg text-sm hover:bg-sky-700 transition">
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500">No bills found.</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PatientBillsPage;
