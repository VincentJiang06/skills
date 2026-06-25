import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const kbRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function usage() {
  console.error(`Usage:
  node tools/scaffold_agent_principle.mjs init --target <dir> [--name <name>] [--force]
  node tools/scaffold_agent_principle.mjs plan "<query>" [--limit N] [--json]
  node tools/scaffold_agent_principle.mjs query "<query>" [--limit N] [--json]
  node tools/scaffold_agent_principle.mjs audit`);
  process.exit(2);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--target") out.target = argv[++i];
    else if (arg === "--name") out.name = argv[++i];
    else if (arg === "--limit") out.limit = Number(argv[++i]);
    else if (arg === "--force") out.force = true;
    else if (arg === "--json") out.json = true;
    else out._.push(arg);
  }
  return out;
}

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeFileSafe(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Refusing to overwrite existing file: ${filePath}. Use --force to replace it.`);
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function runQuery(query, limit = 12) {
  return JSON.parse(execFileSync(process.execPath, [
    path.join(kbRoot, "tools/query_kb.mjs"),
    query,
    "--json",
    "--limit",
    String(limit)
  ], { encoding: "utf8" }));
}

function printPlan(result) {
  console.log(`# Principle Load Plan`);
  console.log(`Query: ${result.query}`);
  console.log("");
  console.log("## Load First");
  for (const doc of result.expand.docs.slice(0, 6)) {
    console.log(`- ${doc.id}: ${doc.path}`);
    if (doc.summary_zh) console.log(`  ${doc.summary_zh}`);
  }
  console.log("");
  console.log("## Assets");
  for (const asset of result.expand.assets.slice(0, 8)) {
    console.log(`- ${asset.id}: ${asset.path}`);
  }
  console.log("");
  console.log("## Nodes");
  for (const nodeId of result.expand.nodes.slice(0, 10)) console.log(`- ${nodeId}`);
  console.log("");
  console.log("## Top Matches");
  for (const match of result.matches.slice(0, 8)) {
    const pathText = match.path ? ` -> ${match.path}` : "";
    console.log(`- [${match.kind}] ${match.id} (${match.score})${pathText}`);
  }
}

function agentMd(projectName, relKbRoot) {
  return `# AGENT.md

This project uses skill-principle as its local engineering scaffold for industrial agent skill work.

## Principle Commands

\`\`\`bash
node .agent-principle/principle.mjs plan "design release gate for this skill"
node .agent-principle/principle.mjs query "TDD eval case trajectory assertions" --json
node .agent-principle/principle.mjs audit
\`\`\`

## Loading Protocol

1. Start with \`.agent-principle/principle.mjs plan "<task>"\`.
2. Read returned summaries before opening long docs.
3. Load only returned docs/assets unless doing a full audit.
4. Use checklist/template assets from the plan as execution artifacts.
5. Run \`audit\` before treating principle indexes as reliable.

## Local Binding

- Project: ${projectName}
- Principle KB: ${relKbRoot}
- Config: \`.agent-principle/config.json\`
`;
}

function generatedCli() {
  return `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const config = JSON.parse(fs.readFileSync(path.join(here, "config.json"), "utf8"));
const kbRoot = path.resolve(here, config.kb_root);

function usage() {
  console.error("Usage: principle.mjs <plan|query|audit> [query] [--limit N] [--json]");
  process.exit(2);
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--limit") out.limit = Number(argv[++i]);
    else if (arg === "--json") out.json = true;
    else out._.push(arg);
  }
  return out;
}

function runQuery(query, limit = 12) {
  return JSON.parse(execFileSync(process.execPath, [
    path.join(kbRoot, "tools/query_kb.mjs"),
    query,
    "--json",
    "--limit",
    String(limit)
  ], { encoding: "utf8" }));
}

function printPlan(result) {
  console.log("# Principle Load Plan");
  console.log(\`Query: \${result.query}\`);
  console.log("");
  console.log("## Load First");
  for (const doc of result.expand.docs.slice(0, 6)) {
    console.log(\`- \${doc.id}: \${doc.path}\`);
    if (doc.summary_zh) console.log(\`  \${doc.summary_zh}\`);
  }
  console.log("");
  console.log("## Assets");
  for (const asset of result.expand.assets.slice(0, 8)) console.log(\`- \${asset.id}: \${asset.path}\`);
  console.log("");
  console.log("## Nodes");
  for (const nodeId of result.expand.nodes.slice(0, 10)) console.log(\`- \${nodeId}\`);
  console.log("");
  console.log("## Top Matches");
  for (const match of result.matches.slice(0, 8)) {
    const pathText = match.path ? \` -> \${match.path}\` : "";
    console.log(\`- [\${match.kind}] \${match.id} (\${match.score})\${pathText}\`);
  }
}

const args = parseArgs(process.argv.slice(2));
const command = args._.shift();
if (!command) usage();

if (command === "audit") {
  execFileSync(process.execPath, [path.join(kbRoot, "tools/run_all_checks.mjs")], { stdio: "inherit" });
} else if (command === "query" || command === "plan") {
  const query = args._.join(" ");
  if (!query) usage();
  const result = runQuery(query, args.limit ?? config.default_limit ?? 12);
  if (command === "query" || args.json) console.log(JSON.stringify(result, null, 2));
  else printPlan(result);
} else {
  usage();
}
`;
}

function initScaffold(args) {
  if (!args.target) usage();
  const target = path.resolve(args.target);
  const name = args.name ?? path.basename(target);
  const supportDir = path.join(target, ".agent-principle");
  const boundKbRoot = fs.realpathSync(kbRoot);
  const config = {
    schema_version: "1.0.0",
    scaffold_id: "agent_principle.local",
    project_name: name,
    kb_root: boundKbRoot,
    default_limit: 12,
    commands: {
      plan: "node .agent-principle/principle.mjs plan \"<task>\"",
      query: "node .agent-principle/principle.mjs query \"<task>\" --json",
      audit: "node .agent-principle/principle.mjs audit"
    }
  };

  fs.mkdirSync(target, { recursive: true });
  writeFileSafe(path.join(target, "AGENT.md"), agentMd(name, boundKbRoot), args.force);
  writeFileSafe(path.join(supportDir, "config.json"), renderJson(config), args.force);
  writeFileSafe(path.join(supportDir, "principle.mjs"), generatedCli(), args.force);
  fs.chmodSync(path.join(supportDir, "principle.mjs"), 0o755);

  console.log(`Created principle scaffold in ${target}`);
  console.log(`- ${path.join(target, "AGENT.md")}`);
  console.log(`- ${path.join(supportDir, "config.json")}`);
  console.log(`- ${path.join(supportDir, "principle.mjs")}`);
}

const args = parseArgs(process.argv.slice(2));
const command = args._.shift();
if (!command) usage();

if (command === "init") initScaffold(args);
else if (command === "audit") execFileSync(process.execPath, [path.join(kbRoot, "tools/run_all_checks.mjs")], { stdio: "inherit" });
else if (command === "query" || command === "plan") {
  const query = args._.join(" ");
  if (!query) usage();
  const result = runQuery(query, args.limit ?? 12);
  if (command === "query" || args.json) console.log(JSON.stringify(result, null, 2));
  else printPlan(result);
} else usage();
