"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
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
  date: new Date().toISOString().slice(0, 10),
  status: "present",
  notes: "",
};

export default function HRAttendancePage() {
  const [attendance, setAttendance] = useState([]);
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
    const [attendanceRes, staffRes] = await Promise.all([
      apiGet("/api/hr/attendance", activeFilters),
      apiGet("/api/hr/staff"),
    ]);
    setAttendance(attendanceRes.data || []);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      setFeedback(null);
      await apiPost("/api/hr/attendance", form);
      setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
      await load();
      setFeedback({ type: "success", message: "Attendance recorded successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell
      title="Attendance Desk"
      description="Mark workforce presence, absence, or leave without leaving the HR workflow."
      feedback={feedback}
    >
      <SectionCard title="Record attendance" description="Choose an employee and store the attendance status for the selected date.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={handleSubmit}>
          <SelectField label="Employee" name="staff_id" value={form.staff_id} onChange={handleChange} options={staffOptions} required />
          <TextField label="Date" name="date" value={form.date} onChange={handleChange} type="date" required />
          <SelectField
            label="Status"
            name="status"
            value={form.status}
            onChange={handleChange}
            options={[
              { value: "present", label: "Present" },
              { value: "absent", label: "Absent" },
            ]}
            required
          />
          <TextField label="Notes" name="notes" value={form.notes} onChange={handleChange} placeholder="Optional note" />
          <div className="md:col-span-2 xl:col-span-4">
            <SubmitButton busy={busy}>Record Attendance</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Attendance filters" description="Review attendance by employee, department, status, or a date range.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
          <TextField label="Search" name="q" value={filters.q} onChange={handleFilterChange} placeholder="Name, email, phone" />
          <SelectField label="Employee" name="staff_id" value={filters.staff_id} onChange={handleFilterChange} options={staffOptions} placeholder="All employees" />
          <SelectField
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={[
              { value: "present", label: "Present" },
              { value: "absent", label: "Absent" },
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

      <SectionCard title="Attendance log" description="Latest attendance records for this hospital workforce.">
        <DataTable
          columns={[
            {
              key: "staff_id",
              label: "Employee ID",
              render: (row) => row.staff_id ?? row.user_id ?? "--",
            },
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
            { key: "date", label: "Date" },
            { key: "status", label: "Status" },
            { key: "notes", label: "Notes" },
          ]}
          rows={attendance}
          emptyMessage="Attendance has not been captured yet."
        />
      </SectionCard>
    </ModulePageShell>
  );
}
