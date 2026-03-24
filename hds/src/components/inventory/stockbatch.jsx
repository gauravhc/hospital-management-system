"use client";

import { useState, useEffect } from "react";
import { apiGet, apiPost } from "@/services/api";

export default function AddStockBatch() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Static dropdown data
  const suppliers = ["Apollo Pharma", "MedPlus", "Cipla", "Sun Pharma", "Local Vendor"];
  const locations = ["Main Store", "Pharmacy Counter", "Emergency Store", "Ward A Store", "Ward B Store"];
  const shelves = ["Shelf A1", "Shelf A2", "Shelf B1", "Shelf B2"];
  const minimumLevels = [5, 10, 20, 50, 100];

  const [form, setForm] = useState({
    itemId: "",
    batchCode: "",
    supplier: "",
    supplierEmail: "",
    mfgDate: "",
    expiryDate: "",
    quantity: "",
    cost: "",
    location: "",
    shelf: "",
    minimum: "",
    dateReceived: "",
  });

  // Load Items from backend
  useEffect(() => {
    const loadItems = async () => {
      try {
        const data = await apiGet(process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API);
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading items:", err);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, []);

  // Handle Input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      itemId: form.itemId,
      batchCode: form.batchCode,
      supplier: form.supplier,
      supplierName: form.supplier,
      supplierEmail: form.supplierEmail,
      expiryDate: form.expiryDate,
      dateReceived: form.dateReceived,
      quantity: Number(form.quantity),
      cost: Number(form.cost),
      location: form.location,
      shelf: form.shelf,
      minimum: Number(form.minimum),
    };

    try {
      const res = await apiPost(`${process.env.NEXT_PUBLIC_INVENTORY_STOCK_API}/add`, payload);
      if (res) {
        alert("Stock batch added successfully!");
        window.location.href = "/inventory";
      }
    } catch (error) {
      console.error("Add batch error:", error);
      alert("Failed to add stock batch.");
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white rounded shadow mt-6">
      <h1 className="text-3xl font-bold mb-4 text-center text-purple-700">
        Add Stock Batch
      </h1>

      {loading ? (
        <p className="text-center">Loading items...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* ITEM SELECT */}
          <div>
            <label className="block font-semibold mb-1">Select Item</label>
            <select
              name="itemId"
              required
              className="w-full p-2 border rounded"
              value={form.itemId}
              onChange={handleChange}
            >
              <option value="">-- Select Item --</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* BATCH CODE */}
          <input
            type="text"
            name="batchCode"
            placeholder="Batch Code"
            className="w-full p-2 border rounded"
            value={form.batchCode}
            onChange={handleChange}
            required
          />

          {/* SUPPLIER */}
          <div>
            <label className="block font-semibold mb-1">Supplier</label>
            <select
              name="supplier"
              className="w-full p-2 border rounded"
              value={form.supplier}
              onChange={handleChange}
            >
              <option value="">-- Select Supplier --</option>
              {suppliers.map((supplier, index) => (
                <option key={index} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </div>

          {/* SUPPLIER EMAIL */}
          <div>
            <label className="block font-semibold mb-1">Supplier Email</label>
            <input
              type="email"
              name="supplierEmail"
              placeholder="supplier@example.com"
              className="w-full p-2 border rounded"
              value={form.supplierEmail}
              onChange={handleChange}
            />
          </div>

          {/* DATE ROW */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold">Date Received</label>
              <input
                type="date"
                name="dateReceived"
                className="w-full p-2 border rounded"
                value={form.dateReceived}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block font-semibold">Expiry Date</label>
              <input
                type="date"
                name="expiryDate"
                className="w-full p-2 border rounded"
                value={form.expiryDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* QUANTITY */}
          <input
            type="number"
            name="quantity"
            placeholder="Quantity"
            className="w-full p-2 border rounded"
            value={form.quantity}
            onChange={handleChange}
            required
          />

          {/* COST */}
          <input
            type="number"
            step="0.01"
            name="cost"
            placeholder="Cost per Unit"
            className="w-full p-2 border rounded"
            value={form.cost}
            onChange={handleChange}
          />

          {/* LOCATION */}
          <div>
            <label className="block font-semibold mb-1">Location</label>
            <select
              name="location"
              className="w-full p-2 border rounded"
              value={form.location}
              onChange={handleChange}
            >
              <option value="">-- Select Location --</option>
              {locations.map((loc, index) => (
                <option key={index} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* SHELF */}
          <div>
            <label className="block font-semibold mb-1">Shelf</label>
            <select
              name="shelf"
              className="w-full p-2 border rounded"
              value={form.shelf}
              onChange={handleChange}
            >
              <option value="">-- Select Shelf --</option>
              {shelves.map((shelf, index) => (
                <option key={index} value={shelf}>
                  {shelf}
                </option>
              ))}
            </select>
          </div>

          {/* MINIMUM STOCK */}
          <div>
            <label className="block font-semibold mb-1">Minimum Stock Level</label>
            <select
              name="minimum"
              className="w-full p-2 border rounded"
              value={form.minimum}
              onChange={handleChange}
            >
              <option value="">-- Select Minimum Level --</option>
              {minimumLevels.map((level, index) => (
                <option key={index} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded text-lg"
          >
            Add Batch
          </button>
        </form>
      )}
    </div>
  );
}
