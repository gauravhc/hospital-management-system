import formatCurrency from "@/utils/formatCurrency";

export default function InvoiceSummary({ cart, totals, onComplete }) {
    const subtotal = totals?.subtotal ?? cart.reduce((s, i) => s + i.qty * i.unitPrice, 0);
    const gstTotal = totals?.taxAmount ?? cart.reduce((s, i) => s + (i.qty * i.unitPrice * (i.gst || 0) / 100), 0);
    const discountAmount = totals?.discountAmount ?? 0;
    const grandTotal = totals?.totalAmount ?? subtotal + gstTotal - discountAmount;

    return (
        <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>Discount</span>
                <span>- {formatCurrency(discountAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
                <span>GST</span>
                <span>{formatCurrency(gstTotal)}</span>
            </div>
            <hr />
            <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>{formatCurrency(grandTotal)}</span>
            </div>
            <button
                onClick={onComplete}
                disabled={cart.length === 0}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 mt-4"
            >
                Checkout
            </button>
        </div>
    );
}
