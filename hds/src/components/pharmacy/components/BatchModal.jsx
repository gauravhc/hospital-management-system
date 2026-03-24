import { useState } from "react";
import formatCurrency from "@/utils/formatCurrency";

export default function BatchModal({ medicine, batches, onAdd, onClose }) {
    const [selectedBatch, setSelectedBatch] = useState(null);
    const [qty, setQty] = useState(1);

    const handleAdd = () => {
        if (!selectedBatch) return;
        onAdd(medicine, selectedBatch, qty);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h3 className="text-xl font-bold mb-4">Select Batch for {medicine?.name}</h3>

                <div className="space-y-4 max-h-60 overflow-y-auto mb-4">
                    {batches && batches.length > 0 ? (
                        batches.map((batch) => (
                            <div
                                key={batch.id}
                                onClick={() => setSelectedBatch(batch)}
                                className={`p-3 border rounded cursor-pointer ${selectedBatch?.id === batch.id ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                            >
                                <div className="flex justify-between">
                                    <span className="font-medium">Batch: {batch.batch_no}</span>
                                    <span className="text-sm font-bold">{formatCurrency(batch.selling_price)}</span>
                                </div>
                                <div className="text-sm text-gray-500 flex gap-4">
                                    <span>Exp: {new Date(batch.expiry_date).toLocaleDateString()}</span>
                                    <span>Stock: {batch.quantity}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500">No batches available.</p>
                    )}
                </div>

                <div className="flex gap-4 items-center mb-6">
                    <label className="font-medium">Quantity:</label>
                    <input
                        type="number"
                        min="1"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        className="p-2 border rounded w-24"
                    />
                </div>

                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                    <button
                        onClick={handleAdd}
                        disabled={!selectedBatch}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
