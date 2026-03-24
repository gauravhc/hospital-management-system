import formatCurrency from "@/utils/formatCurrency";

export default function MedicineList({ results, onSelect }) {
    if (!results || results.length === 0) {
        return <div className="text-gray-500 text-center py-4">No medicines found.</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left bg-gray-50 border-b">
                        <th className="p-2">Name</th>
                        <th className="p-2">Generic</th>
                        <th className="p-2">Stock</th>
                        <th className="p-2">Price</th>
                        <th className="p-2">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((med) => (
                        <tr key={med.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{med.name}</td>
                            <td className="p-2 text-gray-500">{med.generic_name || '-'}</td>
                            <td className="p-2">{med.total_stock || 0}</td>
                            <td className="p-2">{formatCurrency(med.selling_price)}</td>
                            <td className="p-2">
                                <button
                                    onClick={() => onSelect(med)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                >
                                    Select
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
