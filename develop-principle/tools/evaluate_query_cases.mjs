import fs from "node:fs";
import path from "node:path";

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

const aliases = {
  "触发": ["trigger", "activation", "routing"],
  "误触发": ["false", "positive", "adjacent", "activation"],
  "漏触发": ["false", "negative", "activation"],
  "边界": ["boundary", "control", "scope"],
  "权限": ["allowed", "forbidden", "permission", "control"],
  "安全": ["security", "safety", "guardrail", "control"],
  "上下文": ["context", "tokens", "loading"],
  "低上下文": ["context", "short", "node", "budget"],
  "短入口": ["agent", "index", "entrypoint", "short"],
  "文档库": ["knowledge", "base", "kb", "documentation"],
  "知识图谱": ["knowledge", "graph", "node", "edge"],
  "测试": ["test", "testing", "eval"],
  "评估": ["eval", "evaluation", "metric"],
  "指标": ["metric", "metrics", "quantitative"],
  "成本": ["cost", "tokens", "latency"],
  "稳定": ["reliability", "stability", "pass"],
  "回归": ["regression", "suite"],
  "发布": ["release", "gate"],
  "回滚": ["rollback", "recovery"],
  "弃用": ["deprecation", "sunset", "migration"],
  "注册表": ["registry", "distribution", "metadata"],
  "版本": ["version", "versioning", "semver"],
  "观测": ["observability", "trace", "span"],
  "轨迹": ["trajectory", "trace", "tool", "call"],
  "工具": ["tool", "tools"],
  "模板": ["template"],
  "清单": ["checklist"],
  "契约": ["contract", "schema"],
  "变异": ["mutation"],
  "蜕变": ["metamorphic"],
  "验收": ["acceptance", "verifier"],
  "失败": ["failure", "red", "regression"],
  "设计": ["design", "architecture"],
  "生命周期": ["lifecycle", "release", "deprecation", "rollback"],
  "工业级": ["industrial", "release", "metrics", "testing", "design"],
  "审查": ["review", "checklist"]
};

function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = new Set(lower.match(/[a-z0-9]+/g) ?? []);
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

  const matchedAssetIds = new Set(topIds(assets, queryTokens, 12));

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
}

if (failures.length > 0) {
  console.error(JSON.stringify({ passed: false, failures, reports }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  passed: true,
  cases: cases.length,
  checked: {
    docs: true,
    nodes: true,
    assets: true
  }
}, null, 2));
