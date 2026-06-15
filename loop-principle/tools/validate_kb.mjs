import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const errors = [];

const NODE_FIELDS = [
  "id", "type", "tier", "title_zh", "title_en", "summary_zh", "summary_en",
  "tags", "parent_ids", "child_ids", "doc_ids", "reference_ids"
];
const REFERENCE_FIELDS = [
  "id", "tier", "title_en", "title_zh", "authors_or_org", "source_type",
  "url", "summary_zh", "summary_en", "reuse_notes", "reliability_notes"
];
const METRIC_FIELDS = [
  "id", "group", "title_zh", "title_en", "definition_zh", "definition_en",
  "formula", "inputs", "interpretation", "failure_modes", "reference_ids"
];
const CHECKLIST_FIELDS = ["schema_version", "checklist_id", "title_zh", "title_en", "items", "reference_ids"];
const CHECKLIST_ITEM_FIELDS = ["id", "required", "check_zh", "check_en", "question_zh", "question_en"];
const TEMPLATE_CONTRACT_SET_FIELDS = ["schema_version", "contract_set_id", "purpose", "contracts"];
const TEMPLATE_CONTRACT_FIELDS = [
  "template_id", "required_paths", "array_paths", "reference_id_paths",
  "metric_id_paths", "file_id_paths", "enum_paths"
];
const TEMPLATE_ENUM_CONTRACT_FIELDS = ["path", "values"];
const QUALITY_REPORT_FIELDS = ["schema_version", "report_id", "generated_from", "counts", "distributions", "graph", "coverage", "quality_gates"];
const QUALITY_REPORT_COUNT_FIELDS = [
  "indexed_files", "coverage_goals", "long_docs", "json_template_files", "nodes",
  "edges", "references", "metrics", "template_contracts", "search_tokens",
  "route_goals", "route_query_cases", "compact_query_limit", "compact_query_cases",
  "summary_doc_cards", "summary_node_cards"
];
const QUALITY_REPORT_DISTRIBUTION_FIELDS = ["file_kinds", "node_types", "reference_tiers"];
const QUALITY_REPORT_GRAPH_FIELDS = ["connected_component_sizes", "adjacency_nodes", "adjacency_edges"];
const QUALITY_REPORT_COVERAGE_FIELDS = [
  "long_docs_referenced_by_nodes", "long_docs_without_node_reference",
  "references_used_by_nodes", "references_used_outside_reference_db",
  "references_total", "references_without_external_use"
];
const QUALITY_REPORT_GATE_FIELDS = [
  "gate_set_id", "verdict", "required_gate_count", "passed_required_gate_count",
  "failed_required_gate_ids", "all_required_passed", "results"
];
const QUALITY_REPORT_GATE_RESULT_FIELDS = ["id", "required", "passed", "metric_path", "actual", "expected"];
const QUALITY_GATE_FIELDS = ["id", "metric_path", "operator", "required"];
const QUERY_CASE_FIELDS = [
  "id", "requirement", "max_expected_total_ids", "generated_limit",
  "expected_doc_ids", "expected_node_ids", "expected_asset_ids"
];
const NODE_TYPES = new Set([
  "pillar", "concept", "principle", "procedure", "technique", "metric",
  "pattern", "anti_pattern", "template", "checklist", "reference"
]);
const QUALITY_GATE_OPERATORS = new Set([
  "equals", "equals_path", "greater_or_equal", "length_equals", "single_component_equals_path"
]);
const INDEX_FILE_FIELDS = ["id", "path", "kind", "tags"];
// loop-principle uses a richer typed-edge vocabulary than develop-principle.
const EDGE_TYPES = new Set([
  "contains", "contradicts", "contextualizes", "decomposes_to", "defines",
  "depends_on", "enables", "extends", "generalizes", "measures", "mitigates",
  "motivates", "supports", "uses", "warns"
]);

function readJson(relPath) {
  const fullPath = path.join(root, relPath);
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (error) {
    errors.push(`Invalid JSON: ${relPath}: ${error.message}`);
    return null;
  }
}

function walk(dirRel, predicate = () => true) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".DS_Store") continue;
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

function assertExactFields(kind, id, value, fields) {
  for (const field of fields) {
    if (!(field in value)) errors.push(`${kind} ${id} missing required field: ${field}`);
  }
  for (const field of Object.keys(value)) {
    if (!fields.includes(field)) errors.push(`${kind} ${id} has unknown field: ${field}`);
  }
}

function assertUniqueArray(kind, id, field, value) {
  if (!Array.isArray(value)) {
    errors.push(`${kind} ${id} field ${field} must be an array`);
    return;
  }
  const seen = new Set();
  for (const item of value) {
    if (seen.has(item)) errors.push(`${kind} ${id} field ${field} has duplicate value: ${item}`);
    seen.add(item);
  }
}

