import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const indexDir = path.join(root, "indexes");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

function writeJson(relPath, value) {
  fs.writeFileSync(path.join(root, relPath), renderJson(value));
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

function uniqSorted(values) {
  return [...new Set(values)].sort();
}

function normalizeId(id) {
  return id.toLowerCase().replace(/[._/-]/g, " ");
}

function tokenizeText(text) {
  const lower = String(text ?? "").toLowerCase();
  const latin = lower.match(/[a-z0-9]+/g) ?? [];
  const cjk = [];
  for (const phrase of lower.match(/[\u4e00-\u9fff]{2,}/g) ?? []) {
    const chars = Array.from(phrase);
    cjk.push(phrase);
    for (let size = 2; size <= Math.min(4, chars.length); size += 1) {
      for (let i = 0; i <= chars.length - size; i += 1) {
        cjk.push(chars.slice(i, i + size).join(""));
      }
    }
  }
  return uniqSorted([...latin, ...cjk].filter((token) => token.length > 1));
}

function searchableText(value) {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(searchableText).join(" ");
  if (typeof value === "object") return Object.values(value).map(searchableText).join(" ");
  return String(value);
}

function parseInlineIds(line) {
  return (line ?? "")
    .split(":")
    .slice(1)
    .join(":")
    .split(",")
    .map((item) => item.trim().replace(/^`|`$/g, ""))
    .filter(Boolean);
}

function docSummaryCard(file) {
  const text = fs.readFileSync(path.join(root, file.path), "utf8");
  const lines = text.split(/\r?\n/);
  const h1 = lines.find((line) => line.startsWith("# "))?.replace(/^#\s+/, "") ?? file.id;
  const machineSummaryZh = lines.find((line) => line.startsWith("machine_summary_zh:")) ?? "";
  const machineSummaryEn = lines.find((line) => line.startsWith("machine_summary_en:")) ?? "";
  const referenceIds = lines.find((line) => line.startsWith("reference_ids:")) ?? "";
  const nodeIds = lines.find((line) => line.startsWith("node_ids:")) ?? "";
  return {
    path: file.path,
    title: h1,
    summary_zh: machineSummaryZh.replace(/^machine_summary_zh:\s*/, ""),
    summary_en: machineSummaryEn.replace(/^machine_summary_en:\s*/, ""),
    node_ids: parseInlineIds(nodeIds),
    reference_ids: parseInlineIds(referenceIds)
  };
}

function addToken(index, token, kind, id) {
  if (!Object.prototype.hasOwnProperty.call(index, token)) {
    index[token] = { docs: [], nodes: [], assets: [], references: [] };
  }
  index[token][kind].push(id);
}

function searchKindForFile(file) {
  if (file.kind === "long_doc") return "docs";
  if (file.kind === "reference_file") return "references";
  if (["node_file", "edge_file"].includes(file.kind)) return null;
  return "assets";
}

fs.mkdirSync(indexDir, { recursive: true });

const publicIndex = readJson("INDEX.json");
const files = publicIndex.files ?? [];
const nodes = walk("knowledge_graph/nodes", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).nodes ?? []);
const edges = walk("knowledge_graph/edges", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).edges ?? []);
const references = walk("references", (rel) => rel.endsWith(".json"))
  .flatMap((rel) => readJson(rel).references ?? []);
const docCards = Object.fromEntries(files
  .filter((file) => file.kind === "long_doc")
  .map((file) => [file.id, docSummaryCard(file)])
  .sort(([a], [b]) => a.localeCompare(b)));

const tokenIndex = {};

for (const file of files) {
  const kind = searchKindForFile(file);
  if (!kind) continue;
  const extraText = file.kind === "long_doc" ? searchableText(docCards[file.id]) : "";
  const tokens = tokenizeText(`${normalizeId(file.id)} ${file.path} ${(file.tags ?? []).join(" ")} ${extraText}`);
  for (const token of tokens) addToken(tokenIndex, token, kind, file.id);
}

for (const node of nodes) {
  const tokens = tokenizeText(`${normalizeId(node.id)} ${searchableText(node)}`);
  for (const token of tokens) addToken(tokenIndex, token, "nodes", node.id);
}

for (const ref of references) {
  const tokens = tokenizeText(`${normalizeId(ref.id)} ${searchableText(ref)}`);
  for (const token of tokens) addToken(tokenIndex, token, "references", ref.id);
}

for (const entry of Object.values(tokenIndex)) {
  entry.docs = uniqSorted(entry.docs);
  entry.nodes = uniqSorted(entry.nodes);
  entry.assets = uniqSorted(entry.assets);
  entry.references = uniqSorted(entry.references);
}

const nodeById = new Map(nodes.map((node) => [node.id, node]));
const adjacency = {};
for (const node of nodes) {
  adjacency[node.id] = {
    type: node.type,
    tags: node.tags ?? [],
    docs: node.doc_ids ?? [],
    references: node.reference_ids ?? [],
    parents: [],
    children: [],
    incoming_edges: [],
    outgoing_edges: [],
    neighbors: []
  };
}

