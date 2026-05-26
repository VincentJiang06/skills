import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const errors = [];

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
    const rel = path.join(dirRel, entry.name);
    if (entry.isDirectory()) out.push(...walk(rel, predicate));
    else if (predicate(rel)) out.push(rel);
  }
  return out;
}

const index = readJson("INDEX.json");
const knownDocIds = new Set((index?.files ?? []).map((file) => file.id));
const indexedPaths = new Set((index?.files ?? []).map((file) => file.path));
const knownRefIds = new Set();
const knownNodeIds = new Set();

for (const file of index?.files ?? []) {
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
    if (knownRefIds.has(ref.id)) errors.push(`Duplicate reference id: ${ref.id}`);
    knownRefIds.add(ref.id);
  }
}

const allNodes = [];
for (const rel of walk("knowledge_graph/nodes", (p) => p.endsWith(".json"))) {
  const data = readJson(rel);
  for (const node of data?.nodes ?? []) {
    allNodes.push({ ...node, __file: rel });
    if (knownNodeIds.has(node.id)) errors.push(`Duplicate node id: ${node.id}`);
    knownNodeIds.add(node.id);
    if ((node.summary_zh ?? "").length > 220) errors.push(`summary_zh too long: ${node.id}`);
    if ((node.summary_en ?? "").length > 360) errors.push(`summary_en too long: ${node.id}`);
  }
}

for (const node of allNodes) {
  for (const id of node.parent_ids ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Missing parent node ${id} referenced by ${node.id}`);
  }
  for (const id of node.child_ids ?? []) {
    if (!knownNodeIds.has(id)) errors.push(`Missing child node ${id} referenced by ${node.id}`);
  }
  for (const id of node.doc_ids ?? []) {
    if (!knownDocIds.has(id)) errors.push(`Missing doc id ${id} referenced by ${node.id}`);
  }
  for (const id of node.reference_ids ?? []) {
    if (!knownRefIds.has(id)) errors.push(`Missing reference id ${id} referenced by ${node.id}`);
  }
}

for (const rel of walk("knowledge_graph/edges", (p) => p.endsWith(".json"))) {
  const data = readJson(rel);
  const edgeIds = new Set();
  for (const edge of data?.edges ?? []) {
    if (edgeIds.has(edge.id)) errors.push(`Duplicate edge id in ${rel}: ${edge.id}`);
    edgeIds.add(edge.id);
    if (!knownNodeIds.has(edge.source_id)) errors.push(`Missing edge source ${edge.source_id} in ${edge.id}`);
    if (!knownNodeIds.has(edge.target_id)) errors.push(`Missing edge target ${edge.target_id} in ${edge.id}`);
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`KB validation passed: ${allNodes.length} nodes, ${knownRefIds.size} references.`);