function assertNonEmptyString(kind, id, field, value) {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${kind} ${id} field ${field} must be a non-empty string`);
  }
}

function getByPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}

function sumObjectValues(value) {
  return Object.values(value ?? {}).reduce((total, item) => total + item, 0);
}

const index = readJson("INDEX.json");
const knownFileIds = new Set();
const indexedPaths = new Set();
const knownRefIds = new Set();
const knownNodeIds = new Set();

for (const rel of walk(".", (p) => p.endsWith(".json"))) {
  readJson(rel.replace(/^\.\//, ""));
}

for (const rel of walk("schemas", (p) => p.endsWith(".json"))) {
  const schema = readJson(rel);
  for (const field of ["$schema", "$id", "title", "type"]) {
    if (!(field in (schema ?? {}))) errors.push(`Schema ${rel} missing required field: ${field}`);
  }
  if (schema?.additionalProperties !== false) {
    errors.push(`Schema ${rel} must set additionalProperties to false at the top level`);
  }
}

for (const file of index?.files ?? []) {
  for (const field of Object.keys(file)) {
    if (!INDEX_FILE_FIELDS.includes(field)) errors.push(`INDEX file entry ${file.id} has unknown field: ${field}`);
  }
  for (const field of ["id", "path", "kind"]) {
    if (!(field in file)) errors.push(`INDEX file entry missing required field ${field}: ${file.id ?? file.path ?? "(unknown)"}`);
  }
  if ("tags" in file) assertUniqueArray("INDEX file entry", file.id, "tags", file.tags);
  if (knownFileIds.has(file.id)) errors.push(`Duplicate file id in INDEX.json: ${file.id}`);
  knownFileIds.add(file.id);
  if (indexedPaths.has(file.path)) errors.push(`Duplicate file path in INDEX.json: ${file.path}`);
  indexedPaths.add(file.path);
  if (!fs.existsSync(path.join(root, file.path))) {
    errors.push(`Indexed path does not exist: ${file.path}`);
  }
}

for (const rel of walk(".", (p) => {
  const normalized = p.replace(/^\.\//, "");
  return !["README.md", "AGENT_INDEX.md", "INDEX.json"].includes(normalized);
})) {
  const normalized = rel.replace(/^\.\//, "");
  if (!indexedPaths.has(normalized)) {
    errors.push(`File missing from INDEX.json: ${normalized}`);
  }
}

for (const rel of walk("references", (p) => p.endsWith(".json"))) {
  const data = readJson(rel);
  for (const ref of data?.references ?? []) {
    assertExactFields("reference", ref.id, ref, REFERENCE_FIELDS);
    if (knownRefIds.has(ref.id)) errors.push(`Duplicate reference id: ${ref.id}`);
    knownRefIds.add(ref.id);
    if (!/^ref\.[a-z0-9_\.]+$/.test(ref.id)) errors.push(`Invalid reference id: ${ref.id}`);
    if (![1, 2, 3, 4].includes(ref.tier)) errors.push(`Invalid reference tier for ${ref.id}: ${ref.tier}`);
    assertUniqueArray("reference", ref.id, "reuse_notes", ref.reuse_notes);
  }
}

const allNodes = [];
for (const rel of walk("knowledge_graph/nodes", (p) => p.endsWith(".json"))) {
  const data = readJson(rel);
  for (const node of data?.nodes ?? []) {
    allNodes.push({ ...node, __file: rel });
    assertExactFields("node", node.id, node, NODE_FIELDS);
    if (knownNodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    knownNodeIds.add(node.id);
    if (!/^[a-z_]+\.[a-z0-9_\.]+$/.test(node.id)) errors.push(`Invalid node id: ${node.id}`);
    if (!NODE_TYPES.has(node.type)) errors.push(`Invalid node type for ${node.id}: ${node.type}`);
    if (![1, 2, 3, 4].includes(node.tier)) errors.push(`Invalid node tier for ${node.id}: ${node.tier}`);
    if ((node.summary_zh ?? "").length > 220) errors.push(`summary_zh too long: ${node.id}`);
    if ((node.summary_en ?? "").length > 420) errors.push(`summary_en too long: ${node.id}`);
    for (const field of ["tags", "parent_ids", "child_ids", "doc_ids", "reference_ids"]) {
      assertUniqueArray("node", node.id, field, node[field]);
    }
  }
}

for (const coverage of index?.coverage ?? []) {
  for (const docId of coverage.primary_docs ?? []) {
    if (!knownFileIds.has(docId)) errors.push(`Coverage goal ${coverage.goal_id} references missing doc/file id: ${docId}`);
  }
  for (const nodeId of coverage.primary_nodes ?? []) {
    if (!knownNodeIds.has(nodeId)) errors.push(`Coverage goal ${coverage.goal_id} references missing node id: ${nodeId}`);
  }
}

for (const node of allNodes) {
  for (const id of node.parent_ids ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Missing parent node ${id} referenced by ${node.id}`);
    else {
      const parent = allNodes.find((candidate) => candidate.id === id);
      if (!parent?.child_ids?.includes(node.id)) {
        errors.push(`Parent/child mismatch: ${node.id} lists parent ${id}, but parent does not list child ${node.id}`);
      }
    }
  }
  for (const id of node.child_ids ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Missing child node ${id} referenced by ${node.id}`);
    else {
      const child = allNodes.find((candidate) => candidate.id === id);
      if (!child?.parent_ids?.includes(node.id)) {
        errors.push(`Parent/child mismatch: ${node.id} lists child ${id}, but child does not list parent ${node.id}`);
      }
    }
  }
  for (const id of node.doc_ids ?? []) {
    if (!knownFileIds.has(id)) errors.push(`Missing doc/file id ${id} referenced by ${node.id}`);
  }
  for (const id of node.reference_ids ?? []) {
    if (!knownRefIds.has(id)) errors.push(`Missing reference id ${id} referenced by ${node.id}`);
  }
}

const globalEdgeIds = new Set();
for (const rel of walk("knowledge_graph/edges", (p) => p.endsWith(".json"))) {
  const data = readJson(rel);
  const edgeIds = new Set();
  for (const edge of data?.edges ?? []) {
    for (const field of ["id", "source_id", "target_id", "type"]) {
      if (!(field in edge)) errors.push(`Edge in ${rel} missing required field: ${field}`);
    }
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id in ${rel}: ${edge.id}`);
    edgeIds.add(edge.id);
    if (globalEdgeIds.has(edge.id)) errors.push(`Duplicate edge id across edge files: ${edge.id}`);
    globalEdgeIds.add(edge.id);
    if (!EDGE_TYPES.has(edge.type)) errors.push(`Invalid edge type ${edge.type} in ${edge.id}`);
    if (!knownNodeIds.has(edge.source_id)) errors.push(`Missing edge source ${edge.source_id} in ${edge.id}`);
    if (!knownNodeIds.has(edge.target_id)) errors.push(`Missing edge target ${edge.target_id} in ${edge.id}`);
  }
}

