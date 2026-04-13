"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/services/api";
import { DataTable, ModulePageShell, SectionCard, SubmitButton, TextField } from "./common";

export default function LabReportsPage() {
  const [tests, setTests] = useState([]);
  const [reports, setReports] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testForm, setTestForm] = useState({ patient_id: "", doctor_id: "", test_name: "", test_code: "", notes: "" });
  const [reportForm, setReportForm] = useState({ patient_id: "", doctor_id: "", test_id: "", title: "", findings: "", result_summary: "" });

  const load = async () => {
    const [testRes, reportRes] = await Promise.all([apiGet("/api/lab/tests"), apiGet("/api/lab/reports")]);
    setTests(testRes.data || []);
    setReports(reportRes.data || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (setter) => (event) => setter((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const submit = async (event, url, payload, reset) => {
    event.preventDefault();
    try {
      setBusy(true);
      await apiPost(url, payload);
      reset();
      await load();
      setFeedback({ type: "success", message: "Lab module updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModulePageShell
      title="Lab Reports"
      description="Create lab test orders, publish result summaries, and review patient reports from one place."
      feedback={feedback}
    >
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Add Lab Test" description="Create a new test request for a patient.">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/lab/tests", testForm, () => setTestForm({ patient_id: "", doctor_id: "", test_name: "", test_code: "", notes: "" }))}>
            <TextField label="Patient ID" name="patient_id" value={testForm.patient_id} onChange={handleChange(setTestForm)} required />
            <TextField label="Doctor ID" name="doctor_id" value={testForm.doctor_id} onChange={handleChange(setTestForm)} />
            <TextField label="Test Name" name="test_name" value={testForm.test_name} onChange={handleChange(setTestForm)} required />
            <TextField label="Test Code" name="test_code" value={testForm.test_code} onChange={handleChange(setTestForm)} />
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Notes</span>
              <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400" name="notes" value={testForm.notes} onChange={handleChange(setTestForm)} />
            </label>
            <SubmitButton busy={busy}>Create Test</SubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Upload Result Summary" description="Create a patient-facing report after the lab work is completed.">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/lab/reports", reportForm, () => setReportForm({ patient_id: "", doctor_id: "", test_id: "", title: "", findings: "", result_summary: "" }))}>
            <TextField label="Patient ID" name="patient_id" value={reportForm.patient_id} onChange={handleChange(setReportForm)} required />
            <TextField label="Doctor ID" name="doctor_id" value={reportForm.doctor_id} onChange={handleChange(setReportForm)} />
            <TextField label="Test ID" name="test_id" value={reportForm.test_id} onChange={handleChange(setReportForm)} />
            <TextField label="Report Title" name="title" value={reportForm.title} onChange={handleChange(setReportForm)} required />
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Findings</span>
              <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400" name="findings" value={reportForm.findings} onChange={handleChange(setReportForm)} />
            </label>
            <label className="block space-y-2 md:col-span-2">
              <span className="text-sm font-semibold text-slate-700">Result Summary</span>
              <textarea className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400" name="result_summary" value={reportForm.result_summary} onChange={handleChange(setReportForm)} />
            </label>
            <SubmitButton busy={busy}>Create Report</SubmitButton>
          </form>
        </SectionCard>
      </div>

      <SectionCard title="Lab Test Queue">
        <DataTable columns={[{ key: "test_name", label: "Test" }, { key: "patient_id", label: "Patient" }, { key: "doctor_id", label: "Doctor" }, { key: "status", label: "Status" }]} rows={tests} />
      </SectionCard>

      <SectionCard title="Patient Reports">
        <DataTable columns={[{ key: "title", label: "Title" }, { key: "patient_id", label: "Patient" }, { key: "test_id", label: "Test" }, { key: "status", label: "Status" }, { key: "result_summary", label: "Summary" }]} rows={reports} />
      </SectionCard>
    </ModulePageShell>
  );
}
