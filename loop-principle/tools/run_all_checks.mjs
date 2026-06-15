import { spawnSync } from "node:child_process";

const commands = [
  ["node", ["tools/build_indexes.mjs", "--check"]],
  ["node", ["tools/generate_quality_report.mjs", "--check"]],
  ["node", ["tools/validate_kb.mjs"]],
  ["node", ["tools/evaluate_query_cases.mjs"]],
  ["node", ["tools/check_context_budget.mjs"]],
  ["node", ["tools/check_doc_traceability.mjs"]]
];

for (const [cmd, args] of commands) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("\nAll loop-principle checks passed.");