const metricCatalog = readJson("metrics/metric_catalog.json");
const searchAliases = readJson("testing/search_aliases.json");
const qualityGateSet = readJson("testing/kb_quality_gates.json");
const querySuite = readJson("testing/query_effectiveness_cases.json");
const contextBudgetRules = readJson("testing/context_budget_rules.json");
const docTraceabilityRules = readJson("testing/doc_traceability_rules.json");
const templateContracts = readJson("testing/template_contracts.json");
const metricIds = new Set();
for (const metric of metricCatalog?.metrics ?? []) {
  assertExactFields("metric", metric.id, metric, METRIC_FIELDS);
  if (metricIds.has(metric.id)) errors.push(`Duplicate metric id: ${metric.id}`);
  metricIds.add(metric.id);
  if (!/^metric\.[a-z0-9_\.]+$/.test(metric.id)) errors.push(`Invalid metric id: ${metric.id}`);
  for (const field of ["inputs", "failure_modes", "reference_ids"]) {
    assertUniqueArray("metric", metric.id, field, metric[field]);
  }
  for (const field of ["title_zh", "title_en", "definition_zh", "definition_en", "formula", "interpretation"]) {
    assertNonEmptyString("metric", metric.id, field, metric[field]);
  }
  for (const refId of metric.reference_ids ?? []) {
    if (!knownRefIds.has(refId)) errors.push(`Missing reference id ${refId} referenced by metric ${metric.id}`);
  }
}

const metricNodeIds = new Set(allNodes.filter((node) => node.type === "metric").map((node) => node.id));
for (const id of metricNodeIds) {
  if (!metricIds.has(id)) errors.push(`Metric node missing from metrics/metric_catalog.json: ${id}`);
}
for (const id of metricIds) {
  if (!metricNodeIds.has(id)) errors.push(`Metric catalog entry has no graph node: ${id}`);
}

assertExactFields("template contract set", templateContracts?.contract_set_id ?? "unknown", templateContracts ?? {}, TEMPLATE_CONTRACT_SET_FIELDS);
if (templateContracts?.schema_version !== "1.0.0") errors.push("template_contracts schema_version must be 1.0.0");
if (templateContracts?.contract_set_id !== "testing.template_contracts") errors.push("template_contracts contract_set_id mismatch");

