"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import { DataTable, ModulePageShell, SectionCard, SubmitButton, TextField } from "./common";

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({ patient_id: "", appointment_id: "", subtotal: "", tax_amount: "", discount_amount: "", total_amount: "", due_date: "" });
  const [paymentForm, setPaymentForm] = useState({ invoice_id: "", amount: "", payment_method: "cash", reference_no: "" });

  const load = async () => {
    const [invoiceRes, paymentRes] = await Promise.all([apiGet("/api/billing/invoices"), apiGet("/api/payments/history")]);
    setInvoices(invoiceRes.data || []);
    setPayments(paymentRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (setter) => (event) => setter((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const submit = async (event, url, payload, successMessage, reset) => {
    event.preventDefault();
    try {
      setBusy(true);
      await apiPost(url, payload);
      await load();
      reset();
      setFeedback({ type: "success", message: successMessage });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell title="Billing" description="Generate patient invoices, record payments, and watch invoice status move to paid as collections come in." feedback={feedback}>
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Generate Invoice">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/billing/invoices", invoiceForm, "Invoice generated successfully.", () => setInvoiceForm({ patient_id: "", appointment_id: "", subtotal: "", tax_amount: "", discount_amount: "", total_amount: "", due_date: "" }))}>
            <TextField label="Patient ID" name="patient_id" value={invoiceForm.patient_id} onChange={handleChange(setInvoiceForm)} required />
            <TextField label="Appointment ID" name="appointment_id" value={invoiceForm.appointment_id} onChange={handleChange(setInvoiceForm)} />
            <TextField label="Subtotal" name="subtotal" value={invoiceForm.subtotal} onChange={handleChange(setInvoiceForm)} type="number" required />
            <TextField label="Tax Amount" name="tax_amount" value={invoiceForm.tax_amount} onChange={handleChange(setInvoiceForm)} type="number" />
            <TextField label="Discount" name="discount_amount" value={invoiceForm.discount_amount} onChange={handleChange(setInvoiceForm)} type="number" />
            <TextField label="Total Amount" name="total_amount" value={invoiceForm.total_amount} onChange={handleChange(setInvoiceForm)} type="number" />
            <TextField label="Due Date" name="due_date" value={invoiceForm.due_date} onChange={handleChange(setInvoiceForm)} type="date" />
            <SubmitButton busy={busy}>Create Invoice</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Record Payment">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/payments", paymentForm, "Payment recorded and invoice status refreshed.", () => setPaymentForm({ invoice_id: "", amount: "", payment_method: "cash", reference_no: "" }))}>
            <TextField label="Invoice ID" name="invoice_id" value={paymentForm.invoice_id} onChange={handleChange(setPaymentForm)} required />
            <TextField label="Amount" name="amount" value={paymentForm.amount} onChange={handleChange(setPaymentForm)} type="number" required />
            <TextField label="Payment Method" name="payment_method" value={paymentForm.payment_method} onChange={handleChange(setPaymentForm)} />
            <TextField label="Reference No." name="reference_no" value={paymentForm.reference_no} onChange={handleChange(setPaymentForm)} />
            <SubmitButton busy={busy}>Record Payment</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Invoices">
        <DataTable columns={[{ key: "invoice_number", label: "Invoice No." }, { key: "patient_id", label: "Patient" }, { key: "total_amount", label: "Total" }, { key: "status", label: "Status" }, { key: "due_date", label: "Due Date" }]} rows={invoices} />
      </SectionCard>

      <SectionCard title="Payments">
        <DataTable columns={[{ key: "invoice_id", label: "Invoice" }, { key: "patient_id", label: "Patient" }, { key: "amount", label: "Amount" }, { key: "payment_method", label: "Method" }, { key: "status", label: "Status" }]} rows={payments} />
      </SectionCard>
    </ModulePageShell>
  );
}
