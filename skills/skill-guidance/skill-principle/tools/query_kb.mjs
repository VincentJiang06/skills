import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), "utf8"));
}

const aliases = readJson("testing/search_aliases.json").aliases ?? {};
const ROUTE_STOP_TOKENS = new Set(["skill", "agent", "我要", "这个", "如何", "需要"]);

// Search breadth/depth is agent-controllable. Each mode is a preset of knobs;
// individual flags override the preset. "standard" reproduces the original
// single-route, single-hop, low-context behavior so query fixtures stay stable.
const MODES = {
  focused: {
    limit: 5, routes: 1, hops: 1, maxTier: 2, neighbors: false,
    expandNeighborRefs: false, goalScoreMin: 12, caseScoreMin: 14, caseOverlapMin: 2
  },
  standard: {
    limit: 8, routes: 1, hops: 1, maxTier: 4, neighbors: true,
    expandNeighborRefs: false, goalScoreMin: 10, caseScoreMin: 12, caseOverlapMin: 2
  },
  broad: {
    limit: 20, routes: 3, hops: 2, maxTier: 4, neighbors: true,
    expandNeighborRefs: true, goalScoreMin: 8, caseScoreMin: 10, caseOverlapMin: 2
  },
  exhaustive: {
    limit: 40, routes: 6, hops: 3, maxTier: 4, neighbors: true,
    expandNeighborRefs: true, goalScoreMin: 6, caseScoreMin: 8, caseOverlapMin: 1
  }
};

const KINDS = new Set(["doc", "node", "asset", "reference"]);

function normalizeId(id) {
  return id.toLowerCase().replace(/[._/-]/g, " ");
}

function tokensFor(text) {
  const lower = String(text ?? "").toLowerCase();
  const out = new Set(lower.match(/[a-z0-9]+/g) ?? []);
  for (const cjk of lower.match(/[一-鿿]{2,}/g) ?? []) {
    const chars = Array.from(cjk);
    out.add(cjk);
    for (let size = 2; size <= Math.min(4, chars.length); size += 1) {
      for (let i = 0; i <= chars.length - size; i += 1) {
        out.add(chars.slice(i, i + size).join(""));
      }
    }
  }
  for (const [term, expanded] of Object.entries(aliases)) {
    if (String(text).includes(term)) {
      out.add(term);
      for (const token of expanded) out.add(token);
    }
  }
  return [...out].filter((token) => token.length > 1);
}

function routeTokensFor(text) {
  return tokensFor(text).filter((token) => {
    if (ROUTE_STOP_TOKENS.has(token)) return false;
    if (/^[a-z0-9]+$/.test(token)) return token.length >= 4;
    return token.length >= 3;
  });
}

function routeOverlapScore(queryRouteTokens, routeRouteTokens) {
  const routeSet = new Set(routeRouteTokens);
  const overlap = queryRouteTokens.filter((token) => routeSet.has(token));
  return {
    overlap,
    score: overlap.reduce((total, token) => total + token.length, 0)
  };
}

function bump(scores, kind, id, amount) {
  const key = `${kind}:${id}`;
  const current = scores.get(key) ?? { kind, id, score: 0 };
  current.score += amount;
  scores.set(key, current);
}

function usage() {
  console.error(`Usage: node tools/query_kb.mjs <query> [options]

Breadth / depth knobs (let the agent decide how much to pull):
  --mode <focused|standard|broad|exhaustive>  preset (default: standard)
  --limit <N>            max ranked matches (default per mode)
  --routes <N>           number of goal/case routes to expand (default per mode)
  --hops <N>             graph expansion depth in hops (alias: --depth)
  --max-tier <1..4>      keep only references at/under this tier (alias: --refs tierN|none|all)
  --kinds <a,b,...>      restrict matches to kinds: doc,node,asset,reference
  --neighbors|--no-neighbors   include graph neighbor nodes (default per mode)
  --expand-neighbor-refs       also pull docs/refs from neighbor nodes
  --min-goal-score <N> --min-case-score <N> --min-case-overlap <N>   route thresholds
  --broad | --exhaustive | --focused           shorthand for --mode
  --json                 emit JSON`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

let jsonOutput = false;
let modeName = "standard";
const overrides = {};
const queryParts = [];
function takeNumber(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) usage();
  return n;
}
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === "--json") jsonOutput = true;
  else if (arg === "--mode") modeName = args[++i];
  else if (arg === "--broad") modeName = "broad";
  else if (arg === "--exhaustive") modeName = "exhaustive";
  else if (arg === "--focused") modeName = "focused";
  else if (arg === "--limit") overrides.limit = takeNumber(args[++i]);
  else if (arg === "--routes") overrides.routes = takeNumber(args[++i]);
  else if (arg === "--hops" || arg === "--depth") overrides.hops = takeNumber(args[++i]);
  else if (arg === "--max-tier") overrides.maxTier = takeNumber(args[++i]);
  else if (arg === "--refs") {
    const value = String(args[++i]);
    if (value === "none") overrides.maxTier = 0;
    else if (value === "all") overrides.maxTier = 4;
    else if (/^tier[1-4]$/.test(value)) overrides.maxTier = Number(value.slice(4));
    else usage();
  } else if (arg === "--kinds") overrides.kinds = String(args[++i]).split(",").map((k) => k.trim()).filter(Boolean);
  else if (arg === "--neighbors") overrides.neighbors = true;
  else if (arg === "--no-neighbors") overrides.neighbors = false;
  else if (arg === "--expand-neighbor-refs") overrides.expandNeighborRefs = true;
  else if (arg === "--min-goal-score") overrides.goalScoreMin = takeNumber(args[++i]);
  else if (arg === "--min-case-score") overrides.caseScoreMin = takeNumber(args[++i]);
  else if (arg === "--min-case-overlap") overrides.caseOverlapMin = takeNumber(args[++i]);
  else queryParts.push(arg);
}

