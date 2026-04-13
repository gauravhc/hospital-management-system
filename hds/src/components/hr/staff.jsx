"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/services/api";
import {
  DataTable,
  ModulePageShell,
  SectionCard,
  SelectField,
  SubmitButton,
  TextField,
} from "@/components/admin/modules/common";

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  role: "",
  department: "",
};

const ROLE_OPTIONS = [
  { value: "hrmanager", label: "HR Manager" },
  { value: "accountant", label: "Accountant" },
  { value: "pharmacist", label: "Pharmacist" },
  { value: "labtechnician", label: "Lab Technician" },
  { value: "inventorymanager", label: "Inventory Manager" },
  { value: "receptionist", label: "Receptionist" },
  { value: "staff", label: "General Staff" },
];

export default function HRStaffPage() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [filters, setFilters] = useState({ q: "", role: "", department: "" });
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [filterBusy, setFilterBusy] = useState(false);

  const load = async (activeFilters = filters) => {
    const response = await apiGet("/api/hr/staff", activeFilters);
    setStaff(response.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (event) => {
    setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleEditChange = (event) => {
    setEditForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
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
    const cleared = { q: "", role: "", department: "" };
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
      await apiPost("/api/hr/staff", form);
      setForm(EMPTY_FORM);
      await load();
      setFeedback({ type: "success", message: "Employee created successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  const removeStaff = async (id) => {
    try {
      await apiDelete(`/api/hr/staff/${id}`);
      await load();
      setFeedback({ type: "success", message: "Employee removed successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    }
  };

  const startEdit = (row) => {
    setSelectedEmployee(row);
    setEditForm({
      name: row.full_name || row.name || "",
      email: row.email || "",
      phone: row.phone || row.mobile || "",
      role: row.staff_role || row.role || "",
      department: row.department || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!selectedEmployee) return;
    try {
      setBusy(true);
      await apiPut(`/api/hr/staff/${selectedEmployee.id}`, editForm);
      await load(filters);
      setSelectedEmployee(null);
      setEditForm(EMPTY_FORM);
      setFeedback({ type: "success", message: "Employee updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell
      title="Staff Directory"
      description="Create employee records for operational roles and keep the hospital workforce list tidy."
      feedback={feedback}
    >
      <SectionCard title="Add employee" description="Create a staff-side account and assign the operational role from here.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={handleSubmit}>
          <TextField label="Full name" name="name" value={form.name} onChange={handleChange} required />
          <TextField label="Email" name="email" value={form.email} onChange={handleChange} required />
          <TextField label="Phone" name="phone" value={form.phone} onChange={handleChange} />
          <SelectField label="Role" name="role" value={form.role} onChange={handleChange} options={ROLE_OPTIONS} required />
          <TextField label="Department" name="department" value={form.department} onChange={handleChange} placeholder="Radiology, Front Desk, Finance..." />
          <div className="flex items-end">
            <SubmitButton busy={busy}>Save Employee</SubmitButton>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Filter employees" description="Search by name, email, or phone and narrow the list by role or department.">
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={applyFilters}>
          <TextField label="Search" name="q" value={filters.q} onChange={handleFilterChange} placeholder="Name, email, or phone" />
          <SelectField label="Role" name="role" value={filters.role} onChange={handleFilterChange} options={ROLE_OPTIONS} placeholder="All roles" />
          <TextField label="Department" name="department" value={filters.department} onChange={handleFilterChange} placeholder="Front Desk, Finance..." />
          <div className="flex items-end gap-3">
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

      {selectedEmployee ? (
        <SectionCard title="Edit employee" description={`Update details for ${selectedEmployee.full_name || selectedEmployee.name || selectedEmployee.email}.`}>
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" onSubmit={saveEdit}>
            <TextField label="Full name" name="name" value={editForm.name} onChange={handleEditChange} required />
            <TextField label="Email" name="email" value={editForm.email} onChange={handleEditChange} required />
            <TextField label="Phone" name="phone" value={editForm.phone} onChange={handleEditChange} />
            <SelectField label="Role" name="role" value={editForm.role} onChange={handleEditChange} options={ROLE_OPTIONS} required />
            <TextField label="Department" name="department" value={editForm.department} onChange={handleEditChange} placeholder="Radiology, Front Desk, Finance..." />
            <div className="flex items-end gap-3">
              <SubmitButton busy={busy}>Update Employee</SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setSelectedEmployee(null);
                  setEditForm(EMPTY_FORM);
                }}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="Current employees" description="Review the employee directory and remove records that should not remain active.">
        <DataTable
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => row.full_name || row.name || row.email || "--",
            },
            {
              key: "role",
              label: "Role",
              render: (row) => row.staff_role || row.role || "--",
            },
            { key: "department", label: "Department" },
            { key: "phone", label: "Phone" },
            { key: "email", label: "Email" },
            {
              key: "edit_action",
              label: "Edit",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => startEdit(row)}
                  className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-bold text-sky-700"
                >
                  Edit
                </button>
              ),
            },
            {
              key: "remove_action",
              label: "Remove",
              render: (row) => (
                <button
                  type="button"
                  onClick={() => removeStaff(row.id)}
                  className="rounded-xl bg-rose-100 px-3 py-2 text-xs font-bold text-rose-700"
                >
                  Remove
                </button>
              ),
            },
          ]}
          rows={staff}
          emptyMessage="No employees have been added yet."
        />
      </SectionCard>
    </ModulePageShell>
  );
}
