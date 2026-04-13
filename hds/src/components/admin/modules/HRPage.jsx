"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/services/api";
import { DataTable, ModulePageShell, SectionCard, SubmitButton, TextField } from "./common";

export default function HRPage() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", phone: "", role: "", department: "" });
  const [attendanceForm, setAttendanceForm] = useState({ user_id: "", date: "", status: "present", notes: "" });
  const [payrollForm, setPayrollForm] = useState({ employee_id: "", pay_period: "", basic_salary: "", allowances: "", deductions: "" });

  const load = async () => {
    const [staffRes, attendanceRes, payrollRes] = await Promise.all([
      apiGet("/api/hr/staff"),
      apiGet("/api/hr/attendance"),
      apiGet("/api/hr/payroll"),
    ]);
    setStaff(staffRes.data || []);
    setAttendance(attendanceRes.data || []);
    setPayroll(payrollRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (setter) => (event) => setter((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const submit = async (event, fn, successMessage, reset) => {
    event.preventDefault();
    try {
      setBusy(true);
      await fn();
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
    <ModulePageShell title="HR" description="Manage employees, capture attendance, and process payroll records for the hospital workforce." feedback={feedback}>
      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard title="Add Employee">
          <form className="grid gap-4" onSubmit={(event) => submit(event, () => apiPost("/api/hr/staff", staffForm), "Employee added successfully.", () => setStaffForm({ name: "", email: "", phone: "", role: "", department: "" }))}>
            <TextField label="Name" name="name" value={staffForm.name} onChange={handleChange(setStaffForm)} required />
            <TextField label="Email" name="email" value={staffForm.email} onChange={handleChange(setStaffForm)} required />
            <TextField label="Phone" name="phone" value={staffForm.phone} onChange={handleChange(setStaffForm)} />
            <TextField label="Role" name="role" value={staffForm.role} onChange={handleChange(setStaffForm)} required />
            <TextField label="Department" name="department" value={staffForm.department} onChange={handleChange(setStaffForm)} />
            <SubmitButton busy={busy}>Save Employee</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Mark Attendance">
          <form className="grid gap-4" onSubmit={(event) => submit(event, () => apiPost("/api/hr/attendance", attendanceForm), "Attendance recorded successfully.", () => setAttendanceForm({ user_id: "", date: "", status: "present", notes: "" }))}>
            <TextField label="Employee ID" name="user_id" value={attendanceForm.user_id} onChange={handleChange(setAttendanceForm)} required />
            <TextField label="Date" name="date" value={attendanceForm.date} onChange={handleChange(setAttendanceForm)} type="date" required />
            <TextField label="Status" name="status" value={attendanceForm.status} onChange={handleChange(setAttendanceForm)} />
            <TextField label="Notes" name="notes" value={attendanceForm.notes} onChange={handleChange(setAttendanceForm)} />
            <SubmitButton busy={busy}>Record Attendance</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Create Payroll">
          <form className="grid gap-4" onSubmit={(event) => submit(event, () => apiPost("/api/hr/payroll", payrollForm), "Payroll processed successfully.", () => setPayrollForm({ employee_id: "", pay_period: "", basic_salary: "", allowances: "", deductions: "" }))}>
            <TextField label="Employee ID" name="employee_id" value={payrollForm.employee_id} onChange={handleChange(setPayrollForm)} required />
            <TextField label="Pay Period" name="pay_period" value={payrollForm.pay_period} onChange={handleChange(setPayrollForm)} placeholder="2026-03" />
            <TextField label="Basic Salary" name="basic_salary" value={payrollForm.basic_salary} onChange={handleChange(setPayrollForm)} type="number" required />
            <TextField label="Allowances" name="allowances" value={payrollForm.allowances} onChange={handleChange(setPayrollForm)} type="number" />
            <TextField label="Deductions" name="deductions" value={payrollForm.deductions} onChange={handleChange(setPayrollForm)} type="number" />
            <SubmitButton busy={busy}>Process Payroll</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Employees">
        <DataTable columns={[{ key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "department", label: "Department" }, { key: "email", label: "Email" }]} rows={staff} />
      </SectionCard>

      <SectionCard title="Attendance">
        <DataTable columns={[{ key: "user_id", label: "Employee ID" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }, { key: "notes", label: "Notes" }]} rows={attendance} />
      </SectionCard>

      <SectionCard title="Payroll Records" description="Use the action button to mark a processed payroll entry as paid.">
        <DataTable
          columns={[
            { key: "employee_id", label: "Employee ID" },
            { key: "pay_period", label: "Pay Period" },
            { key: "net_salary", label: "Net Salary" },
            { key: "status", label: "Status" },
            {
              key: "action",
              label: "Action",
              render: (row) => (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await apiPut(`/api/hr/payroll/${row.id}/status`, { status: "paid" });
                      await load();
                      setFeedback({ type: "success", message: "Payroll marked as paid." });
                    } catch (error) {
                      setFeedback({ type: "error", message: error.message });
                    }
                  }}
                  className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                >
                  Mark Paid
                </button>
              ),
            },
          ]}
          rows={payroll}
        />
      </SectionCard>
    </ModulePageShell>
  );
}
