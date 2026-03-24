import formatCurrency from "@/utils/formatCurrency";
import { Trash2 } from "lucide-react";

export default function CartPanel({ cart, setCart }) {
    const removeFromCart = (index) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    if (cart.length === 0) {
        return <p className="text-gray-500 text-center py-4">Cart is empty.</p>;
    }

    return (
        <div className="space-y-3">
            {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center bg-white p-3 rounded shadow-sm border">
                    <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-gray-400">Batch: {item.batch_no}</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-sm">
                            {item.qty} x {formatCurrency(item.unitPrice)}
                        </div>
                        <div className="font-bold text-sm">
                            {formatCurrency(item.qty * item.unitPrice)}
                        </div>
                        <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700">
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
