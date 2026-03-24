
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiGet, apiDelete } from "@/services/api"; // Updated import

export default function InventoryItemsPage() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const searchParams = useSearchParams();

  // fetch error state
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    fetchItems();
    // initialize filter from query param (if present)
    const cat = searchParams?.get("category") || "";
    if (cat) setFilterCategory(decodeURIComponent(cat));
  }, []);

  const fetchItems = async () => {
    try {
      const data = await apiGet(process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API);
      setItems(Array.isArray(data) ? data : []);
      setFetchError(null);
    } catch (err) {
      console.error('Failed to fetch inventory items', err);
      setItems([]);
      setFetchError(err.message || 'Failed to fetch');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await apiDelete(`${process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API}/${id}`);
      alert("Item deleted");
      fetchItems();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed: ' + (err.message || 'Unknown error'));
    }
  };

  const filteredItems = items.filter((item) => {
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) &&
      (!filterCategory || item.category === filterCategory)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Inventory Items</h1>
        <Link
          href="/inventory/items/add"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          + Add Item
        </Link>
      </div>

      {fetchError && (
        <div className="mb-4 p-4 border-l-4 border-red-500 bg-red-50 text-red-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Unable to load items</div>
              <div className="text-xs">{fetchError}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchItems()}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <input
          className="border p-2 rounded"
          placeholder="Search by name…"
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border p-2 rounded"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">Filter by Category</option>
          <option value="Medicine">Medicine</option>
          <option value="Equipment">Equipment</option>
          <option value="Surgical">Surgical</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded-lg shadow bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Brand</th>
              <th className="p-3">Unit / Strength</th>
              <th className="p-3">Reorder Level</th>
              <th className="p-3">Supplier</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">
                  No items found
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr
                  key={item.id}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="p-3 font-medium">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3">{item.brand}</td>
                  <td className="p-3">
                    {item.unit} / {item.strengthSize}
                  </td>
                  <td className="p-3">{item.reorderLevel}</td>
                  <td className="p-3">{item.supplier}</td>

                  <td className="p-3 text-center space-x-2">
                    <Link
                      href={`/ inventory / items / edit / ${item.id} `}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