if (!MODES[modeName]) usage();
const plan = { mode: modeName, ...MODES[modeName], ...overrides };
if (plan.kinds) {
  for (const kind of plan.kinds) if (!KINDS.has(kind)) usage();
}
if (queryParts.length === 0 || !Number.isFinite(plan.limit) || plan.limit <= 0) usage();
if (!Number.isInteger(plan.routes) || plan.routes < 1) usage();
if (!Number.isInteger(plan.hops) || plan.hops < 1) usage();

const query = queryParts.join(" ");
const index = readJson("INDEX.json");
const searchIndex = readJson("indexes/search_index.json").token_index;
const adjacency = readJson("indexes/graph_adjacency.json").adjacency;
const routeMap = readJson("indexes/route_map.json");
const summaryCards = readJson("indexes/summary_cards.json");
const fileById = new Map(index.files.map((file) => [file.id, file]));

// Reference tier map (only needed when a tier ceiling is active).
const refTierById = new Map();
if (plan.maxTier < 4) {
  const refDir = path.join(root, "references");
  for (const entry of fs.existsSync(refDir) ? fs.readdirSync(refDir) : []) {
    if (!entry.endsWith(".json")) continue;
    const data = JSON.parse(fs.readFileSync(path.join(refDir, entry), "utf8"));
    for (const ref of data.references ?? []) refTierById.set(ref.id, ref.tier);
  }
}
function refAllowed(refId) {
  if (plan.maxTier >= 4) return true;
  if (plan.maxTier <= 0) return false;
  const tier = refTierById.get(refId);
  return tier == null ? true : tier <= plan.maxTier;
}

const scores = new Map();
const queryTokens = tokensFor(query);
const queryRouteTokens = routeTokensFor(query);
const routedDocs = new Set();
const routedNodes = new Set();
const routedAssets = new Set();
const kindFilter = plan.kinds ? new Set(plan.kinds) : null;
function kindEnabled(kind) {
  return !kindFilter || kindFilter.has(kind);
}

for (const token of queryTokens) {
  const entry = searchIndex[token];
  if (!entry) continue;
  if (kindEnabled("doc")) for (const id of entry.docs ?? []) bump(scores, "doc", id, 6);
  if (kindEnabled("node")) for (const id of entry.nodes ?? []) bump(scores, "node", id, 5);
  if (kindEnabled("asset")) for (const id of entry.assets ?? []) bump(scores, "asset", id, 4);
  if (kindEnabled("reference")) for (const id of entry.references ?? []) {
    if (refAllowed(id)) bump(scores, "reference", id, 2);
  }
}

const matchedGoalRoutes = [];
for (const [goalId, route] of Object.entries(routeMap.goals ?? {})) {
  const { score } = routeOverlapScore(queryRouteTokens, routeTokensFor(`${normalizeId(goalId)} ${route.title_zh ?? ""}`));
  if (score < plan.goalScoreMin) continue;
  matchedGoalRoutes.push({ score, goalId, route });
}

for (const { route } of matchedGoalRoutes
  .sort((a, b) => b.score - a.score || a.goalId.localeCompare(b.goalId))
  .slice(0, plan.routes)) {
  for (const id of route.docs ?? []) {
    routedDocs.add(id);
    bump(scores, "doc", id, 8);
  }
  for (const id of route.nodes ?? []) {
    routedNodes.add(id);
    bump(scores, "node", id, 8);
  }
}

const matchedCaseRoutes = [];
for (const [caseId, route] of Object.entries(routeMap.query_cases ?? {})) {
  const { overlap, score } = routeOverlapScore(queryRouteTokens, routeTokensFor(route.requirement ?? ""));
  if (overlap.length < plan.caseOverlapMin || score < plan.caseScoreMin) continue;
  matchedCaseRoutes.push({ score, overlap, caseId, route });
}

