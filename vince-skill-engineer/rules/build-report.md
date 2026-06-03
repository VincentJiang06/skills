# The build report (handoff to vince-skill-zipper)

The deliverable of this stage. It must validate against
`assets/build-report.schema.json`. Write it to
`<target>/.skill-engineer/build-report.json`. `vince-skill-zipper` reads it cold
to know what was built and what is safe to compress.

## Field guide

- **target** — `path`, `name` of the built skill.
- **source_spec** — `{path}` of the guidance handoff-spec you built from, or
  `null` if the user supplied the design directly.
- **altitude** — carried from the spec; sizes how much the zipper should expect.
- **built.design_units** — one entry per unit you touched: `unit`, `status`
  (`implemented` / `minimal` / `na`), `files`, optional `note`. This tells the
  zipper which units carry real content vs. stubs.
- **built.files_created / files_modified** — every path you wrote, so the zipper
  knows the surface.
- **tests** — `eval_cases` (`id`, `name`, `passed`, `evidence`), `totals`
  (`passed`/`failed`/`total`), `regression_cases`, and `trajectory_checked`
  (did grading inspect tool calls / loaded files / protocol steps, or only final
  text?). `regression_cases` is `[]` on a first build; on later iterations it
  lists the eval-case **ids** you track as known failures or adjacent
  false-triggers.
- **actions_resolved** — every `prioritized_action` id from the spec with
  `status` (`done` / `deferred` / `blocked`) and a `note`. Every P0 should be
  `done` for a clean handoff; a `blocked` P0 must be explained.
- **verification** — `ran` (did evals actually execute?), `all_required_passed`,
  and `evidence` (pass counts / command output). This is the honesty gate: if
  `ran` is false, the build is not done.
- **handoff** — `next_skill: "vince-skill-zipper"`, `notes` (e.g. "SKILL.md is
  long, candidate for Compress/Encapsulate"; point the zipper at what's verbose),
  `blocking` (anything that must be resolved before shipping).

## Validate before finishing

```bash
node -e "JSON.parse(require('fs').readFileSync('<target>/.skill-engineer/build-report.json','utf8'))"
```
Confirm: it parses, every spec P0 action appears in `actions_resolved`,
`verification.ran` is `true` with real evidence, and `tests.totals` adds up. Then
print a 3-line summary: tests passed/total, P0s done/total, and the handoff note.

## Honesty

Do not report `all_required_passed: true` unless the eval cases actually ran and
passed — the whole pipeline trusts this flag. A built-but-untested skill is a
draft; say so in `verification.evidence` and `handoff.blocking` rather than
inflating the report.
