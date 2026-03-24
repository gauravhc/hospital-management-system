'use client';

import { useState, useEffect } from "react";
import SearchBar from "./components/SearchBar";
import MedicineList from "./components/MedicineList";
import BatchModal from "./components/BatchModal";
import CartPanel from "./components/CartPanel";
import InvoiceSummary from "./components/InvoiceSummary";
import PaymentModal from "./components/PaymentModal";
import formatCurrency from "@/utils/formatCurrency";
import { apiGet, apiPost } from "@/services/api";

export default function PharmacyInvoice() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState(null);
    const [batches, setBatches] = useState([]);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [cart, setCart] = useState([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [recentTx, setRecentTx] = useState([]);
    const [recentInvoices, setRecentInvoices] = useState([]);

    // LOGOUT HANDLER (Simpler now, or rely on Header)
    const handleLogout = () => {
        localStorage.clear();
        window.location.href = "/login";
    };

    // =====================================================
    // SEARCH MEDICINES
    // =====================================================
    const searchMedicines = async (q) => {
        setQuery(q);

        if (!q || q.trim().length < 2) {
            setResults([]);
            return;
        }

        try {
            const data = await apiGet(`${process.env.NEXT_PUBLIC_PHARMACY_INVOICE_API}/search`, { q });
            setResults(Array.isArray(data) ? data : []);
        } catch (err) {
            setResults([]);
        }
    };

    // =====================================================
    // OPEN BATCH MODAL
    // =====================================================
    const openBatchModal = async (medicine) => {
        setSelectedMedicine(medicine);
        try {
            // Note: Adjust endpoint if needed to match backend route structure
            const data = await apiGet(`${process.env.NEXT_PUBLIC_PHARMACY_INVOICE_API}/${medicine.id}/batches`);
            setBatches(Array.isArray(data) ? data : []);
            setShowBatchModal(true);
        } catch (err) {
            setBatches([]);
            setShowBatchModal(true);
        }
    };

    // Fetch recent transactions and invoices
    useEffect(() => {
        let mounted = true;
        const loadRecent = async () => {
            try {
                const txData = await apiGet(`${process.env.NEXT_PUBLIC_PHARMACY_INVOICE_API}/recent-transactions`, { limit: 8 });
                if (mounted && Array.isArray(txData)) setRecentTx(txData);

                const invData = await apiGet(`${process.env.NEXT_PUBLIC_PHARMACY_INVOICE_API}/recent-invoices`, { limit: 8 });
                if (mounted && Array.isArray(invData)) setRecentInvoices(invData);
            } catch (err) {
                console.error("Failed to load recent data", err);
            }
        };
        loadRecent();
        return () => { mounted = false; };
    }, []);

    // Flatten recent invoices into recent purchased items for the UI table
    const recentItems = (recentInvoices || []).flatMap((inv) =>
        (inv.items || []).map((it) => ({
            invoiceId: inv.invoiceId,
            invoiceNumber: inv.invoiceNumber,
            createdAt: inv.createdAt,
            description: it.description || it.name || "Item",
            quantity: Number(it.quantity || 0),
            unitPrice: Number(it.unitPrice || 0),
            lineTotal: Number(it.lineTotal || (it.unitPrice ? it.unitPrice * (it.quantity || 1) : 0)),
        }))
    );

    // =====================================================
    // ADD TO CART
    // =====================================================
    const addToCart = (medicine, batch, qty) => {
        if (!medicine || !batch) return;

        const q = Number(qty);
        if (q <= 0) return;

        const item = {
            id: medicine.id,
            name: medicine.name,
            batch_no: batch.batch_no,
            qty: q,
            selectedStockId: batch.id || batch.StockID,
            unitPrice: Number(batch.selling_price || medicine.selling_price || 0),
            gst: Number(medicine.gst_rate || 0),
        };

        setCart((p) => {
            const ex = p.find(
                (x) => x.id === item.id && x.batch_no === item.batch_no
            );

            if (ex) {
                return p.map((x) =>
                    x.id === item.id && x.batch_no === item.batch_no
                        ? { ...x, qty: x.qty + q }
                        : x
                );
            }
            return [...p, item];
        });

        setShowBatchModal(false);
    };

    // =====================================================
    // COMPLETE INVOICE
    // =====================================================
    // Open payment modal first. Invoice will be created after payment confirmed.
    const beginCheckout = () => {
        if (!cart || cart.length === 0) {
            alert('Cart is empty');
            return;
        }
        setShowPaymentModal(true);
    };

    const handlePayment = async (payment) => {
        setShowPaymentModal(false);
        // construct customer as Walk-in for now
        const customer = { name: 'Walk-in', phone: null };
        // include payment in payload
        const subtotal = cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
        const gstAmount = cart.reduce((s, i) => s + (i.qty * i.unitPrice * (i.gst || 0)) / 100, 0);
        const grandTotal = subtotal + gstAmount;

        const payload = {
            customer,
            items: cart.map((c) => ({ id: c.id, name: c.name, qty: c.qty, unitPrice: c.unitPrice, selectedStockId: c.selectedStockId })),
            subtotal,
            gst: 0,
            gstAmount,
            grandTotal,
            payment,
        };

        try {
            const data = await apiPost(process.env.NEXT_PUBLIC_PHARMACY_INVOICE_API, payload);

            alert('Paid — Invoice created: ' + (data.invoiceId || data.invoice_id || '(id)'));
            setCart([]);
            if (data.invoicePdfBase64) {
                const blob = b64toBlob(data.invoicePdfBase64, 'application/pdf');
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
            }
        } catch (err) {
            console.error(err);
            alert('Payment/Invoice error: ' + (err.message || "Unknown error"));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* ================= HEADER ================= */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-4xl font-bold">Billing Interface</h1>
                    <p className="text-gray-600 text-lg">Create New Invoice</p>
                </div>

                <button
                    onClick={handleLogout}
                    className="px-5 py-2 bg-red-500 text-white rounded-lg shadow hover:bg-red-600"
                >
                    Logout
                </button>
            </div>

            {/* ================= MAIN GRID ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* LEFT SIDE */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Card: Search */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border rounded-xl shadow p-5">
                        <h2 className="text-xl font-semibold mb-4">Search Medicine</h2>
                        <SearchBar onSearch={searchMedicines} />
                    </div>

                    {/* Card: Medicine Results */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border rounded-xl shadow p-5">
                        <h2 className="text-xl font-semibold mb-4">Search Results</h2>
                        <MedicineList
                            results={results}
                            onSelect={openBatchModal}
                        />
                    </div>
                </div>

                {/* RIGHT SIDE */}
                <aside className="lg:col-span-5 space-y-6">

                    {/* Card: Cart */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border rounded-xl shadow p-5">
                        <h2 className="text-xl font-semibold mb-4">Cart</h2>
                        <CartPanel cart={cart} setCart={setCart} />
                    </div>

                    {/* Card: Invoice Summary */}
                    <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border rounded-xl shadow p-5">
                        <InvoiceSummary
                            cart={cart}
                            onComplete={() => beginCheckout()}
                        />
                    </div>

                    {/* Card: Recent Transactions (flattened items) */}
                    <div className="bg-white border rounded-xl shadow p-5">
                        <h3 className="text-lg font-semibold mb-3">Recent Transactions</h3>
                        {recentItems.length === 0 ? (
                            <div className="text-sm text-gray-500">No recent sales</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-xs text-gray-500">
                                            <th className="py-2">No.</th>
                                            <th className="py-2">Medicine Name</th>
                                            <th className="py-2">Total</th>
                                            <th className="py-2">Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentItems.slice(0, 8).map((it, idx) => (
                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : ''}>
                                                <td className="py-2">{idx + 1}.</td>
                                                <td className="py-2">{it.description}</td>
                                                <td className="py-2">{it.quantity}</td>
                                                <td className="py-2">{formatCurrency(it.lineTotal)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {/* ================= MODAL ================= */}
            {showBatchModal && (
                <BatchModal
                    medicine={selectedMedicine}
                    batches={batches}
                    onAdd={addToCart}
                    onClose={() => setShowBatchModal(false)}
                />
            )}
            {showPaymentModal && (
                <PaymentModal
                    total={cart.reduce((s, i) => s + i.qty * i.unitPrice, 0) + cart.reduce((s, i) => s + (i.qty * i.unitPrice * (i.gst || 0)) / 100, 0)}
                    onPay={handlePayment}
                    onClose={() => setShowPaymentModal(false)}
                />
            )}
        </div>
    );
}

// Convert base64 → PDF
function b64toBlob(base64, mime) {
    const byteChars = atob(base64);
    const byteNumbers = Array.from(byteChars).map((c) => c.charCodeAt(0));
    return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}
