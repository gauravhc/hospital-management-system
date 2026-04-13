"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import { DataTable, ModulePageShell, SectionCard, SubmitButton, TextField } from "./common";

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [medicineForm, setMedicineForm] = useState({ name: "", sku: "", category: "", unit_price: "", stock_quantity: "", reorder_level: "" });
  const [dispenseForm, setDispenseForm] = useState({ medicine_id: "", patient_id: "", doctor_id: "", quantity: "1" });

  const load = async () => {
    const [medicineRes, orderRes, salesRes] = await Promise.all([apiGet("/api/pharmacy/medicines"), apiGet("/api/pharmacy/orders"), apiGet("/api/pharmacy/sales")]);
    setMedicines(medicineRes.data || []);
    setOrders(orderRes.data || []);
    setSales(salesRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (setter) => (event) => setter((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const submit = async (event, url, payload, resetMessage, reset) => {
    event.preventDefault();
    try {
      setBusy(true);
      await apiPost(url, payload);
      await load();
      reset();
      setFeedback({ type: "success", message: resetMessage });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell title="Pharmacy" description="Manage medicines, dispense stock with automatic quantity reduction, and monitor medicine sales." feedback={feedback}>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Add Medicine">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/pharmacy/medicines", medicineForm, "Medicine saved successfully.", () => setMedicineForm({ name: "", sku: "", category: "", unit_price: "", stock_quantity: "", reorder_level: "" }))}>
            <TextField label="Medicine Name" name="name" value={medicineForm.name} onChange={handleChange(setMedicineForm)} required />
            <TextField label="SKU" name="sku" value={medicineForm.sku} onChange={handleChange(setMedicineForm)} />
            <TextField label="Category" name="category" value={medicineForm.category} onChange={handleChange(setMedicineForm)} />
            <TextField label="Unit Price" name="unit_price" value={medicineForm.unit_price} onChange={handleChange(setMedicineForm)} type="number" required />
            <TextField label="Stock Quantity" name="stock_quantity" value={medicineForm.stock_quantity} onChange={handleChange(setMedicineForm)} type="number" required />
            <TextField label="Reorder Level" name="reorder_level" value={medicineForm.reorder_level} onChange={handleChange(setMedicineForm)} type="number" />
            <SubmitButton busy={busy}>Save Medicine</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Dispense Medicine">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/pharmacy/orders", dispenseForm, "Medicine dispensed and stock updated.", () => setDispenseForm({ medicine_id: "", patient_id: "", doctor_id: "", quantity: "1" }))}>
            <TextField label="Medicine ID" name="medicine_id" value={dispenseForm.medicine_id} onChange={handleChange(setDispenseForm)} required />
            <TextField label="Patient ID" name="patient_id" value={dispenseForm.patient_id} onChange={handleChange(setDispenseForm)} />
            <TextField label="Doctor ID" name="doctor_id" value={dispenseForm.doctor_id} onChange={handleChange(setDispenseForm)} />
            <TextField label="Quantity" name="quantity" value={dispenseForm.quantity} onChange={handleChange(setDispenseForm)} type="number" required />
            <SubmitButton busy={busy}>Dispense</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Medicines">
        <DataTable columns={[{ key: "name", label: "Medicine" }, { key: "sku", label: "SKU" }, { key: "category", label: "Category" }, { key: "stock_quantity", label: "Stock" }, { key: "unit_price", label: "Price" }]} rows={medicines} />
      </SectionCard>

      <SectionCard title="Dispensing History">
        <DataTable columns={[{ key: "medicine_id", label: "Medicine ID" }, { key: "patient_id", label: "Patient ID" }, { key: "quantity", label: "Qty" }, { key: "status", label: "Status" }, { key: "total_amount", label: "Total" }]} rows={orders} />
      </SectionCard>

      <SectionCard title="Medicine Sales">
        <DataTable columns={[{ key: "medicine_name", label: "Medicine" }, { key: "patient_id", label: "Patient" }, { key: "quantity", label: "Qty" }, { key: "total_amount", label: "Sale Amount" }]} rows={sales} />
      </SectionCard>
    </ModulePageShell>
  );
}
