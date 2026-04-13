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
  staff_id: "",
  leave_type: "casual",
  start_date: "",
  end_date: "",
  reason: "",
};

export default function HRLeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({
    q: "",
    staff_id: "",
    status: "",
    department: "",
    date_from: "",
    date_to: "",
  });
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filterBusy, setFilterBusy] = useState(false);

  const load = async (activeFilters = filters) => {
    const [leaveRes, staffRes] = await Promise.all([
      apiGet("/api/hr/leaves", activeFilters),
      apiGet("/api/hr/staff"),
    ]);
    setLeaves(leaveRes.data || []);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await apiPost("/api/hr/leaves", form);
      setForm(EMPTY_FORM);
      await load(filters);
      setFeedback({ type: "success", message: "Leave request created successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
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
    const cleared = {
      q: "",
      staff_id: "",
      status: "",
      department: "",
      date_from: "",
      date_to: "",
    };
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

  const updateLeaveStatus = async (row, status) => {
    try {
      await apiPut(`/api/hr/leaves/${row.id}/status`, { status });
      await load(filters);
      setFeedback({ type: "success", message: `Leave ${status} successfully.` });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  };

  return (
    <ModulePageShell
      title="Leave Management"
      description="Create leave requests, monitor their status, and approve or reject them from the HR desk."
      feedback={feedback}
    >
      <SectionCard title="Create leave request" description="Record leave details for an employee and keep the schedule transparent.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleSubmit}>
          <SelectField label="Employee" name="staff_id" value={form.staff_id} onChange={handleChange} options={staffOptions} required />
          <SelectField
            label="Leave type"
            name="leave_type"
            value={form.leave_type}
            onChange={handleChange}
            options={[
              { value: "casual", label: "Casual" },
              { value: "sick", label: "Sick" },
              { value: "earned", label: "Earned" },
              { value: "emergency", label: "Emergency" },
            ]}
            required
          />
          <TextField label="Start date" name="start_date" value={form.start_date} onChange={handleChange} type="date" required />
          <TextField label="End date" name="end_date" value={form.end_date} onChange={handleChange} type="date" required />
          <TextField label="Reason" name="reason" value={form.reason} onChange={handleChange} placeholder="Optional note" />
          <div className="md:col-span-2 xl:col-span-5">
            <SubmitButton busy={busy}>Save Leave Request</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Leave filters" description="Search leave records by employee, department, status, or date range.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
          <TextField label="Search" name="q" value={filters.q} onChange={handleFilterChange} placeholder="Employee, email, leave type" />
          <SelectField label="Employee" name="staff_id" value={filters.staff_id} onChange={handleFilterChange} options={staffOptions} placeholder="All employees" />
          <SelectField
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
            placeholder="All statuses"
          />
          <TextField label="Department" name="department" value={filters.department} onChange={handleFilterChange} placeholder="Department" />
          <TextField label="From date" name="date_from" value={filters.date_from} onChange={handleFilterChange} type="date" />
          <TextField label="To date" name="date_to" value={filters.date_to} onChange={handleFilterChange} type="date" />
          <div className="flex items-end gap-3 md:col-span-2">
            <SubmitButton busy={filterBusy}>Apply Filters</SubmitButton>
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Reset
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Leave records" description="Approve or reject pending leave requests after review.">
        <DataTable
          columns={[
            { key: "staff_id", label: "Employee ID" },
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
            { key: "leave_type", label: "Leave Type" },
            { key: "start_date", label: "Start Date" },
            { key: "end_date", label: "End Date" },
            { key: "total_days", label: "Days" },
            { key: "status", label: "Status" },
            {
              key: "action",
              label: "Action",
              render: (row) =>
                String(row.status || "").toLowerCase() === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => updateLeaveStatus(row, "approved")}
                      className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLeaveStatus(row, "rejected")}
                      className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs font-semibold text-slate-500">Reviewed</span>
                ),
            },
          ]}
          rows={leaves}
          emptyMessage="No leave records found yet."
        />
      </SectionCard>
    </ModulePageShell>
  );
}
