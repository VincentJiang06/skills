import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const reportPath = "reports/kb_quality_report.json";

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
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

function connectedComponents(nodes, edges) {
  const ids = new Set(nodes.map((node) => node.id));
  const adj = new Map([...ids].map((id) => [id, new Set()]));
  for (const node of nodes) {
    for (const id of [...(node.parent_ids ?? []), ...(node.child_ids ?? [])]) {
      if (!ids.has(id)) continue;
      adj.get(node.id).add(id);
      adj.get(id).add(node.id);
    }
  }
  for (const edge of edges) {
    if (!ids.has(edge.source_id) || !ids.has(edge.target_id)) continue;
    adj.get(edge.source_id).add(edge.target_id);
    adj.get(edge.target_id).add(edge.source_id);
  }
  const seen = new Set();
  const sizes = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    const stack = [id];
    seen.add(id);
    let size = 0;
    while (stack.length) {
      const current = stack.pop();
      size += 1;
      for (const next of adj.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    sizes.push(size);
  }
  return sizes.sort((a, b) => b - a);
}

function getPath(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}

function valuesEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function evaluateGate(report, gate) {
  const actual = getPath(report, gate.metric_path);
  const expected = "expected_path" in gate ? getPath(report, gate.expected_path) : gate.expected;
  let passed = false;
  if (gate.operator === "equals") passed = valuesEqual(actual, expected);
  else if (gate.operator === "equals_path") passed = valuesEqual(actual, expected);
  else if (gate.operator === "length_equals") passed = Array.isArray(actual) && actual.length === expected;
  else if (gate.operator === "greater_or_equal") passed = typeof actual === "number" && actual >= expected;
  else if (gate.operator === "single_component_equals_path") {
    passed = Array.isArray(actual) && actual.length === 1 && actual[0] === expected;
  }
  return {
    id: gate.id,
    required: gate.required,
    passed,
    metric_path: gate.metric_path,
    actual,
    expected
  };
}

const index = readJson("INDEX.json");
const nodes = walk("knowledge_graph/nodes", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).nodes ?? []);
const edges = walk("knowledge_graph/edges", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).edges ?? []);
const references = walk("references", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).references ?? []);
const metrics = readJson("metrics/metric_catalog.json").metrics ?? [];
const searchIndex = readJson("indexes/search_index.json");
const graphAdjacency = readJson("indexes/graph_adjacency.json");
const routeMap = readJson("indexes/route_map.json");
const summaryCards = readJson("indexes/summary_cards.json");
const qualityGates = readJson("testing/kb_quality_gates.json").gates ?? [];
const templateContracts = readJson("testing/template_contracts.json");
const contextBudgetRules = readJson("testing/context_budget_rules.json");

const fileKinds = {};
for (const file of index.files ?? []) fileKinds[file.kind] = (fileKinds[file.kind] ?? 0) + 1;
const nodeTypes = {};
for (const node of nodes) nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
const referenceTiers = {};
for (const ref of references) referenceTiers[`tier_${ref.tier}`] = (referenceTiers[`tier_${ref.tier}`] ?? 0) + 1;

