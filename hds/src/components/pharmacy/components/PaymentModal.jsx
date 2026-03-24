import { useState } from "react";
import formatCurrency from "@/utils/formatCurrency";

export default function PaymentModal({ total, onPay, onClose }) {
    const [method, setMethod] = useState("Cash");

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-sm">
                <h3 className="text-xl font-bold mb-4">Confirm Payment</h3>
                <p className="mb-4 text-center text-2xl font-bold text-gray-800">{formatCurrency(total)}</p>

                <div className="space-y-3 mb-6">
                    {['Cash', 'Card', 'UPI'].map((m) => (
                        <div
                            key={m}
                            onClick={() => setMethod(m)}
                            className={`p-3 border rounded cursor-pointer text-center ${method === m ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50'}`}
                        >
                            {m}
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2 border rounded hover:bg-gray-100">Cancel</button>
                    <button
                        onClick={() => onPay(method)}
                        className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-bold"
                    >
                        Pay & Print
                    </button>
                </div>
            </div>
        </div>
    );
}
