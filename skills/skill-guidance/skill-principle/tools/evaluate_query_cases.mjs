import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function walk(dirRel, predicate = () => true) {
  const dir = path.join(root, dirRel);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

const aliases = readJson("testing/search_aliases.json").aliases ?? {};

function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.match(/[a-z0-9]+/g) ?? []);
  for (const cjk of lower.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    const chars = Array.from(cjk);
    tokens.add(cjk);
    for (let size = 2; size <= Math.min(4, chars.length); size += 1) {
      for (let i = 0; i <= chars.length - size; i += 1) {
        tokens.add(chars.slice(i, i + size).join(""));
      }
    }
  }
  for (const [term, expanded] of Object.entries(aliases)) {
    if (text.includes(term)) {
      tokens.add(term);
      for (const token of expanded) tokens.add(token);
    }
  }
  return [...tokens].filter((token) => token.length > 1);
}

function searchableText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value);
}

function normalizeId(id) {
  return id.toLowerCase().replace(/[._/-]/g, " ");
}

function score(item, queryTokens) {
  const haystack = `${normalizeId(item.id)} ${searchableText(item)}`.toLowerCase();
  let value = 0;
  for (const token of queryTokens) {
    if (haystack.includes(token)) value += token.length >= 6 ? 3 : 1;
  }
  return value;
}

function topIds(items, queryTokens, limit) {
  return items
    .map((item) => ({ id: item.id, score: score(item, queryTokens), item }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((entry) => entry.id);
}

const index = readJson("INDEX.json");
const cases = readJson("testing/query_effectiveness_cases.json").cases;
const contextRules = readJson("testing/context_budget_rules.json").rules;

const nodeFiles = walk("knowledge_graph/nodes", (p) => p.endsWith(".json"));
const nodes = nodeFiles.flatMap((relPath) => readJson(relPath).nodes ?? []);
const nodeById = new Map(nodes.map((node) => [node.id, node]));

const files = index.files.map((file) => ({
  ...file,
  title_zh: file.id,
  title_en: file.id,
  tags: file.tags ?? [],
  path_terms: file.path
}));

const docs = files.filter((file) => file.kind === "long_doc");
const assets = files.filter((file) => !["long_doc", "node_file", "edge_file", "reference_file"].includes(file.kind));

const failures = [];
const generatedFailures = [];
const compactGeneratedFailures = [];
const reports = [];

for (const testCase of cases) {
  const queryTokens = tokenize(testCase.requirement);
  const matchedNodeIds = new Set(topIds(nodes, queryTokens, 12));

  for (const nodeId of [...matchedNodeIds]) {
    const node = nodeById.get(nodeId);
    for (const parentId of node?.parent_ids ?? []) matchedNodeIds.add(parentId);
    for (const childId of node?.child_ids ?? []) matchedNodeIds.add(childId);
  }

  const matchedDocIds = new Set(topIds(docs, queryTokens, 10));
  for (const nodeId of matchedNodeIds) {
    const node = nodeById.get(nodeId);
    for (const docId of node?.doc_ids ?? []) matchedDocIds.add(docId);
  }

  for (const coverage of index.coverage ?? []) {
    if ((coverage.primary_docs ?? []).some((docId) => matchedDocIds.has(docId))) {
      for (const nodeId of coverage.primary_nodes ?? []) matchedNodeIds.add(nodeId);
    }
  }

  const matchedAssetIds = new Set(topIds(assets, queryTokens, 24));

  const missingDocIds = testCase.expected_doc_ids.filter((id) => !matchedDocIds.has(id));
  const missingNodeIds = testCase.expected_node_ids.filter((id) => !matchedNodeIds.has(id));
  const missingAssetIds = testCase.expected_asset_ids.filter((id) => !matchedAssetIds.has(id));

  reports.push({
    id: testCase.id,
    matched_docs: [...matchedDocIds].filter((id) => testCase.expected_doc_ids.includes(id)),
    matched_nodes: [...matchedNodeIds].filter((id) => testCase.expected_node_ids.includes(id)),
    matched_assets: [...matchedAssetIds].filter((id) => testCase.expected_asset_ids.includes(id))
  });

  if (missingDocIds.length || missingNodeIds.length || missingAssetIds.length) {
    failures.push({
      id: testCase.id,
      missing_doc_ids: missingDocIds,
      missing_node_ids: missingNodeIds,
      missing_asset_ids: missingAssetIds
    });
  }

  const generated = JSON.parse(execFileSync(process.execPath, [
    "tools/query_kb.mjs",
    testCase.requirement,
    "--json",
    "--limit",
    "50"
  ], { cwd: root, encoding: "utf8" }));
  const generatedIds = new Set([
    ...generated.matches.map((entry) => entry.id),
    ...(generated.expand.nodes ?? []),
    ...generated.expand.docs.map((entry) => entry.id),
    ...(generated.expand.assets ?? []).map((entry) => entry.id),
    ...generated.expand.neighbor_nodes
  ]);
  const generatedMissingDocIds = testCase.expected_doc_ids.filter((id) => !generatedIds.has(id));
  const generatedMissingNodeIds = testCase.expected_node_ids.filter((id) => !generatedIds.has(id));
  const generatedMissingAssetIds = testCase.expected_asset_ids.filter((id) => !generatedIds.has(id));
  if (generatedMissingDocIds.length || generatedMissingNodeIds.length || generatedMissingAssetIds.length) {
    generatedFailures.push({
      id: testCase.id,
      missing_doc_ids: generatedMissingDocIds,
      missing_node_ids: generatedMissingNodeIds,
      missing_asset_ids: generatedMissingAssetIds
    });
  }

  const compactLimit = testCase.generated_limit ?? contextRules.query_generated_limit;
  const compactGenerated = JSON.parse(execFileSync(process.execPath, [
    "tools/query_kb.mjs",
    testCase.requirement,
    "--json",
    "--limit",
    String(compactLimit)
  ], { cwd: root, encoding: "utf8" }));
  const compactGeneratedIds = new Set([
    ...compactGenerated.matches.map((entry) => entry.id),
    ...(compactGenerated.expand.nodes ?? []),
    ...compactGenerated.expand.docs.map((entry) => entry.id),
    ...(compactGenerated.expand.assets ?? []).map((entry) => entry.id),
    ...compactGenerated.expand.neighbor_nodes
  ]);
  const compactMissingDocIds = testCase.expected_doc_ids.filter((id) => !compactGeneratedIds.has(id));
  const compactMissingNodeIds = testCase.expected_node_ids.filter((id) => !compactGeneratedIds.has(id));
  const compactMissingAssetIds = testCase.expected_asset_ids.filter((id) => !compactGeneratedIds.has(id));
  if (compactMissingDocIds.length || compactMissingNodeIds.length || compactMissingAssetIds.length) {
    compactGeneratedFailures.push({
      id: testCase.id,
      limit: compactLimit,
      missing_doc_ids: compactMissingDocIds,
      missing_node_ids: compactMissingNodeIds,
      missing_asset_ids: compactMissingAssetIds
    });
  }
}

if (failures.length > 0 || generatedFailures.length > 0 || compactGeneratedFailures.length > 0) {
  console.error(JSON.stringify({ passed: false, failures, generated_failures: generatedFailures, compact_generated_failures: compactGeneratedFailures, reports }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  passed: true,
  cases: cases.length,
  checked: {
    docs: true,
    nodes: true,
    assets: true,
    generated_indexes: true,
    compact_generated_indexes: true
  }
}, null, 2));
