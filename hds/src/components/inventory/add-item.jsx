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
    description: "",
    category: "",
    subcategory: "",
    brand: "",
    unit: "",
    strengthSize: "",
    packaging: "",
    reorderLevel: "",
    reorderQuantity: "",
    unitCost: "",
    sellingPrice: "",
    expiryApplicable: true,
    supplier: "",
    batchTracking: true,
    location: "",
    gstCode: "",
  });

  // ️⃣ Handle Change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === "category") {
      setForm({
        ...form,
        category: value,
        subcategory: "",
        location: "",
      });
      return;
    }

    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // ️⃣ Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await apiPost(process.env.NEXT_PUBLIC_INVENTORY_ITEMS_API, form);
      if (res) {
        alert("Item added successfully!");
        window.location.href = "/inventory/items";
      }
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Error adding item.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add Inventory Item</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">

        <input className="border p-2" name="name" placeholder="Item Name" required onChange={handleChange} />

        <textarea className="border p-2" name="description" placeholder="Description" onChange={handleChange} />

        {/* CATEGORY */}
        <select
          name="category"
          value={form.category}
          onChange={handleChange}
          className="p-2 border rounded w-full"
          required
        >
          <option value="">-- Select Category --</option>
          {Object.keys(categoryOptions).map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* SUBCATEGORY */}
        <select
          name="subcategory"
          value={form.subcategory}
          onChange={handleChange}
          className="p-2 border rounded w-full"
          required
          disabled={!form.category}
        >
          <option value="">-- Select Subcategory --</option>
          {form.category &&
            categoryOptions[form.category].map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
        </select>

        <input className="border p-2" name="brand" placeholder="Brand" onChange={handleChange} />
        <input className="border p-2" name="unit" placeholder="Unit (tablet/bottle/piece)" onChange={handleChange} />
        <input className="border p-2" name="strengthSize" placeholder="Strength / Size" onChange={handleChange} />
        <input className="border p-2" name="packaging" placeholder="Packaging" onChange={handleChange} />

        <input className="border p-2" name="reorderLevel" type="number" placeholder="Reorder Level" onChange={handleChange} />
        <input className="border p-2" name="reorderQuantity" type="number" placeholder="Reorder Quantity" onChange={handleChange} />

        <input className="border p-2" name="unitCost" type="number" placeholder="Unit Cost" onChange={handleChange} />
        <input className="border p-2" name="sellingPrice" type="number" placeholder="Selling Price" onChange={handleChange} />

        <input className="border p-2" name="supplier" placeholder="Supplier Name" onChange={handleChange} />

        {/* STORAGE LOCATION */}
        <select
          name="location"
          value={form.location}
          onChange={handleChange}
          className="p-2 border rounded w-full"
          required
          disabled={!form.category}
        >
          <option value="">
            {form.category ? "-- Select Storage Location --" : "Select category first"}
          </option>

          {form.category &&
            storageMap[form.category]?.map((loc, idx) => (
              <option key={idx} value={loc}>
                {loc}
              </option>
            ))}
        </select>

        <input className="border p-2" name="gstCode" placeholder="GST/HST Code" onChange={handleChange} />

        <label className="flex items-center gap-2">
          <input type="checkbox" name="expiryApplicable" checked={form.expiryApplicable} onChange={handleChange} />
          Expiry Applicable
        </label>

        <label className="flex items-center gap-2">
          <input type="checkbox" name="batchTracking" checked={form.batchTracking} onChange={handleChange} />
          Batch Tracking
        </label>

        <button className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded">
          Add Item
        </button>
      </form>
    </div>
  );
}