const templateFiles = index?.files?.filter((entry) => entry.kind === "template_file") ?? [];
const jsonTemplateFiles = templateFiles.filter((entry) => entry.path.endsWith(".json"));
const templateContractsById = new Map();
for (const contract of templateContracts?.contracts ?? []) {
  assertExactFields("template contract", contract.template_id ?? "unknown", contract, TEMPLATE_CONTRACT_FIELDS);
  if (templateContractsById.has(contract.template_id)) errors.push(`Duplicate template contract: ${contract.template_id}`);
  templateContractsById.set(contract.template_id, contract);
  if (!knownFileIds.has(contract.template_id)) errors.push(`Template contract references missing template id: ${contract.template_id}`);
  for (const field of ["required_paths", "array_paths", "reference_id_paths", "metric_id_paths", "file_id_paths"]) {
    assertUniqueArray("template contract", contract.template_id ?? "unknown", field, contract[field]);
  }
  if (!Array.isArray(contract.enum_paths)) {
    errors.push(`template contract ${contract.template_id} enum_paths must be an array`);
  }
  const enumPathIds = new Set();
  for (const enumPath of contract.enum_paths ?? []) {
    assertExactFields("template enum contract", `${contract.template_id}:${enumPath.path}`, enumPath, TEMPLATE_ENUM_CONTRACT_FIELDS);
    if (enumPathIds.has(enumPath.path)) errors.push(`template contract ${contract.template_id} has duplicate enum path: ${enumPath.path}`);
    enumPathIds.add(enumPath.path);
    assertUniqueArray("template enum contract", `${contract.template_id}:${enumPath.path}`, "values", enumPath.values);
  }
}
for (const file of jsonTemplateFiles) {
  if (!templateContractsById.has(file.id)) errors.push(`Missing template contract for JSON template: ${file.id}`);
}

for (const file of templateFiles) {
  const fullPath = path.join(root, file.path);
  if (file.path.endsWith(".json")) {
    const template = readJson(file.path);
    if (template?.schema_version !== "1.0.0") errors.push(`Template ${file.id} schema_version must be 1.0.0`);
    if (template?.template_id !== file.id) errors.push(`Template ${file.id} template_id must match INDEX id`);
    const contract = templateContractsById.get(file.id);
    for (const requiredPath of contract?.required_paths ?? []) {
      if (getByPath(template, requiredPath) === undefined) {
        errors.push(`Template ${file.id} missing contract path: ${requiredPath}`);
      }
    }
    for (const arrayPath of contract?.array_paths ?? []) {
      if (!Array.isArray(getByPath(template, arrayPath))) {
        errors.push(`Template ${file.id} contract path must be array: ${arrayPath}`);
      }
    }
    for (const refPath of contract?.reference_id_paths ?? []) {
      const values = getByPath(template, refPath);
      if (!Array.isArray(values)) {
        errors.push(`Template ${file.id} reference path must be array: ${refPath}`);
        continue;
      }
      for (const refId of values) {
        if (refId.length > 0 && !knownRefIds.has(refId)) {
          errors.push(`Template ${file.id} references missing reference id ${refId} at ${refPath}`);
        }
      }
    }
    for (const metricPath of contract?.metric_id_paths ?? []) {
      const values = getByPath(template, metricPath);
      if (!Array.isArray(values)) {
        errors.push(`Template ${file.id} metric path must be array: ${metricPath}`);
        continue;
      }
      for (const metricId of values) {
        if (!metricIds.has(metricId)) {
          errors.push(`Template ${file.id} references missing metric id ${metricId} at ${metricPath}`);
        }
      }
    }
    for (const filePath of contract?.file_id_paths ?? []) {
      const values = getByPath(template, filePath);
      if (!Array.isArray(values)) {
        errors.push(`Template ${file.id} file-id path must be array: ${filePath}`);
        continue;
      }
      for (const fileId of values) {
        if (fileId.length > 0 && !knownFileIds.has(fileId)) {
          errors.push(`Template ${file.id} references missing file id ${fileId} at ${filePath}`);
        }
      }
    }
    for (const enumPath of contract?.enum_paths ?? []) {
      const value = getByPath(template, enumPath.path);
      if (!enumPath.values.includes(value)) {
        errors.push(`Template ${file.id} enum path ${enumPath.path} has unexpected value: ${value}`);
      }
    }
  } else if (file.path.endsWith(".md")) {
    const text = fs.readFileSync(fullPath, "utf8");
    if (!text.startsWith("# ")) errors.push(`Markdown template ${file.id} must start with an H1 title`);
  }
}

