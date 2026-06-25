import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const errors = [];

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function readJson(relPath) {
  return JSON.parse(read(relPath));
}

function walk(dirRel, predicate = () => true) {
  const dir = path.join(root, dirRel);
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

function assertMax(label, value, max) {
  if (value > max) errors.push(`${label} exceeds budget: ${value} > ${max}`);
}

const rules = readJson("testing/context_budget_rules.json").rules;

assertMax("AGENT_INDEX.md chars", read("AGENT_INDEX.md").length, rules.agent_index_max_chars);
assertMax("README.md chars", read("README.md").length, rules.readme_max_chars);

for (const relPath of walk("knowledge_graph/nodes", (p) => p.endsWith(".json"))) {
  for (const node of readJson(relPath).nodes ?? []) {
    assertMax(`${node.id} summary_zh chars`, (node.summary_zh ?? "").length, rules.node_summary_zh_max_chars);
    assertMax(`${node.id} summary_en chars`, (node.summary_en ?? "").length, rules.node_summary_en_max_chars);
  }
}

for (const testCase of readJson("testing/query_effectiveness_cases.json").cases ?? []) {
  assertMax(`${testCase.id} requirement chars`, testCase.requirement.length, rules.query_requirement_max_chars);
  const totalExpectedIds = [
    ...(testCase.expected_doc_ids ?? []),
    ...(testCase.expected_node_ids ?? []),
    ...(testCase.expected_asset_ids ?? [])
  ].length;
  assertMax(
    `${testCase.id} expected id count`,
    totalExpectedIds,
    testCase.max_expected_total_ids ?? rules.query_expected_total_ids_max
  );
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Context budget check passed.");