for (const { score, overlap, route } of matchedCaseRoutes
  .sort((a, b) => b.score - a.score || b.overlap.length - a.overlap.length || a.caseId.localeCompare(b.caseId))
  .slice(0, plan.routes)) {
  const amount = Math.min(18, Math.max(score, overlap.length * 3));
  for (const id of route.docs ?? []) {
    routedDocs.add(id);
    bump(scores, "doc", id, amount);
  }
  for (const id of route.nodes ?? []) {
    routedNodes.add(id);
    bump(scores, "node", id, amount);
  }
  for (const id of route.assets ?? []) {
    routedAssets.add(id);
    bump(scores, "asset", id, amount);
  }
}

const ranked = [...scores.values()]
  .filter((entry) => kindEnabled(entry.kind))
  .sort((a, b) => b.score - a.score || a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id))
  .slice(0, plan.limit);

const nodeIds = ranked.filter((entry) => entry.kind === "node").map((entry) => entry.id);
const expandedDocs = new Set();
const expandedReferences = new Set();
const neighborNodes = new Set();

// Hop-0 seed nodes always contribute their own docs/references.
const seedNodes = [...new Set([...nodeIds, ...routedNodes])];
for (const nodeId of seedNodes) {
  const node = adjacency[nodeId];
  for (const id of node?.docs ?? []) expandedDocs.add(id);
  for (const id of node?.references ?? []) if (refAllowed(id)) expandedReferences.add(id);
}

// Breadth-first graph walk to `hops` depth. Neighbors are recorded; in broad/
// exhaustive modes their docs/references are pulled in too (expandNeighborRefs).
let frontier = seedNodes;
const visited = new Set(seedNodes);
for (let hop = 0; hop < plan.hops; hop += 1) {
  const next = [];
  for (const nodeId of frontier) {
    for (const neighborId of adjacency[nodeId]?.neighbors ?? []) {
      if (plan.neighbors) neighborNodes.add(neighborId);
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      next.push(neighborId);
      if (plan.expandNeighborRefs) {
        const neighbor = adjacency[neighborId];
        for (const id of neighbor?.docs ?? []) expandedDocs.add(id);
        for (const id of neighbor?.references ?? []) if (refAllowed(id)) expandedReferences.add(id);
      }
    }
  }
  frontier = next;
  if (frontier.length === 0) break;
}

for (const docId of routedDocs) expandedDocs.add(docId);

const result = {
  query,
  search_plan: {
    mode: plan.mode,
    limit: plan.limit,
    routes: plan.routes,
    hops: plan.hops,
    max_tier: plan.maxTier,
    neighbors: plan.neighbors,
    expand_neighbor_refs: plan.expandNeighborRefs,
    kinds: plan.kinds ?? ["doc", "node", "asset", "reference"]
  },
  matches: ranked.map((entry) => ({
    ...entry,
    path: fileById.get(entry.id)?.path ?? null,
    summary_zh: entry.kind === "doc"
      ? summaryCards.docs?.[entry.id]?.summary_zh ?? null
      : summaryCards.nodes?.[entry.id]?.summary_zh ?? null,
    summary_en: entry.kind === "doc"
      ? summaryCards.docs?.[entry.id]?.summary_en ?? null
      : summaryCards.nodes?.[entry.id]?.summary_en ?? null
  })),
  expand: {
    nodes: [...routedNodes].sort(),
    docs: [...expandedDocs].sort().map((id) => ({
      id,
      path: fileById.get(id)?.path ?? null,
      summary_zh: summaryCards.docs?.[id]?.summary_zh ?? null,
      summary_en: summaryCards.docs?.[id]?.summary_en ?? null
    })),
    assets: [...routedAssets].sort().map((id) => ({ id, path: fileById.get(id)?.path ?? null })),
    references: [...expandedReferences].sort(),
    neighbor_nodes: [...neighborNodes].sort()
  }
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`Query: ${query}`);
  console.log(`Mode: ${plan.mode} (limit=${plan.limit} routes=${plan.routes} hops=${plan.hops} max_tier=${plan.maxTier})`);
  console.log("Matches:");
  for (const entry of result.matches) {
    const pathText = entry.path ? ` -> ${entry.path}` : "";
    console.log(`- [${entry.kind}] ${entry.id} (${entry.score})${pathText}`);
  }
  console.log("Expand:");
  console.log(`- nodes: ${result.expand.nodes.join(", ") || "(none)"}`);
  console.log(`- docs: ${result.expand.docs.map((doc) => doc.id).join(", ") || "(none)"}`);
  console.log(`- assets: ${result.expand.assets.map((asset) => asset.id).join(", ") || "(none)"}`);
  console.log(`- references: ${result.expand.references.join(", ") || "(none)"}`);
  console.log(`- neighbor_nodes: ${result.expand.neighbor_nodes.join(", ") || "(none)"}`);
}