for (const file of index?.files?.filter((entry) => entry.kind === "checklist_file") ?? []) {
  const checklist = readJson(file.path);
  for (const field of Object.keys(checklist ?? {})) {
    if (!CHECKLIST_FIELDS.includes(field)) errors.push(`Checklist ${file.id} has unknown field: ${field}`);
  }
  for (const field of ["schema_version", "checklist_id", "title_zh", "title_en", "items"]) {
    if (!(field in (checklist ?? {}))) errors.push(`Checklist ${file.id} missing required field: ${field}`);
  }
  if (checklist?.schema_version !== "1.0.0") errors.push(`Checklist ${file.id} schema_version must be 1.0.0`);
  if (checklist?.checklist_id !== file.id) errors.push(`Checklist ${file.id} checklist_id must match INDEX id`);
  assertUniqueArray("checklist", file.id, "reference_ids", checklist?.reference_ids ?? []);
  if (!Array.isArray(checklist?.items) || checklist.items.length === 0) {
    errors.push(`Checklist ${file.id} must contain at least one item`);
  }
  const itemIds = new Set();
  for (const item of checklist?.items ?? []) {
    for (const field of Object.keys(item)) {
      if (!CHECKLIST_ITEM_FIELDS.includes(field)) errors.push(`Checklist ${file.id} item ${item.id} has unknown field: ${field}`);
    }
    if (itemIds.has(item.id)) errors.push(`Checklist ${file.id} has duplicate item id: ${item.id}`);
    itemIds.add(item.id);
    if (typeof item.required !== "boolean") errors.push(`Checklist ${file.id} item ${item.id} required must be boolean`);
    const hasZh = typeof item.check_zh === "string" || typeof item.question_zh === "string";
    const hasEn = typeof item.check_en === "string" || typeof item.question_en === "string";
    if (!hasZh || !hasEn) errors.push(`Checklist ${file.id} item ${item.id} must include zh and en text`);
  }
}

if (searchAliases?.schema_version !== "1.0.0") errors.push("search_aliases schema_version must be 1.0.0");
if (searchAliases?.alias_set_id !== "retrieval.search_aliases") errors.push("search_aliases alias_set_id mismatch");
for (const [term, expansions] of Object.entries(searchAliases?.aliases ?? {})) {
  if (term.length === 0) errors.push("search_aliases contains an empty alias term");
  assertUniqueArray("search_alias", term, "expansions", expansions);
  for (const expansion of expansions ?? []) {
    if (typeof expansion !== "string" || expansion.length === 0) {
      errors.push(`search_alias ${term} contains an invalid expansion`);
    }
  }
}

if (qualityGateSet?.schema_version !== "1.0.0") errors.push("kb_quality_gates schema_version must be 1.0.0");
if (qualityGateSet?.gate_set_id !== "quality.loop_principle") errors.push("kb_quality_gates gate_set_id mismatch");
const qualityGateIds = new Set();
for (const gate of qualityGateSet?.gates ?? []) {
  for (const field of QUALITY_GATE_FIELDS) {
    if (!(field in gate)) errors.push(`quality gate missing required field ${field}: ${gate.id ?? "(missing id)"}`);
  }
  for (const field of Object.keys(gate)) {
    if (![...QUALITY_GATE_FIELDS, "expected", "expected_path"].includes(field)) {
      errors.push(`quality gate ${gate.id} has unknown field: ${field}`);
    }
  }
  if (qualityGateIds.has(gate.id)) errors.push(`Duplicate quality gate id: ${gate.id}`);
  qualityGateIds.add(gate.id);
  if (!QUALITY_GATE_OPERATORS.has(gate.operator)) errors.push(`Invalid quality gate operator for ${gate.id}: ${gate.operator}`);
  if (!("expected" in gate) && !("expected_path" in gate)) errors.push(`quality gate ${gate.id} must define expected or expected_path`);
  if ("expected" in gate && "expected_path" in gate) errors.push(`quality gate ${gate.id} cannot define both expected and expected_path`);
  if (typeof gate.required !== "boolean") errors.push(`quality gate ${gate.id} required must be boolean`);
}

if (querySuite?.schema_version !== "1.0.0") errors.push("query_effectiveness_cases schema_version must be 1.0.0");
if (querySuite?.suite_id !== "query_effectiveness.loop_engineering_requirements") errors.push("query_effectiveness_cases suite_id mismatch");
const queryCaseIds = new Set();
for (const testCase of querySuite?.cases ?? []) {
  for (const field of Object.keys(testCase)) {
    if (!QUERY_CASE_FIELDS.includes(field)) errors.push(`query case ${testCase.id} has unknown field: ${field}`);
  }
  for (const field of ["id", "requirement", "expected_doc_ids", "expected_node_ids", "expected_asset_ids"]) {
    if (!(field in testCase)) errors.push(`query case missing required field ${field}: ${testCase.id ?? "(missing id)"}`);
  }
  if (queryCaseIds.has(testCase.id)) errors.push(`Duplicate query case id: ${testCase.id}`);
  queryCaseIds.add(testCase.id);
  if (typeof testCase.requirement !== "string" || testCase.requirement.length === 0) {
    errors.push(`query case ${testCase.id} requirement must be a non-empty string`);
  }
  for (const field of ["expected_doc_ids", "expected_node_ids", "expected_asset_ids"]) {
    assertUniqueArray("query case", testCase.id, field, testCase[field]);
  }
  for (const docId of testCase.expected_doc_ids ?? []) {
    if (!knownFileIds.has(docId)) errors.push(`query case ${testCase.id} references missing doc/file id: ${docId}`);
  }
  for (const nodeId of testCase.expected_node_ids ?? []) {
    if (!knownNodeIds.has(nodeId)) errors.push(`query case ${testCase.id} references missing node id: ${nodeId}`);
  }
  for (const assetId of testCase.expected_asset_ids ?? []) {
    if (!knownFileIds.has(assetId)) errors.push(`query case ${testCase.id} references missing asset/file id: ${assetId}`);
  }
}

