"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/services/api";
import {
  DataTable,
  ModulePageShell,
  SectionCard,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/admin/modules/common";

const EMPTY_FORM = {
  employee_id: "",
  pay_period: "",
  basic_salary: "",
  allowances: "",
  deductions: "",
};

export default function HRPayrollPage() {
  const [payroll, setPayroll] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({
    q: "",
    status: "",
    department: "",
    pay_period: "",
  });
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filterBusy, setFilterBusy] = useState(false);

  const load = async (activeFilters = filters) => {
    const [payrollRes, staffRes] = await Promise.all([
      apiGet("/api/hr/payroll", activeFilters),
      apiGet("/api/hr/staff"),
    ]);
    setPayroll(payrollRes.data || []);
    setStaff(staffRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const staffOptions = useMemo(
    () =>
      staff.map((row) => ({
        value: String(row.id),
        label: `${row.full_name || row.name || row.email || `Employee ${row.id}`} (${row.staff_role || row.role || "staff"})`,
      })),
    [staff]
  );

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleFilterChange = (event) => {
    setFilters((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const applyFilters = async (event) => {
    event.preventDefault();
    try {
      setFilterBusy(true);
      await load(filters);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setFilterBusy(false);
    }
  };

  const resetFilters = async () => {
    const cleared = { q: "", status: "", department: "", pay_period: "" };
    setFilters(cleared);
    try {
      setFilterBusy(true);
      await load(cleared);
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setFilterBusy(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setFeedback(null);
      await apiPost("/api/hr/payroll", form);
      setForm(EMPTY_FORM);
      await load();
      setFeedback({ type: "success", message: "Payroll created successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (row) => {
    try {
      await apiPut(`/api/hr/payroll/${row.id}/status`, { status: "paid" });
      await load();
      setFeedback({ type: "success", message: "Payroll marked as paid." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  };

  const exportPayroll = () => {
    const rows = payroll.map((row) => ({
      employee_id: row.employee_id,
      employee_name: row.employee_name || "",
      employee_department: row.employee_department || "",
      pay_period: row.pay_period || "",
      basic_salary: row.basic_salary || 0,
      allowances: row.allowances || 0,
      deductions: row.deductions || 0,
      net_salary: row.net_salary || 0,
      status: row.status || "",
    }));

    const header = Object.keys(rows[0] || {
      employee_id: "",
      employee_name: "",
      employee_department: "",
      pay_period: "",
      basic_salary: "",
      allowances: "",
      deductions: "",
      net_salary: "",
      status: "",
    });

    const csv = [
      header.join(","),
      ...rows.map((row) =>
        header
          .map((key) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hr-payroll-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadSlip = (row) => {
    const slip = [
      "Hospital HR Salary Slip",
      "-----------------------",
      `Employee ID: ${row.employee_id || "--"}`,
      `Employee Name: ${row.employee_name || "--"}`,
      `Department: ${row.employee_department || "--"}`,
      `Role: ${row.employee_role || "--"}`,
      `Pay Period: ${row.pay_period || "--"}`,
      `Basic Salary: ${row.basic_salary || 0}`,
      `Allowances: ${row.allowances || 0}`,
      `Deductions: ${row.deductions || 0}`,
      `Net Salary: ${row.net_salary || 0}`,
      `Status: ${row.status || "--"}`,
    ].join("\n");

    const blob = new Blob([slip], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `salary-slip-${row.employee_id || row.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ModulePageShell
      title="Payroll Processing"
      description="Create salary runs, monitor processed payroll, and close the loop once salary is paid."
      feedback={feedback}
    >
      <SectionCard title="Create payroll" description="Record a salary entry with allowances and deductions for the chosen employee.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
          <SelectField label="Employee" name="employee_id" value={form.employee_id} onChange={handleChange} options={staffOptions} required />
          <TextField label="Pay period" name="pay_period" value={form.pay_period} onChange={handleChange} placeholder="2026-04" required />
          <TextField label="Basic salary" name="basic_salary" value={form.basic_salary} onChange={handleChange} type="number" required />
          <TextField label="Allowances" name="allowances" value={form.allowances} onChange={handleChange} type="number" />
          <TextField label="Deductions" name="deductions" value={form.deductions} onChange={handleChange} type="number" />
          <div className="md:col-span-2 xl:col-span-5">
            <SubmitButton busy={busy}>Process Payroll</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Payroll filters and export" description="Filter payroll by employee, department, period, or status, then export the current list.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
          <TextField label="Search" name="q" value={filters.q} onChange={handleFilterChange} placeholder="Employee ID, name, email" />
          <SelectField
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { value: "pending", label: "Pending" },
              { value: "processed", label: "Processed" },
              { value: "paid", label: "Paid" },
            ]}
            placeholder="All statuses"
          />
          <TextField label="Department" name="department" value={filters.department} onChange={handleFilterChange} placeholder="Department" />
          <TextField label="Pay period" name="pay_period" value={filters.pay_period} onChange={handleFilterChange} placeholder="2026-04" />
          <div className="flex items-end gap-3 md:col-span-2 xl:col-span-4">
            <SubmitButton busy={filterBusy}>Apply Filters</SubmitButton>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={exportPayroll}
              className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white"
            >
              Export Payroll CSV
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Payroll records" description="Review created payroll entries and mark them paid after payout is completed.">
        <DataTable
          columns={[
            { key: "employee_id", label: "Employee ID" },
            {
              key: "employee_name",
              label: "Name",
              render: (row) => row.employee_name || "--",
            },
            {
              key: "employee_department",
              label: "Department",
              render: (row) => row.employee_department || "--",
            },
            { key: "pay_period", label: "Pay period" },
            { key: "basic_salary", label: "Basic" },
            { key: "allowances", label: "Allowances" },
            { key: "deductions", label: "Deductions" },
            { key: "net_salary", label: "Net salary" },
            { key: "status", label: "Status" },
            {
              key: "slip",
              label: "Salary Slip",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => downloadSlip(row)}
                  className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700"
                >
                  Download Slip
                </button>
              ),
            },
            {
              key: "action",
              label: "Payment",
              render: (row) =>
                String(row.status || "").toLowerCase() === "paid" ? (
                  <span className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    Paid
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => markPaid(row)}
                    className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                  >
                    Mark Paid
                  </button>
                ),
            },
          ]}
          rows={payroll}
          emptyMessage="No payroll records have been created yet."
        />
      </SectionCard>
    </ModulePageShell>
  );
}