for (const node of nodes) {
  for (const parentId of node.parent_ids ?? []) {
    if (!nodeById.has(parentId)) continue;
    adjacency[node.id].parents.push(parentId);
    adjacency[node.id].neighbors.push(parentId);
    adjacency[parentId].children.push(node.id);
    adjacency[parentId].neighbors.push(node.id);
  }
  for (const childId of node.child_ids ?? []) {
    if (!nodeById.has(childId)) continue;
    adjacency[node.id].children.push(childId);
    adjacency[node.id].neighbors.push(childId);
    adjacency[childId].parents.push(node.id);
    adjacency[childId].neighbors.push(node.id);
  }
}

for (const edge of edges) {
  if (!adjacency[edge.source_id] || !adjacency[edge.target_id]) continue;
  const summary = { id: edge.id, type: edge.type, node_id: edge.target_id };
  adjacency[edge.source_id].outgoing_edges.push(summary);
  adjacency[edge.source_id].neighbors.push(edge.target_id);
  adjacency[edge.target_id].incoming_edges.push({ id: edge.id, type: edge.type, node_id: edge.source_id });
  adjacency[edge.target_id].neighbors.push(edge.source_id);
}

for (const entry of Object.values(adjacency)) {
  entry.parents = uniqSorted(entry.parents);
  entry.children = uniqSorted(entry.children);
  entry.neighbors = uniqSorted(entry.neighbors);
  entry.incoming_edges.sort((a, b) => a.id.localeCompare(b.id));
  entry.outgoing_edges.sort((a, b) => a.id.localeCompare(b.id));
}

const routeMap = {
  schema_version: "1.0.0",
  generated_from: ["INDEX.json", "testing/query_effectiveness_cases.json"],
  goals: Object.fromEntries((publicIndex.coverage ?? []).map((goal) => [
    goal.goal_id,
    {
      title_zh: goal.title_zh,
      docs: goal.primary_docs ?? [],
      nodes: goal.primary_nodes ?? []
    }
  ])),
  query_cases: Object.fromEntries((readJson("testing/query_effectiveness_cases.json").cases ?? []).map((testCase) => [
    testCase.id,
    {
      requirement: testCase.requirement,
      docs: testCase.expected_doc_ids ?? [],
      nodes: testCase.expected_node_ids ?? [],
      assets: testCase.expected_asset_ids ?? []
    }
  ]))
};

const summaryCards = {
  schema_version: "1.0.0",
  generated_from: ["INDEX.json", "docs/**/*.md", "knowledge_graph/nodes/*.json"],
  docs: docCards,
  nodes: Object.fromEntries(nodes.map((node) => [
    node.id,
    {
      type: node.type,
      tier: node.tier,
      title_zh: node.title_zh,
      title_en: node.title_en,
      summary_zh: node.summary_zh,
      summary_en: node.summary_en,
      tags: node.tags ?? [],
      doc_ids: node.doc_ids ?? [],
      reference_ids: node.reference_ids ?? []
    }
  ]).sort(([a], [b]) => a.localeCompare(b))),
  coverage: Object.fromEntries((publicIndex.coverage ?? []).map((goal) => [
    goal.goal_id,
    {
      title_zh: goal.title_zh,
      docs: goal.primary_docs ?? [],
      nodes: goal.primary_nodes ?? []
    }
  ]))
};

const outputs = {
  "indexes/search_index.json": {
    schema_version: "1.0.0",
    generated_from: ["INDEX.json", "knowledge_graph/nodes/*.json", "references/*.json", "testing/search_aliases.json"],
    token_count: Object.keys(tokenIndex).length,
    token_index: Object.fromEntries(Object.entries(tokenIndex).sort(([a], [b]) => a.localeCompare(b)))
  },
  "indexes/graph_adjacency.json": {
    schema_version: "1.0.0",
    generated_from: ["knowledge_graph/nodes/*.json", "knowledge_graph/edges/*.json"],
    node_count: nodes.length,
    edge_count: edges.length,
    adjacency: Object.fromEntries(Object.entries(adjacency).sort(([a], [b]) => a.localeCompare(b)))
  },
  "indexes/route_map.json": routeMap,
  "indexes/summary_cards.json": summaryCards
};

if (process.argv.includes("--check")) {
  const stale = [];
  for (const [relPath, value] of Object.entries(outputs)) {
    const expected = renderJson(value);
    const actualPath = path.join(root, relPath);
    const actual = fs.existsSync(actualPath) ? fs.readFileSync(actualPath, "utf8") : null;
    if (actual !== expected) stale.push(relPath);
  }
  if (stale.length > 0) {
    console.error(`Generated index files are stale: ${stale.join(", ")}`);
    process.exit(1);
  }
  console.log("Generated indexes are fresh.");
} else {
  for (const [relPath, value] of Object.entries(outputs)) writeJson(relPath, value);
  console.log("Built indexes/search_index.json, indexes/graph_adjacency.json, indexes/route_map.json, indexes/summary_cards.json");
}