if (contextBudgetRules?.schema_version !== "1.0.0") errors.push("context_budget_rules schema_version must be 1.0.0");
for (const field of [
  "agent_index_max_chars",
  "readme_max_chars",
  "node_summary_zh_max_chars",
  "node_summary_en_max_chars",
  "query_requirement_max_chars",
  "query_expected_total_ids_max",
  "query_generated_limit"
]) {
  const value = contextBudgetRules?.rules?.[field];
  if (!Number.isInteger(value) || value <= 0) errors.push(`context_budget_rules ${field} must be a positive integer`);
}

if (docTraceabilityRules?.schema_version !== "1.0.0") errors.push("doc_traceability_rules schema_version must be 1.0.0");
assertUniqueArray("doc_traceability_rules", docTraceabilityRules?.suite_id ?? "unknown", "required_headers", docTraceabilityRules?.rules?.required_headers);
for (const field of ["require_all_reference_ids_resolve", "require_all_node_ids_resolve"]) {
  if (typeof docTraceabilityRules?.rules?.[field] !== "boolean") {
    errors.push(`doc_traceability_rules ${field} must be boolean`);
  }
}

const externallyUsedRefIds = new Set();
for (const rel of walk(".", (p) => [".json", ".md", ".mjs"].includes(path.extname(p)))) {
  const normalized = rel.replace(/^\.\//, "");
  if (normalized.startsWith("references/") || normalized.startsWith("indexes/") || normalized.startsWith("reports/")) continue;
  const text = fs.readFileSync(path.join(root, normalized), "utf8");
  for (const refId of knownRefIds) {
    if (text.includes(refId)) externallyUsedRefIds.add(refId);
  }
}
for (const refId of knownRefIds) {
  if (!externallyUsedRefIds.has(refId)) {
    errors.push(`Reference is not used outside references/: ${refId}`);
  }
}

const searchIndex = readJson("indexes/search_index.json");
const graphAdjacency = readJson("indexes/graph_adjacency.json");
const routeMap = readJson("indexes/route_map.json");
const summaryCards = readJson("indexes/summary_cards.json");
const qualityReport = readJson("reports/kb_quality_report.json");

if (searchIndex?.schema_version !== "1.0.0") errors.push("Search index schema_version must be 1.0.0");
if (graphAdjacency?.schema_version !== "1.0.0") errors.push("Graph adjacency schema_version must be 1.0.0");
if (routeMap?.schema_version !== "1.0.0") errors.push("Route map schema_version must be 1.0.0");
if (summaryCards?.schema_version !== "1.0.0") errors.push("Summary cards schema_version must be 1.0.0");
if (searchIndex?.token_count !== Object.keys(searchIndex?.token_index ?? {}).length) {
  errors.push("Search index token_count does not match token_index size");
}
if (graphAdjacency?.node_count !== allNodes.length) {
  errors.push(`Graph adjacency node_count mismatch: ${graphAdjacency?.node_count} != ${allNodes.length}`);
}
const edgeCount = walk("knowledge_graph/edges", (p) => p.endsWith(".json"))
  .reduce((total, rel) => total + (readJson(rel)?.edges ?? []).length, 0);
if (graphAdjacency?.edge_count !== edgeCount) {
  errors.push(`Graph adjacency edge_count mismatch: ${graphAdjacency?.edge_count} != ${edgeCount}`);
}
for (const nodeId of knownNodeIds) {
  const entry = graphAdjacency?.adjacency?.[nodeId];
  if (!entry) {
    errors.push(`Graph adjacency missing node: ${nodeId}`);
    continue;
  }
  for (const neighbor of entry.neighbors ?? []) {
    if (!knownNodeIds.has(neighbor)) errors.push(`Graph adjacency ${nodeId} has missing neighbor: ${neighbor}`);
  }
}
for (const [goalId, goal] of Object.entries(routeMap?.goals ?? {})) {
  for (const id of goal.docs ?? []) {
    if (!knownFileIds.has(id)) errors.push(`Route map goal ${goalId} references missing doc/file id: ${id}`);
  }
  for (const id of goal.nodes ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Route map goal ${goalId} references missing node id: ${id}`);
  }
}
for (const [caseId, testCase] of Object.entries(routeMap?.query_cases ?? {})) {
  for (const id of testCase.docs ?? []) {
    if (!knownFileIds.has(id)) errors.push(`Route map case ${caseId} references missing doc/file id: ${id}`);
  }
  for (const id of testCase.nodes ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Route map case ${caseId} references missing node id: ${id}`);
  }
  for (const id of testCase.assets ?? []) {
    if (!knownFileIds.has(id)) errors.push(`Route map case ${caseId} references missing asset/file id: ${id}`);
  }
}

