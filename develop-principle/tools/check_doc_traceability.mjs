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

function extractBacktickedIds(content, label) {
  const line = content.split(/\r?\n/).find((entry) => entry.startsWith(label));
  if (!line) return [];
  return [...line.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

const index = readJson("INDEX.json");
const rules = readJson("testing/doc_traceability_rules.json").rules;

const knownReferenceIds = new Set();
for (const relPath of walk("references", (p) => p.endsWith(".json"))) {
  for (const ref of readJson(relPath).references ?? []) knownReferenceIds.add(ref.id);
}

const knownNodeIds = new Set();
for (const relPath of walk("knowledge_graph/nodes", (p) => p.endsWith(".json"))) {
  for (const node of readJson(relPath).nodes ?? []) knownNodeIds.add(node.id);
}

for (const file of index.files.filter((entry) => entry.kind === "long_doc")) {
  const content = read(file.path);
  for (const header of rules.required_headers) {
    if (!content.includes(header)) errors.push(`${file.id} missing header ${header}`);
  }

  if (rules.require_all_reference_ids_resolve) {
    for (const id of extractBacktickedIds(content, "reference_ids:")) {
      if (!knownReferenceIds.has(id)) errors.push(`${file.id} references missing source ${id}`);
    }
  }

  if (rules.require_all_node_ids_resolve) {
    for (const id of extractBacktickedIds(content, "node_ids:")) {
      if (!knownNodeIds.has(id)) errors.push(`${file.id} references missing node ${id}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("Document traceability check passed.");

