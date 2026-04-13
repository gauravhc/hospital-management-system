"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut } from "@/services/api";
import backendUrl from "@/lib/backendUrl";
import { DataTable, ModulePageShell, SectionCard, SelectField, SubmitButton, TextField } from "./common";

export default function InsurancePage() {
  const [details, setDetails] = useState([]);
  const [claims, setClaims] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [patients, setPatients] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [busy, setBusy] = useState(false);
  const [claimStatusBusyId, setClaimStatusBusyId] = useState(null);
  const [detailForm, setDetailForm] = useState({
    patient_id: "",
    policy_id: "",
    provider_name: "",
    policy_number: "",
    plan_name: "",
    coverage_details: "",
    valid_till: "",
    status: "active",
    notes: "",
  });
  const [policyForm, setPolicyForm] = useState({ provider_name: "", policy_name: "", policy_number: "", coverage_details: "" });

  const load = async () => {
    const [detailRes, claimRes, policyRes, patientRes] = await Promise.all([
      apiGet("/api/insurance/details"),
      apiGet("/api/claims"),
      apiGet("/api/insurance/policies"),
      apiGet("/api/patients"),
    ]);
    setDetails(detailRes.data || []);
    setClaims(claimRes.data || []);
    setPolicies(policyRes.data || []);
    setPatients(patientRes.data || patientRes.patients || []);
  };

  useEffect(() => {
    load().catch((error) => setFeedback({ type: "error", message: error.message }));
  }, []);

  const handleChange = (setter) => (event) => setter((prev) => ({ ...prev, [event.target.name]: event.target.value }));

  const handleDetailChange = (event) => {
    const { name, value } = event.target;
    setDetailForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "policy_id") {
        const selectedPolicy = policies.find((policy) => String(policy?.id || "") === String(value || ""));
        if (selectedPolicy) {
          next.provider_name = selectedPolicy.provider_name || prev.provider_name || "";
          next.plan_name = selectedPolicy.policy_name || prev.plan_name || "";
          next.policy_number = selectedPolicy.policy_number || prev.policy_number || "";
          next.coverage_details = selectedPolicy.coverage_details || prev.coverage_details || "";
        }
      }
      return next;
    });
  };

  const patientOptions = patients.map((patient) => {
    const id = patient?.id ?? patient?.patient_id ?? "";
    const label = patient?.full_name || patient?.name || patient?.email || `Patient ${id}`;
    return { value: String(id), label: `${label} (${id})` };
  });

  const policyOptions = policies.map((policy) => {
    const id = policy?.id ?? "";
    const name = policy?.policy_name || policy?.plan_name || policy?.policy_number || `Policy ${id}`;
    const provider = policy?.provider_name || policy?.provider || "";
    return { value: String(id), label: provider ? `${provider} - ${name}` : `${name} (${id})` };
  });

  const policyNameById = new Map(
    policies.map((policy) => {
      const id = policy?.id ?? "";
      const provider = policy?.provider_name || policy?.provider || "";
      const name = policy?.policy_name || policy?.plan_name || policy?.policy_number || `Policy ${id}`;
      return [String(id), provider ? `${provider} - ${name}` : name];
    })
  );

  const formatPolicyLabel = (policy) => {
    if (!policy) return "--";
    const provider = policy?.provider_name || policy?.provider || "";
    const name = policy?.policy_name || policy?.plan_name || policy?.policy_number || `Policy ${policy?.id ?? ""}`;
    return provider ? `${provider} - ${name}` : name;
  };

  const formatAmount = (value) => {
    if (value === null || value === undefined || value === "") return "--";
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }) : value;
  };

  const formatDate = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toISOString().slice(0, 10);
  };

  const formatInvoice = (value) => {
    if (!value) return "--";
    return `Invoice ${value}`;
  };

  const getClaimDocumentUrl = (claim) =>
    claim?.attachment_url || claim?.document_url || claim?.file_url || claim?.attachment_path || claim?.file_path || "";

  const renderStatusBadge = (value) => {
    const status = String(value || "").toLowerCase();
    const label = status ? status.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase()) : "--";
    const className =
      status === "approved" || status === "active"
        ? "bg-emerald-50 text-emerald-700"
        : status === "rejected" || status === "inactive" || status === "expired"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{label}</span>;
  };

  const patientNameById = new Map(
    patients.map((patient) => {
      const id = patient?.id ?? patient?.patient_id ?? "";
      const label = patient?.full_name || patient?.name || patient?.email || `Patient ${id}`;
      return [String(id), label];
    })
  );

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

  const updateClaimStatus = async (claimId, status) => {
    try {
      setClaimStatusBusyId(claimId);
      await apiPut(`/api/claims/${claimId}`, { status });
      await load();
      setFeedback({ type: "success", message: "Claim status updated successfully." });
    } catch (error) {
      setFeedback({ type: "error", message: error.message });
    } finally {
      setClaimStatusBusyId(null);
    }
  };

  const visibleClaims = claims.filter((claim) => {
    const patientOk =
      !claim?.patient_id || patientNameById.has(String(claim.patient_id));
    const policyOk =
      !claim?.policy_id || policyNameById.has(String(claim.policy_id));
    return patientOk && policyOk;
  });

  const activeClaimCount = visibleClaims.filter((claim) => {
    const status = String(claim?.status || "").toLowerCase();
    return status === "submitted" || status === "under_review";
  }).length;

  return (
    <ModulePageShell
      title="Insurance"
      description="Manage hospital policies and insurance claims. Patient-specific insurance records are available in the secondary section below."
      feedback={feedback}
      className="mx-auto w-full max-w-[1500px]"
    >
      <div className="grid gap-6 xl:grid-cols-12">
        <SectionCard className="xl:col-span-5" title="Hospital Policy" description="Create the master insurance plans your hospital works with.">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => submit(event, "/api/insurance/policies", policyForm, "Insurance policy saved successfully.", () => setPolicyForm({ provider_name: "", policy_name: "", policy_number: "", coverage_details: "" }))}>
            <TextField label="Provider Name" name="provider_name" value={policyForm.provider_name} onChange={handleChange(setPolicyForm)} required />
            <TextField label="Policy Name" name="policy_name" value={policyForm.policy_name} onChange={handleChange(setPolicyForm)} required />
            <TextField label="Policy Number" name="policy_number" value={policyForm.policy_number} onChange={handleChange(setPolicyForm)} />
            <TextField label="Coverage Details" name="coverage_details" value={policyForm.coverage_details} onChange={handleChange(setPolicyForm)} />
            <div className="md:col-span-2">
              <SubmitButton busy={busy}>Save Policy</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard className="xl:col-span-7" title="Insurance Overview" description="A quick snapshot of the policies, claims, and patient-linked enrollments in this hospital.">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 p-5">
              <div className="text-sm font-semibold text-sky-700">Hospital Policies</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{policies.length}</div>
              <div className="mt-1 text-sm text-slate-600">Available plans for claims and registrations</div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-5">
              <div className="text-sm font-semibold text-amber-700">Open Claims</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{activeClaimCount}</div>
              <div className="mt-1 text-sm text-slate-600">Submitted or under-review claims awaiting action</div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-5">
              <div className="text-sm font-semibold text-emerald-700">Patient Enrollments</div>
              <div className="mt-2 text-3xl font-extrabold text-slate-900">{details.length}</div>
              <div className="mt-1 text-sm text-slate-600">Patient-specific insurance records saved by admin</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="xl:col-span-7" title="Claims" description="Review submitted claims and update their processing status.">
          <DataTable
            columns={[
              { key: "patient_id", label: "Patient", render: (row) => patientNameById.get(String(row?.patient_id ?? "")) || row?.patient_id || "--" },
              { key: "policy_id", label: "Policy", render: (row) => policyNameById.get(String(row?.policy_id ?? "")) || row?.policy_id || "--" },
              { key: "invoice_id", label: "Invoice", render: (row) => formatInvoice(row?.invoice_id) },
              { key: "amount", label: "Amount", render: (row) => formatAmount(row?.amount) },
              {
                key: "attachment_url",
                label: "Document",
                render: (row) =>
                  getClaimDocumentUrl(row) ? (
                    <a href={backendUrl(getClaimDocumentUrl(row))} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100">
                      View File
                    </a>
                  ) : (
                    "--"
                  ),
              },
              {
                key: "status",
                label: "Status",
                render: (row) => (
                  <select
                    className="min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={row?.status || "submitted"}
                    disabled={claimStatusBusyId === row?.id}
                    onChange={(event) => updateClaimStatus(row?.id, event.target.value)}
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                ),
              },
              { key: "notes", label: "Notes", render: (row) => row?.notes || "--" },
            ]}
            rows={visibleClaims}
            emptyMessage="No valid claims found."
          />
        </SectionCard>

        <SectionCard className="xl:col-span-5" title="Hospital Policies" description="Reference list of the insurance plans available for claims and enrollments.">
          <DataTable columns={[{ key: "provider_name", label: "Provider" }, { key: "policy_name", label: "Policy Name" }, { key: "policy_number", label: "Policy Number" }, { key: "coverage_details", label: "Coverage", render: (row) => row?.coverage_details || "--" }]} rows={policies} />
        </SectionCard>

        <SectionCard className="xl:col-span-12" title="Patient Insurance Details" description="Use this only when you need to register patient-specific enrollment details beyond the master policy list.">
          <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={(event) => submit(event, "/api/insurance/details", detailForm, "Patient insurance details saved successfully.", () => setDetailForm({ patient_id: "", policy_id: "", provider_name: "", policy_number: "", plan_name: "", coverage_details: "", valid_till: "", status: "active", notes: "" }))}>
            <SelectField label="Patient" name="patient_id" value={detailForm.patient_id} onChange={handleDetailChange} options={patientOptions} required placeholder="Select a patient" />
            <SelectField label="Policy" name="policy_id" value={detailForm.policy_id} onChange={handleDetailChange} options={policyOptions} placeholder="Select a policy" />
            <TextField label="Provider Name" name="provider_name" value={detailForm.provider_name} onChange={handleDetailChange} required />
            <TextField label="Policy Number" name="policy_number" value={detailForm.policy_number} onChange={handleDetailChange} required />
            <TextField label="Plan Name" name="plan_name" value={detailForm.plan_name} onChange={handleDetailChange} />
            <TextField label="Coverage" name="coverage_details" value={detailForm.coverage_details} onChange={handleDetailChange} />
            <TextField label="Valid Till" name="valid_till" value={detailForm.valid_till} onChange={handleDetailChange} type="date" />
            <SelectField
              label="Status"
              name="status"
              value={detailForm.status}
              onChange={handleDetailChange}
              options={[
                { value: "active", label: "Active" },
                { value: "expired", label: "Expired" },
                { value: "inactive", label: "Inactive" },
              ]}
              placeholder="Select status"
            />
            <TextField label="Notes" name="notes" value={detailForm.notes} onChange={handleDetailChange} />
            <div className="md:col-span-2 xl:col-span-4 flex justify-start">
              <SubmitButton busy={busy}>Save Details</SubmitButton>
            </div>
          </form>
        </SectionCard>

        <SectionCard className="xl:col-span-12" title="Patient Insurance Register" description="Patient-specific policy mappings saved by the admin team.">
          <DataTable columns={[{ key: "patient_id", label: "Patient", render: (row) => patientNameById.get(String(row?.patient_id ?? "")) || row?.patient_id || "--" }, { key: "policy_id", label: "Policy", render: (row) => policyNameById.get(String(row?.policy_id ?? "")) || formatPolicyLabel(row) }, { key: "provider_name", label: "Provider" }, { key: "policy_number", label: "Policy Number" }, { key: "plan_name", label: "Plan" }, { key: "valid_till", label: "Valid Till", render: (row) => formatDate(row?.valid_till) }, { key: "status", label: "Status", render: (row) => renderStatusBadge(row?.status) }]} rows={details} />
        </SectionCard>
      </div>
    </ModulePageShell>
  );
}