const longDocFiles = index?.files?.filter((file) => file.kind === "long_doc") ?? [];
if (Object.keys(summaryCards?.docs ?? {}).length !== longDocFiles.length) {
  errors.push(`Summary cards doc count mismatch: ${Object.keys(summaryCards?.docs ?? {}).length} != ${longDocFiles.length}`);
}
if (Object.keys(summaryCards?.nodes ?? {}).length !== allNodes.length) {
  errors.push(`Summary cards node count mismatch: ${Object.keys(summaryCards?.nodes ?? {}).length} != ${allNodes.length}`);
}
for (const file of longDocFiles) {
  const card = summaryCards?.docs?.[file.id];
  if (!card) {
    errors.push(`Summary cards missing doc: ${file.id}`);
    continue;
  }
  if (card.path !== file.path) errors.push(`Summary card ${file.id} path mismatch: ${card.path} != ${file.path}`);
  for (const field of ["title", "summary_zh", "summary_en"]) {
    assertNonEmptyString("summary card doc", file.id, field, card[field]);
  }
  assertUniqueArray("summary card doc", file.id, "node_ids", card.node_ids);
  assertUniqueArray("summary card doc", file.id, "reference_ids", card.reference_ids);
  for (const nodeId of card.node_ids ?? []) {
    if (!knownNodeIds.has(nodeId)) errors.push(`Summary card ${file.id} references missing node id: ${nodeId}`);
  }
  for (const refId of card.reference_ids ?? []) {
    if (!knownRefIds.has(refId)) errors.push(`Summary card ${file.id} references missing reference id: ${refId}`);
  }
}
for (const node of allNodes) {
  const card = summaryCards?.nodes?.[node.id];
  if (!card) {
    errors.push(`Summary cards missing node: ${node.id}`);
    continue;
  }
  for (const field of ["type", "tier", "title_zh", "title_en", "summary_zh", "summary_en"]) {
    if (JSON.stringify(card[field]) !== JSON.stringify(node[field])) {
      errors.push(`Summary card node ${node.id} field ${field} does not match source node`);
    }
  }
  for (const field of ["tags", "doc_ids", "reference_ids"]) {
    if (JSON.stringify(card[field]) !== JSON.stringify(node[field])) {
      errors.push(`Summary card node ${node.id} field ${field} does not match source node`);
    }
  }
}
for (const coverage of index?.coverage ?? []) {
  const card = summaryCards?.coverage?.[coverage.goal_id];
  if (!card) errors.push(`Summary cards missing coverage goal: ${coverage.goal_id}`);
}

