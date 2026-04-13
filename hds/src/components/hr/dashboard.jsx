"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/services/api";
import {
  DataTable,
  ModulePageShell,
  SectionCard,
} from "@/components/admin/modules/common";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const normalizeStaffName = (row) =>
  row?.full_name || row?.name || row?.employee_name || row?.email || "Unnamed staff";

export default function HRDashboard() {
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, attendanceRes, payrollRes] = await Promise.all([
          apiGet("/api/hr/staff"),
          apiGet("/api/hr/attendance"),
          apiGet("/api/hr/payroll"),
        ]);

        setStaff(staffRes.data || []);
        setAttendance(attendanceRes.data || []);
        setPayroll(payrollRes.data || []);
      } catch (error) {
        setFeedback({ type: "error", message: error.message });
      }
    };

    load();
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const presentAttendanceToday = useMemo(() => {
    return attendance.filter(
      (row) =>
        String(row.date || "").slice(0, 10) === today &&
        String(row.status || "").toLowerCase() === "present"
    );
  }, [attendance, today]);

  const presentEmployeesToday = useMemo(() => {
    const staffById = new Map(staff.map((row) => [String(row.id), row]));

    return presentAttendanceToday.map((row) => {
      const employeeId = String(row.staff_id ?? row.user_id ?? "");
      const staffRow = staffById.get(employeeId);

      return {
        id: `${row.id || employeeId}-${row.date || today}`,
        employee_id: employeeId || "--",
        name: normalizeStaffName(staffRow || row),
        role: staffRow?.staff_role || staffRow?.role || "--",
        email: staffRow?.email || "--",
        date: row.date || "--",
      };
    });
  }, [presentAttendanceToday, staff, today]);

  const attendanceSnapshot = useMemo(() => {
    return presentAttendanceToday.reduce(
      (acc, row) => {
        const key = String(row.status || "unknown").toLowerCase();
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {}
    );
  }, [presentAttendanceToday]);

  const pendingPayroll = payroll.filter(
    (row) => String(row.status || "").toLowerCase() !== "paid"
  );

  const totalPayrollValue = payroll.reduce(
    (sum, row) => sum + Number(row.net_salary || 0),
    0
  );

  return (
    <ModulePageShell
      title="HR Command Center"
      description="Manage workforce records, mark attendance, and stay on top of salary processing from one clean HR workspace."
      feedback={feedback}
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total staff", value: staff.length, tone: "bg-sky-50 text-sky-700" },
          { label: "Present today", value: attendanceSnapshot.present || 0, tone: "bg-emerald-50 text-emerald-700" },
          { label: "Pending payroll", value: pendingPayroll.length, tone: "bg-amber-50 text-amber-700" },
          { label: "Payroll recorded", value: formatCurrency(totalPayrollValue), tone: "bg-violet-50 text-violet-700" },
        ].map((card) => (
          <div key={card.label} className="rounded-3xl border border-white/40 bg-white/95 p-5 shadow-lg">
            <p className="text-sm font-semibold text-slate-500">{card.label}</p>
            <p className={`mt-3 inline-flex rounded-2xl px-3 py-2 text-2xl font-extrabold ${card.tone}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <SectionCard title="HR workflow" description="Move through the module in the same order a real HR desk usually works.">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "Manage staff",
              text: "Add and review employee records, departments, and role assignments.",
              href: "/hr/staff",
              cta: "Open Staff",
            },
            {
              title: "Mark attendance",
              text: "Capture present, absent, or leave status for the hospital workforce.",
              href: "/hr/attendance",
              cta: "Open Attendance",
            },
            {
              title: "Run payroll",
              text: "Create salary runs and mark processed payroll entries as paid.",
              href: "/hr/payroll",
              cta: "Open Payroll",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-lg font-bold text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.text}</p>
              <Link
                href={item.href}
                className="mt-4 inline-flex rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                {item.cta}
              </Link>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent employees" description="Newest employee records added for this hospital.">
          <DataTable
            columns={[
              {
                key: "name",
                label: "Name",
                render: (row) => normalizeStaffName(row),
              },
              {
                key: "role",
                label: "Role",
                render: (row) => row.staff_role || row.role || "--",
              },
              { key: "department", label: "Department" },
              { key: "email", label: "Email" },
            ]}
            rows={staff.slice(0, 6)}
            emptyMessage="No staff records found yet."
          />
        </SectionCard>

        <SectionCard title="Latest payroll activity" description="Recent salary entries and their payment status.">
          <DataTable
            columns={[
              { key: "employee_id", label: "Employee ID" },
              { key: "pay_period", label: "Pay period" },
              { key: "net_salary", label: "Net salary" },
              { key: "status", label: "Status" },
            ]}
            rows={payroll.slice(0, 6)}
            emptyMessage="No payroll records have been created yet."
          />
        </SectionCard>
      </div>

      <SectionCard
        title="Present employees today"
        description="Everyone currently marked present for today based on the attendance entries recorded in HR."
      >
        <DataTable
          columns={[
            { key: "employee_id", label: "Employee ID" },
            { key: "name", label: "Name" },
            { key: "role", label: "Role" },
            { key: "email", label: "Email" },
            { key: "date", label: "Attendance date" },
          ]}
          rows={presentEmployeesToday}
          emptyMessage="No employees have been marked present today yet."
        />
      </SectionCard>

      <SectionCard title="Attendance pulse" description="Quick look at the latest attendance rows already recorded in the system.">
        <DataTable
          columns={[
            {
              key: "employee_id",
              label: "Employee ID",
              render: (row) => row.staff_id ?? row.user_id ?? "--",
            },
            { key: "date", label: "Date" },
            { key: "status", label: "Status" },
            { key: "notes", label: "Notes" },
          ]}
          rows={attendance.slice(0, 8)}
          emptyMessage="Attendance has not been recorded yet."
        />
      </SectionCard>
    </ModulePageShell>
  );
}
