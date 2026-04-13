import db from "@/lib/db";
import { getTableColumns } from "@/lib/authTables";

const pickFirst = (columns, candidates) =>
  candidates.find((candidate) => columns?.has(candidate)) || null;

export async function getPolicies() {
  const cols = await getTableColumns("insurance_policies");
  if (!cols) return [];

  const idCol = pickFirst(cols, ["id"]);
  const providerCol = pickFirst(cols, ["provider_name", "provider"]);
  const policyNameCol = pickFirst(cols, ["policy_name", "plan_name", "name"]);
  const policyNumberCol = pickFirst(cols, ["policy_number"]);
  const coverageCol = pickFirst(cols, ["coverage_details", "coverage"]);
  const activeCol = pickFirst(cols, ["is_active", "status"]);
  const createdAtCol = pickFirst(cols, ["created_at"]);

  const select = [
    idCol ? `\`${idCol}\` AS id` : "NULL AS id",
    providerCol ? `\`${providerCol}\` AS provider_name` : "NULL AS provider_name",
    policyNameCol ? `\`${policyNameCol}\` AS policy_name` : "NULL AS policy_name",
    policyNumberCol ? `\`${policyNumberCol}\` AS policy_number` : "NULL AS policy_number",
    coverageCol ? `\`${coverageCol}\` AS coverage_details` : "NULL AS coverage_details",
    activeCol ? `\`${activeCol}\` AS is_active` : "NULL AS is_active",
  ];

  const [rows] = await db.query(
    `
      SELECT ${select.join(", ")}
      FROM insurance_policies
      ORDER BY ${createdAtCol ? `\`${createdAtCol}\` DESC, ` : ""}${idCol ? `\`${idCol}\`` : "1"} DESC
    `
  );

  return rows;
}

export async function createPolicy({
  provider,
  provider_name,
  policy_name,
  plan_name,
  policy_number,
  coverage,
  coverage_details,
  is_active,
}) {
  const cols = await getTableColumns("insurance_policies");
  if (!cols) {
    throw new Error("insurance_policies table not found.");
  }

  const resolvedProvider = String(provider_name || provider || "").trim();
  const resolvedPolicyName = String(policy_name || plan_name || "").trim();
  const resolvedPolicyNumber = String(policy_number || "").trim();
  const resolvedCoverageDetails = String(coverage_details || coverage || "").trim();

  if (!resolvedProvider || !resolvedPolicyName) {
    throw new Error("provider_name and policy_name are required.");
  }

  const values = {};
  if (cols.has("provider_name")) values.provider_name = resolvedProvider;
  else if (cols.has("provider")) values.provider = resolvedProvider;

  if (cols.has("policy_name")) values.policy_name = resolvedPolicyName;
  else if (cols.has("plan_name")) values.plan_name = resolvedPolicyName;
  else if (cols.has("name")) values.name = resolvedPolicyName;

  if (cols.has("policy_number")) values.policy_number = resolvedPolicyNumber || null;
  if (cols.has("coverage_details")) values.coverage_details = resolvedCoverageDetails || null;
  else if (cols.has("coverage")) values.coverage = resolvedCoverageDetails || null;

  if (cols.has("is_active")) values.is_active = is_active !== false;
  if (cols.has("created_at")) values.created_at = new Date();
  if (cols.has("updated_at")) values.updated_at = new Date();

  const insertCols = Object.keys(values);
  if (!insertCols.length) {
    throw new Error("insurance_policies has no compatible columns.");
  }

  const [result] = await db.query(
    `INSERT INTO insurance_policies (${insertCols.map((col) => `\`${col}\``).join(", ")})
     VALUES (${insertCols.map(() => "?").join(", ")})`,
    insertCols.map((col) => values[col])
  );

  return {
    id: result.insertId,
    provider_name: resolvedProvider,
    policy_name: resolvedPolicyName,
    policy_number: resolvedPolicyNumber || null,
    coverage_details: resolvedCoverageDetails || null,
    is_active: is_active !== false,
  };
}

export { createInsuranceDetail, getInsuranceDetails, createClaim, getClaims } from "@/lib/insuranceData";