assertExactFields("quality report", qualityReport?.report_id ?? "unknown", qualityReport ?? {}, QUALITY_REPORT_FIELDS);
assertExactFields("quality report counts", qualityReport?.report_id ?? "unknown", qualityReport?.counts ?? {}, QUALITY_REPORT_COUNT_FIELDS);
assertExactFields("quality report distributions", qualityReport?.report_id ?? "unknown", qualityReport?.distributions ?? {}, QUALITY_REPORT_DISTRIBUTION_FIELDS);
assertExactFields("quality report graph", qualityReport?.report_id ?? "unknown", qualityReport?.graph ?? {}, QUALITY_REPORT_GRAPH_FIELDS);
assertExactFields("quality report coverage", qualityReport?.report_id ?? "unknown", qualityReport?.coverage ?? {}, QUALITY_REPORT_COVERAGE_FIELDS);
assertExactFields("quality report gates", qualityReport?.report_id ?? "unknown", qualityReport?.quality_gates ?? {}, QUALITY_REPORT_GATE_FIELDS);
if (qualityReport?.schema_version !== "1.0.0") errors.push("Quality report schema_version must be 1.0.0");
if (qualityReport?.report_id !== "report.kb_quality") errors.push("Quality report report_id mismatch");
assertUniqueArray("quality report", qualityReport?.report_id ?? "unknown", "generated_from", qualityReport?.generated_from ?? []);
const expectedQualityCounts = {
  indexed_files: index?.files?.length ?? 0,
  coverage_goals: index?.coverage?.length ?? 0,
  long_docs: longDocFiles.length,
  json_template_files: jsonTemplateFiles.length,
  nodes: allNodes.length,
  edges: edgeCount,
  references: knownRefIds.size,
  metrics: metricIds.size,
  template_contracts: templateContracts?.contracts?.length ?? 0,
  search_tokens: searchIndex?.token_count,
  route_goals: Object.keys(routeMap?.goals ?? {}).length,
  route_query_cases: Object.keys(routeMap?.query_cases ?? {}).length,
  compact_query_limit: contextBudgetRules?.rules?.query_generated_limit,
  compact_query_cases: Object.keys(routeMap?.query_cases ?? {}).length,
  summary_doc_cards: Object.keys(summaryCards?.docs ?? {}).length,
  summary_node_cards: Object.keys(summaryCards?.nodes ?? {}).length
};
for (const [field, expected] of Object.entries(expectedQualityCounts)) {
  if (qualityReport?.counts?.[field] !== expected) {
    errors.push(`Quality report count ${field} mismatch: ${qualityReport?.counts?.[field]} != ${expected}`);
  }
}
if (sumObjectValues(qualityReport?.distributions?.file_kinds) !== qualityReport?.counts?.indexed_files) {
  errors.push("Quality report file_kinds distribution does not sum to indexed_files");
}
if (sumObjectValues(qualityReport?.distributions?.node_types) !== qualityReport?.counts?.nodes) {
  errors.push("Quality report node_types distribution does not sum to nodes");
}
if (sumObjectValues(qualityReport?.distributions?.reference_tiers) !== qualityReport?.counts?.references) {
  errors.push("Quality report reference_tiers distribution does not sum to references");
}
if (qualityReport?.graph?.adjacency_nodes !== allNodes.length) errors.push("Quality report adjacency_nodes mismatch");
if (qualityReport?.graph?.adjacency_edges !== edgeCount) errors.push("Quality report adjacency_edges mismatch");
assertUniqueArray("quality report coverage", qualityReport?.report_id ?? "unknown", "long_docs_referenced_by_nodes", qualityReport?.coverage?.long_docs_referenced_by_nodes ?? []);
assertUniqueArray("quality report coverage", qualityReport?.report_id ?? "unknown", "long_docs_without_node_reference", qualityReport?.coverage?.long_docs_without_node_reference ?? []);
assertUniqueArray("quality report coverage", qualityReport?.report_id ?? "unknown", "references_without_external_use", qualityReport?.coverage?.references_without_external_use ?? []);

const gateResultsById = new Map();
for (const result of qualityReport?.quality_gates?.results ?? []) {
  assertExactFields("quality report gate result", result.id ?? "unknown", result, QUALITY_REPORT_GATE_RESULT_FIELDS);
  if (gateResultsById.has(result.id)) errors.push(`Duplicate quality report gate result: ${result.id}`);
  gateResultsById.set(result.id, result);
}
for (const gate of qualityGateSet?.gates ?? []) {
  const result = gateResultsById.get(gate.id);
  if (!result) {
    errors.push(`Quality report missing gate result: ${gate.id}`);
    continue;
  }
  if (result.required !== gate.required) errors.push(`Quality report gate ${gate.id} required flag mismatch`);
  if (result.metric_path !== gate.metric_path) errors.push(`Quality report gate ${gate.id} metric_path mismatch`);
}
const requiredGateResults = [...gateResultsById.values()].filter((gate) => gate.required);
const failedRequiredGateIds = requiredGateResults.filter((gate) => !gate.passed).map((gate) => gate.id).sort();
if (qualityReport?.quality_gates?.required_gate_count !== requiredGateResults.length) {
  errors.push("Quality report required_gate_count mismatch");
}
if (qualityReport?.quality_gates?.passed_required_gate_count !== requiredGateResults.filter((gate) => gate.passed).length) {
  errors.push("Quality report passed_required_gate_count mismatch");
}
if (JSON.stringify(qualityReport?.quality_gates?.failed_required_gate_ids ?? []) !== JSON.stringify(failedRequiredGateIds)) {
  errors.push("Quality report failed_required_gate_ids mismatch");
}
if (qualityReport?.quality_gates?.all_required_passed !== (failedRequiredGateIds.length === 0)) {
  errors.push("Quality report all_required_passed mismatch");
}
if (qualityReport?.quality_gates?.verdict !== "pass") {
  errors.push("Quality report gates must pass.");
}
for (const gate of qualityReport?.quality_gates?.results ?? []) {
  if (gate.required && !gate.passed) errors.push(`Required quality gate failed: ${gate.id}`);
}

try {
  execFileSync(process.execPath, ["tools/build_indexes.mjs", "--check"], { cwd: root, stdio: "ignore" });
} catch (error) {
  errors.push("Generated indexes are stale; run node tools/build_indexes.mjs and commit the result.");
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`KB validation passed: ${allNodes.length} nodes, ${knownRefIds.size} references, ${metricIds.size} metrics.`);
