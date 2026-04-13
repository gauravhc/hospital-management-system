"use client";
import { useState } from "react";
import { apiPost } from "@/services/api";

// ✅ Category → Subcategory Mapping
export const categoryOptions = {
  Medicine: [
    "Tablets",
    "Capsules",
    "Syrup",
    "Injection",
    "IV Fluids",
    "Drops",
    "Ointment",
    "Inhaler",
    "Powder",
    "Suppository",
  ],
  Surgical: [
    "Gloves",
    "Scalpel",
    "Sutures",
    "Blades",
    "Cannula",
    "Bandages",
    "Gauze",
    "Surgical Kits",
  ],
  "Lab Equipment": [
    "Analyzers",
    "Reagents",
    "Test Kits",
    "Microscopy",
    "Slides",
    "Pipettes",
    "Tubes",
  ],
  Diagnostics: [
    "X-Ray Films",
    "Ultrasound Gel",
    "ECG Accessories",
    "Diagnostic Kits",
  ],
  Consumables: ["Masks", "Sanitizers", "Cotton", "Disinfectants", "Aprons", "Wraps"],
  Injectable: ["IV Injection", "IM Injection", "Vaccines", "IV Drips"],
  "OT Equipment": ["Surgical Tools", "Monitors", "Lights", "Anesthesia"],
  "Cleaning & Utilities": ["Detergents", "Solutions", "Waste Bags", "Mops"],
  "PPE / Safety": ["N95 Mask", "Gloves", "Gowns", "Head Cap"],
  "Medical Device": ["BP Monitor", "Glucometer", "Thermometer", "Nebulizer", "Pulse Oximeter"],
  "General Supplies": ["Stationery", "Files", "Ink", "Batteries", "General Tools"],
};

// ✅ Dynamic Storage Mapping
export const storageMap = {
  Medicine: [
    "Pharmacy – Shelf A",
    "Pharmacy – Shelf B",
    "Pharmacy – Shelf C",
    "Pharmacy – Controlled Drugs Locker",
    "Main Store – Aisle 1",
    "Main Store – Cold Storage",
  ],
  Surgical: [
    "OT Room Storage",
    "OT Store – Sterile Rack",
    "Equipment Room",
    "Main Store – Aisle 2",
  ],
  "Lab Equipment": [
    "Lab Storage",
    "Lab Cool Storage",
    "Diagnostics Store",
    "Equipment Room",
  ],
  Diagnostics: ["Diagnostics Store", "Lab Storage", "Main Store – Aisle 3"],
  Consumables: [
    "Main Store – Aisle 1",
    "Main Store – Aisle 2",
    "Ward Store – General",
    "Ward Store – Emergency",
  ],
  Injectable: [
    "Pharmacy – Cold Storage",
    "Pharmacy – Shelf C",
    "Main Store – Cold Storage",
  ],
  "OT Equipment": [
    "OT Equipment Room",
    "OT Room Storage",
    "Main Store – Aisle 3",
  ],
  "Cleaning & Utilities": ["Utility Storage", "Main Store – Aisle 4", "Receiving Dock"],
  "PPE / Safety": ["PPE Storage", "Ward Store – Emergency", "ICU Store"],
  "Medical Device": ["Equipment Room", "Diagnostics Store", "Main Store – Aisle 3"],
  "General Supplies": ["Main Store – Aisle 1", "Ward Store – General", "Receiving Dock"],
};

export default function AddInventoryItem() {
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "",
    openingQuantity: "",
    reorderLevel: "",
    unitCost: "",
    supplier: "",
    sku: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  // ️⃣ Handle Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "category") {
      setForm({
        ...form,
        category: value,
      });
      return;
    }

    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // ️⃣ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback("");

    try {
      const payload = {
        name: form.name,
        sku: form.sku || null,
        category: form.category || null,
        quantity: Number(form.openingQuantity || 0),
        reorder_level: Number(form.reorderLevel || 0),
        unit: form.unit || null,
        unit_cost: Number(form.unitCost || 0),
        supplier_name: form.supplier || null,
      };

      const res = await apiPost("/api/inventory/items", payload);
      if (res) {
        setFeedback("Item added successfully.");
        window.location.href = "/inventory/manageitems";
      }
    } catch (error) {
      console.error("Error adding item:", error);
      setFeedback(error?.message || "Error adding item.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add Inventory Item</h1>

      {feedback ? (
        <div className={`mb-4 rounded border px-4 py-3 text-sm ${feedback.toLowerCase().includes("success") ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {feedback}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Category and item details</h2>
          <p className="mt-1 text-sm text-slate-500">Enter the basic item information and choose the category.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Item name</label>
              <input
                className="w-full rounded border p-2"
                name="name"
                placeholder="Paracetamol 500mg"
                required
                value={form.name}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full rounded border p-2"
                required
              >
                <option value="">Select category</option>
                {Object.keys(categoryOptions).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Unit</label>
              <input
                className="w-full rounded border p-2"
                name="unit"
                placeholder="tablet / bottle / piece"
                value={form.unit}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">SKU / Item code</label>
              <input
                className="w-full rounded border p-2"
                name="sku"
                placeholder="MED-1001"
                value={form.sku}
                onChange={handleChange}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Supplier name</label>
              <input
                className="w-full rounded border p-2"
                name="supplier"
                placeholder="ABC Medical Suppliers"
                value={form.supplier}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Numeric values</h2>
          <p className="mt-1 text-sm text-slate-500">These fields should contain numbers only.</p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Opening quantity</label>
              <input
                className="w-full rounded border p-2"
                name="openingQuantity"
                type="number"
                min="0"
                placeholder="0"
                value={form.openingQuantity}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Reorder level</label>
              <input
                className="w-full rounded border p-2"
                name="reorderLevel"
                type="number"
                min="0"
                placeholder="10"
                value={form.reorderLevel}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Unit cost</label>
              <input
                className="w-full rounded border p-2"
                name="unitCost"
                type="number"
                min="0"
                step="0.01"
                placeholder="25"
                value={form.unitCost}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <button disabled={submitting} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-3 rounded">
          {submitting ? "Saving..." : "Add Item"}
        </button>
      </form>
    </div>
  );
}