const longDocIds = new Set(index.files.filter((file) => file.kind === "long_doc").map((file) => file.id));
const nodeDocIds = new Set(nodes.flatMap((node) => node.doc_ids ?? []));
const nodeReferenceIds = new Set(nodes.flatMap((node) => node.reference_ids ?? []));
const referenceIds = new Set(references.map((ref) => ref.id));
const referenceIdsUsedOutsideReferenceDb = new Set();
for (const rel of walk(".", (file) => [".json", ".md", ".mjs"].includes(path.extname(file)))) {
  const normalized = rel.replace(/^\.\//, "");
  if (normalized.startsWith("references/") || normalized.startsWith("indexes/") || normalized.startsWith("reports/")) continue;
  const text = fs.readFileSync(path.join(root, normalized), "utf8");
  for (const refId of referenceIds) {
    if (text.includes(refId)) referenceIdsUsedOutsideReferenceDb.add(refId);
  }
}

const report = {
  schema_version: "1.0.0",
  report_id: "report.kb_quality",
  generated_from: [
    "INDEX.json",
    "knowledge_graph/nodes/*.json",
    "knowledge_graph/edges/*.json",
    "references/*.json",
    "metrics/metric_catalog.json",
    "indexes/*.json",
    "testing/kb_quality_gates.json",
    "testing/template_contracts.json"
  ],
  counts: {
    indexed_files: index.files.length,
    coverage_goals: index.coverage.length,
    long_docs: index.files.filter((file) => file.kind === "long_doc").length,
    json_template_files: index.files.filter((file) => file.kind === "template_file" && file.path.endsWith(".json")).length,
    nodes: nodes.length,
    edges: edges.length,
    references: references.length,
    metrics: metrics.length,
    template_contracts: (templateContracts.contracts ?? []).length,
    search_tokens: searchIndex.token_count,
    route_goals: Object.keys(routeMap.goals ?? {}).length,
    route_query_cases: Object.keys(routeMap.query_cases ?? {}).length,
    compact_query_limit: contextBudgetRules.rules?.query_generated_limit,
    compact_query_cases: Object.keys(routeMap.query_cases ?? {}).length,
    summary_doc_cards: Object.keys(summaryCards.docs ?? {}).length,
    summary_node_cards: Object.keys(summaryCards.nodes ?? {}).length
  },
  distributions: {
    file_kinds: Object.fromEntries(Object.entries(fileKinds).sort()),
    node_types: Object.fromEntries(Object.entries(nodeTypes).sort()),
    reference_tiers: Object.fromEntries(Object.entries(referenceTiers).sort())
  },
  graph: {
    connected_component_sizes: connectedComponents(nodes, edges),
    adjacency_nodes: graphAdjacency.node_count,
    adjacency_edges: graphAdjacency.edge_count
  },
  coverage: {
    long_docs_referenced_by_nodes: [...longDocIds].filter((id) => nodeDocIds.has(id)).sort(),
    long_docs_without_node_reference: [...longDocIds].filter((id) => !nodeDocIds.has(id)).sort(),
    references_used_by_nodes: [...referenceIds].filter((id) => nodeReferenceIds.has(id)).length,
    references_used_outside_reference_db: referenceIdsUsedOutsideReferenceDb.size,
    references_total: referenceIds.size,
    references_without_external_use: [...referenceIds].filter((id) => !referenceIdsUsedOutsideReferenceDb.has(id)).sort()
  }
};

const gateResults = qualityGates.map((gate) => evaluateGate(report, gate));
const requiredGateResults = gateResults.filter((gate) => gate.required);
report.quality_gates = {
  gate_set_id: "quality.loop_principle",
  verdict: gateResults.every((gate) => gate.passed || !gate.required) ? "pass" : "fail",
  required_gate_count: requiredGateResults.length,
  passed_required_gate_count: requiredGateResults.filter((gate) => gate.passed).length,
  failed_required_gate_ids: requiredGateResults.filter((gate) => !gate.passed).map((gate) => gate.id).sort(),
  all_required_passed: requiredGateResults.every((gate) => gate.passed),
  results: gateResults
};

if (process.argv.includes("--check")) {
  const expected = renderJson(report);
  const fullPath = path.join(root, reportPath);
  const actual = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, "utf8") : null;
  if (actual !== expected) {
    console.error(`${reportPath} is stale; run node tools/generate_quality_report.mjs`);
    process.exit(1);
  }
  console.log("Quality report is fresh.");
} else {
  fs.mkdirSync(path.join(root, "reports"), { recursive: true });
  fs.writeFileSync(path.join(root, reportPath), renderJson(report));
  console.log(`Generated ${reportPath}`);
}
