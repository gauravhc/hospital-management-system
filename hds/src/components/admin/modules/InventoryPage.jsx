"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import { DataTable, ModulePageShell, SectionCard, SubmitButton, TextField } from "./common";

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", sku: "", category: "", quantity: "", reorder_level: "", unit: "", unit_cost: "", supplier_name: "" });

  const load = async () => {
    const [itemRes, lowStockRes] = await Promise.all([apiGet("/api/inventory/items"), apiGet("/api/inventory/low-stock")]);
    setItems(itemRes.data || []);
    setLowStock(lowStockRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (event) => setItemForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await apiPost("/api/inventory/items", itemForm);
      await load();
      setItemForm({ name: "", sku: "", category: "", quantity: "", reorder_level: "", unit: "", unit_cost: "", supplier_name: "" });
      setFeedback({ type: "success", message: "Inventory item saved successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell title="Inventory" description="Track operational stock items, supplier details, and low-stock alerts for timely replenishment." feedback={feedback}>
      <SectionCard title="Add Inventory Item">
        <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
          <TextField label="Item Name" name="name" value={itemForm.name} onChange={handleChange} required />
          <TextField label="SKU" name="sku" value={itemForm.sku} onChange={handleChange} />
          <TextField label="Category" name="category" value={itemForm.category} onChange={handleChange} />
          <TextField label="Quantity" name="quantity" value={itemForm.quantity} onChange={handleChange} type="number" required />
          <TextField label="Reorder Level" name="reorder_level" value={itemForm.reorder_level} onChange={handleChange} type="number" />
          <TextField label="Unit" name="unit" value={itemForm.unit} onChange={handleChange} />
          <TextField label="Unit Cost" name="unit_cost" value={itemForm.unit_cost} onChange={handleChange} type="number" />
          <TextField label="Supplier Name" name="supplier_name" value={itemForm.supplier_name} onChange={handleChange} />
          <SubmitButton busy={busy}>Save Item</SubmitButton>
        </form>
      </SectionCard>

      <SectionCard title="Inventory Items">
        <DataTable columns={[{ key: "name", label: "Item" }, { key: "category", label: "Category" }, { key: "quantity", label: "Quantity" }, { key: "reorder_level", label: "Reorder Level" }, { key: "supplier_name", label: "Supplier" }]} rows={items} />
      </SectionCard>

      <SectionCard title="Low Stock Alerts">
        <DataTable columns={[{ key: "name", label: "Item" }, { key: "quantity", label: "Quantity" }, { key: "reorder_level", label: "Reorder Level" }, { key: "supplier_name", label: "Supplier" }]} rows={lowStock} />
      </SectionCard>
    </ModulePageShell>
  );
}
