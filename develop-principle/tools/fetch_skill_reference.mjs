import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Fetch a specific skill from a registered public repo into a cache OUTSIDE the
// knowledge base, so an agent can read it as a learning reference. Downloaded
// files must never land inside develop-principle/ (that would break the KB file
// manifest check). Default cache: <cwd>/.skill-reference-cache.

const kbRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function readRegistry() {
  return JSON.parse(fs.readFileSync(path.join(kbRoot, "references/skill_repos.registry.json"), "utf8"));
}

function usage() {
  console.error(`Usage:
  node tools/fetch_skill_reference.mjs --list
  node tools/fetch_skill_reference.mjs <repo.id> <skill-path> [--out <dir>] [--ref <branch>]

Examples:
  node tools/fetch_skill_reference.mjs --list
  node tools/fetch_skill_reference.mjs repo.anthropics_skills skills/skill-creator
  node tools/fetch_skill_reference.mjs repo.addyosmani_agent-skills skills/test-driven-development --out /tmp/ref

Downloads into <out>/<repo.id>/<skill-path> (default out: <cwd>/.skill-reference-cache).
Learn the content and organization — an industrial skill must consider more
structure (controls, tests, metrics, lifecycle, evidence base). See
docs/research/skill_reference_library.md.`);
  process.exit(2);
}

function ghJson(apiPath) {
  const out = execFileSync("gh", ["api", apiPath], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return JSON.parse(out);
}

async function download(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function fetchPath(repo, branch, repoPath, destRoot) {
  const api = `repos/${repo}/contents/${repoPath}?ref=${encodeURIComponent(branch)}`;
  let entry;
  try {
    entry = ghJson(api);
  } catch (error) {
    throw new Error(`gh api failed for ${repo}/${repoPath}@${branch}: ${error.message}`);
  }
  if (Array.isArray(entry)) {
    let count = 0;
    for (const child of entry) {
      if (child.type === "dir") count += await fetchPath(repo, branch, child.path, destRoot);
      else if (child.type === "file") count += await fetchFile(child, destRoot);
    }
    return count;
  }
  return fetchFile(entry, destRoot);
}

async function fetchFile(entry, destRoot) {
  const dest = path.join(destRoot, entry.path);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let buffer;
  if (entry.content && entry.encoding === "base64") {
    buffer = Buffer.from(entry.content, "base64");
  } else if (entry.download_url) {
    buffer = await download(entry.download_url);
  } else {
    throw new Error(`no content for ${entry.path}`);
  }
  fs.writeFileSync(dest, buffer);
  console.log(`  ${entry.path} (${buffer.length} bytes)`);
  return 1;
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") out.list = true;
    else if (arg === "--out") out.out = argv[++i];
    else if (arg === "--ref") out.ref = argv[++i];
    else out._.push(arg);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const registry = readRegistry();

if (args.list) {
  console.log(`# ${registry.repos.length} registered skill repos (stars approximate; see stars_note)`);
  for (const r of [...registry.repos].sort((a, b) => (b.approx_stars ?? 0) - (a.approx_stars ?? 0))) {
    console.log(`- ${r.id}  (~${r.approx_stars ?? "?"} stars, ${r.category}, ${r.license ?? "?"})  ${r.url}`);
    if (r.example_skill_paths?.length) console.log(`    e.g. ${r.example_skill_paths.join(", ")}`);
  }
  process.exit(0);
}

const repoId = args._[0];
const skillPath = args._[1];
if (!repoId || !skillPath) usage();

const repo = registry.repos.find((r) => r.id === repoId);
if (!repo) {
  console.error(`Unknown repo id: ${repoId}. Run --list to see registered repos.`);
  process.exit(2);
}

const outBase = path.resolve(args.out ?? path.join(process.cwd(), ".skill-reference-cache"));
if (outBase === kbRoot || outBase.startsWith(`${kbRoot}${path.sep}`)) {
  console.error(`Refusing to write inside the knowledge base: ${outBase}. Choose an --out outside ${kbRoot}.`);
  process.exit(2);
}

const branch = args.ref ?? repo.default_branch ?? "main";
const destRoot = path.join(outBase, repo.id);

console.log(`Fetching ${repo.repo}@${branch}:${skillPath} -> ${destRoot}`);
const count = await fetchPath(repo.repo, branch, skillPath, destRoot);
console.log(`Done: ${count} file(s). Learning reference only — not part of the KB.`);
